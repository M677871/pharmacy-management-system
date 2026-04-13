import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import * as request from 'supertest';
import { cleanDatabase, createTestApp } from '../helpers/test-app';
import { DEFAULT_PASSWORD, registerUser, uniqueEmail } from '../helpers/auth.helper';
import { User, UserRole } from '../../src/features/users/entities/user.entity';
import { PresenceService } from '../../src/features/realtime/core/presence.service';
import { OrdersService } from '../../src/features/orders/orders.service';
import { CatalogOrder, OrderStatus } from '../../src/features/orders/entities/catalog-order.entity';
import { DeliveryDriver } from '../../src/features/orders/entities/delivery-driver.entity';
import { Batch } from '../../src/features/inventory/batches/entities/batch.entity';
import { Sale } from '../../src/features/inventory/sales/entities/sale.entity';
import { ChatMessage } from '../../src/features/messaging/entities/chat-message.entity';
import { Notification, NotificationType } from '../../src/features/notifications/entities/notification.entity';

describe('Orders workflow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepo: Repository<User>;
  let orderRepo: Repository<CatalogOrder>;
  let driverRepo: Repository<DeliveryDriver>;
  let batchRepo: Repository<Batch>;
  let saleRepo: Repository<Sale>;
  let chatMessageRepo: Repository<ChatMessage>;
  let notificationRepo: Repository<Notification>;
  let presenceService: PresenceService;
  let ordersService: OrdersService;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    dataSource = ctx.dataSource;
    userRepo = dataSource.getRepository(User);
    orderRepo = dataSource.getRepository(CatalogOrder);
    driverRepo = dataSource.getRepository(DeliveryDriver);
    batchRepo = dataSource.getRepository(Batch);
    saleRepo = dataSource.getRepository(Sale);
    chatMessageRepo = dataSource.getRepository(ChatMessage);
    notificationRepo = dataSource.getRepository(Notification);
    presenceService = ctx.module.get(PresenceService);
    ordersService = ctx.module.get(OrdersService);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  async function registerStaff(role: UserRole = UserRole.EMPLOYEE) {
    const email = uniqueEmail();
    const password = DEFAULT_PASSWORD;

    await registerUser(app, {
      email,
      password,
      firstName: 'Staff',
      lastName: 'User',
    });

    await userRepo.update({ email }, { role });
    const user = await userRepo.findOneByOrFail({ email });
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    return {
      user,
      accessToken: loginRes.body.accessToken as string,
    };
  }

  async function registerCustomer() {
    const registration = await registerUser(app, {
      firstName: 'Client',
      lastName: 'Buyer',
    });
    const user = await userRepo.findOneByOrFail({ id: registration.user.id });

    return {
      user,
      accessToken: registration.accessToken,
    };
  }

  async function createSupplier(accessToken: string) {
    const res = await request(app.getHttpServer())
      .post('/api/inventory/suppliers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Supplier ${Date.now()}` })
      .expect(201);

    return res.body as { id: string };
  }

  async function createProduct(accessToken: string, name = 'Paracetamol') {
    const res = await request(app.getHttpServer())
      .post('/api/inventory/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sku: `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name,
        salePrice: 20,
      })
      .expect(201);

    return res.body as { id: string; salePrice: number; name: string };
  }

  async function receiveStock(
    accessToken: string,
    supplierId: string,
    productId: string,
    quantity: number,
  ) {
    await request(app.getHttpServer())
      .post('/api/inventory/purchases/receive')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        supplierId,
        items: [
          {
            productId,
            batchNumber: `B-${Date.now()}`,
            expiryDate: '2027-01-01T00:00:00.000Z',
            quantity,
            unitCost: 8,
          },
        ],
      })
      .expect(201);
  }

  async function createDriver(accessToken: string) {
    const res = await request(app.getHttpServer())
      .post('/api/orders/drivers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Driver ${Date.now()}`,
        phone: '+96170000000',
        vehicleDescription: 'Motorbike',
      })
      .expect(201);

    return res.body as { id: string; phone: string };
  }

  it('assigns a newly placed order to an online employee and sends a message + notification', async () => {
    const staff = await registerStaff();
    const customer = await registerCustomer();
    const supplier = await createSupplier(staff.accessToken);
    const product = await createProduct(staff.accessToken);
    await receiveStock(staff.accessToken, supplier.id, product.id, 6);

    presenceService.registerConnection('employee-online-1', staff.user);

    const createRes = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({
        items: [{ productId: product.id, quantity: 2 }],
        notes: 'Please ring the bell.',
      })
      .expect(201);

    expect(createRes.body.status).toBe(OrderStatus.PENDING_REVIEW);
    expect(createRes.body.assignedEmployee?.id).toBe(staff.user.id);

    const order = await orderRepo.findOneByOrFail({ id: createRes.body.id });
    expect(order.status).toBe(OrderStatus.PENDING_REVIEW);
    expect(order.assignedEmployeeId).toBe(staff.user.id);

    const notification = await notificationRepo.findOne({
      where: {
        userId: staff.user.id,
        type: NotificationType.ORDER,
      },
      order: { createdAt: 'DESC' },
    });
    expect(notification?.title).toContain('New catalog order');

    const chatMessage = await chatMessageRepo.findOne({
      where: {
        senderId: customer.user.id,
        recipientId: staff.user.id,
      },
      order: { createdAt: 'DESC' },
    });
    expect(chatMessage?.body).toContain('New catalog order');

    presenceService.unregisterConnection('employee-online-1');
  });

  it('keeps the order pending until an employee becomes available, then assigns it automatically', async () => {
    const staff = await registerStaff();
    const customer = await registerCustomer();
    const supplier = await createSupplier(staff.accessToken);
    const product = await createProduct(staff.accessToken, 'Ibuprofen');
    await receiveStock(staff.accessToken, supplier.id, product.id, 4);

    const createRes = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({
        items: [{ productId: product.id, quantity: 1 }],
      })
      .expect(201);

    expect(createRes.body.status).toBe(OrderStatus.PENDING_ASSIGNMENT);

    presenceService.registerConnection('employee-online-2', staff.user);
    await ordersService.assignPendingOrders();

    const order = await orderRepo.findOneByOrFail({ id: createRes.body.id });
    expect(order.status).toBe(OrderStatus.PENDING_REVIEW);
    expect(order.assignedEmployeeId).toBe(staff.user.id);

    presenceService.unregisterConnection('employee-online-2');
  });

  it('reserves stock on approval and converts the order into a completed sale when paid', async () => {
    const staff = await registerStaff();
    const customer = await registerCustomer();
    const supplier = await createSupplier(staff.accessToken);
    const product = await createProduct(staff.accessToken, 'Amoxicillin');
    await receiveStock(staff.accessToken, supplier.id, product.id, 5);
    const driver = await createDriver(staff.accessToken);

    presenceService.registerConnection('employee-online-3', staff.user);

    const createRes = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({
        items: [{ productId: product.id, quantity: 3 }],
      })
      .expect(201);

    const orderId = createRes.body.id as string;

    await request(app.getHttpServer())
      .post(`/api/orders/${orderId}/approve`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({
        deliveryDriverId: driver.id,
        responseMessage: 'Delivery is on the way.',
      })
      .expect(201);

    const approvedOrder = await orderRepo.findOneByOrFail({ id: orderId });
    expect(approvedOrder.status).toBe(OrderStatus.APPROVED);

    const reservedBatch = await batchRepo.findOneByOrFail({ productId: product.id });
    expect(reservedBatch.quantityReserved).toBe(3);
    expect(reservedBatch.quantityOnHand).toBe(5);

    await request(app.getHttpServer())
      .post(`/api/orders/${orderId}/mark-paid`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({})
      .expect(201);

    const completedOrder = await orderRepo.findOneByOrFail({ id: orderId });
    expect(completedOrder.status).toBe(OrderStatus.COMPLETED);
    expect(completedOrder.saleId).toBeTruthy();

    const finalBatch = await batchRepo.findOneByOrFail({ productId: product.id });
    expect(finalBatch.quantityReserved).toBe(0);
    expect(finalBatch.quantityOnHand).toBe(2);

    const sale = await saleRepo.findOneByOrFail({ id: completedOrder.saleId! });
    expect(sale.totalAmount).toBe(60);

    presenceService.unregisterConnection('employee-online-3');
  });
});
