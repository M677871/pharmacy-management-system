import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import * as request from 'supertest';
import { createTestApp, cleanDatabase } from '../helpers/test-app';
import { registerUser, uniqueEmail, DEFAULT_PASSWORD } from '../helpers/auth.helper';
import { User, UserRole } from '../../src/features/users/entities/user.entity';
import { Batch } from '../../src/features/inventory/batches/entities/batch.entity';
import { StockMovement } from '../../src/features/inventory/stock-movements/entities/stock-movement.entity';
import {
  StockMovementReferenceType,
  StockMovementType,
} from '../../src/features/inventory/inventory.enums';

describe('Inventory / POS workflow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepo: Repository<User>;
  let batchRepo: Repository<Batch>;
  let stockMovementRepo: Repository<StockMovement>;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    dataSource = ctx.dataSource;
    userRepo = dataSource.getRepository(User);
    batchRepo = dataSource.getRepository(Batch);
    stockMovementRepo = dataSource.getRepository(StockMovement);
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

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    return {
      email,
      password,
      accessToken: loginRes.body.accessToken as string,
    };
  }

  async function createSupplier(accessToken: string, name = `Supplier ${Date.now()}`) {
    const res = await request(app.getHttpServer())
      .post('/api/inventory/suppliers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name })
      .expect(201);

    return res.body as { id: string; name: string };
  }

  async function createProduct(accessToken: string, name = `Product ${Date.now()}`) {
    const res = await request(app.getHttpServer())
      .post('/api/inventory/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        sku: `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name,
        salePrice: 25,
      })
      .expect(201);

    return res.body as { id: string; name: string };
  }

  async function receiveStock(
    accessToken: string,
    supplierId: string,
    items: Array<{
      productId: string;
      batchNumber: string;
      expiryDate: string;
      quantity: number;
      unitCost: number;
    }>,
  ) {
    return request(app.getHttpServer())
      .post('/api/inventory/purchases/receive')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        supplierId,
        items,
      })
      .expect(201);
  }

  it('allocates FEFO batches first and can split across multiple batches', async () => {
    const staff = await registerStaff();
    const supplier = await createSupplier(staff.accessToken);
    const product = await createProduct(staff.accessToken, 'Paracetamol');

    await receiveStock(staff.accessToken, supplier.id, [
      {
        productId: product.id,
        batchNumber: 'P-APR',
        expiryDate: '2027-04-15T00:00:00.000Z',
        quantity: 5,
        unitCost: 8,
      },
    ]);

    await receiveStock(staff.accessToken, supplier.id, [
      {
        productId: product.id,
        batchNumber: 'P-MAR',
        expiryDate: '2027-03-20T00:00:00.000Z',
        quantity: 7,
        unitCost: 8,
      },
    ]);

    const checkoutRes = await request(app.getHttpServer())
      .post('/api/inventory/sales/checkout')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({
        items: [{ productId: product.id, quantity: 10 }],
      })
      .expect(201);

    expect(checkoutRes.body.items).toHaveLength(1);
    expect(checkoutRes.body.items[0].allocations).toEqual([
      expect.objectContaining({
        batchNumber: 'P-MAR',
        quantity: 7,
      }),
      expect.objectContaining({
        batchNumber: 'P-APR',
        quantity: 3,
      }),
    ]);

    const batches = await batchRepo.find({
      where: { productId: product.id },
      order: { expiryDate: 'ASC' },
    });

    expect(batches[0].batchNumber).toBe('P-MAR');
    expect(batches[0].quantityOnHand).toBe(0);
    expect(batches[1].batchNumber).toBe('P-APR');
    expect(batches[1].quantityOnHand).toBe(2);
  });

  it('fails checkout when stock is insufficient', async () => {
    const staff = await registerStaff();
    const supplier = await createSupplier(staff.accessToken);
    const product = await createProduct(staff.accessToken, 'Ibuprofen');

    await receiveStock(staff.accessToken, supplier.id, [
      {
        productId: product.id,
        batchNumber: 'I-1',
        expiryDate: '2026-05-01T00:00:00.000Z',
        quantity: 3,
        unitCost: 6,
      },
    ]);

    const checkoutRes = await request(app.getHttpServer())
      .post('/api/inventory/sales/checkout')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({
        items: [{ productId: product.id, quantity: 4 }],
      })
      .expect(400);

    expect(checkoutRes.body.message).toContain('Insufficient stock');
  });

  it('does not allocate expired batches', async () => {
    const staff = await registerStaff();
    const supplier = await createSupplier(staff.accessToken);
    const product = await createProduct(staff.accessToken, 'Vitamin C');

    await receiveStock(staff.accessToken, supplier.id, [
      {
        productId: product.id,
        batchNumber: 'V-OLD',
        expiryDate: '2025-01-01T00:00:00.000Z',
        quantity: 5,
        unitCost: 4,
      },
      {
        productId: product.id,
        batchNumber: 'V-NEW',
        expiryDate: '2027-01-01T00:00:00.000Z',
        quantity: 2,
        unitCost: 4,
      },
    ]);

    const checkoutRes = await request(app.getHttpServer())
      .post('/api/inventory/sales/checkout')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({
        items: [{ productId: product.id, quantity: 3 }],
      })
      .expect(400);

    expect(checkoutRes.body.message).toContain('Insufficient stock');
  });

  it('prevents returns from exceeding sold quantity', async () => {
    const staff = await registerStaff();
    const supplier = await createSupplier(staff.accessToken);
    const product = await createProduct(staff.accessToken, 'Cough Syrup');

    await receiveStock(staff.accessToken, supplier.id, [
      {
        productId: product.id,
        batchNumber: 'C-1',
        expiryDate: '2026-09-01T00:00:00.000Z',
        quantity: 5,
        unitCost: 10,
      },
    ]);

    const checkoutRes = await request(app.getHttpServer())
      .post('/api/inventory/sales/checkout')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({
        items: [{ productId: product.id, quantity: 3 }],
      })
      .expect(201);

    const saleItem = checkoutRes.body.items[0];

    await request(app.getHttpServer())
      .post('/api/inventory/returns')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({
        saleId: checkoutRes.body.id,
        items: [{ saleItemId: saleItem.id, quantity: 2 }],
      })
      .expect(201);

    const returnRes = await request(app.getHttpServer())
      .post('/api/inventory/returns')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({
        saleId: checkoutRes.body.id,
        items: [{ saleItemId: saleItem.id, quantity: 2 }],
      })
      .expect(400);

    expect(returnRes.body.message).toContain('remain returnable');
  });

  it('records stock movements for purchase, sale, and return', async () => {
    const staff = await registerStaff();
    const supplier = await createSupplier(staff.accessToken);
    const product = await createProduct(staff.accessToken, 'Antibiotic');

    await receiveStock(staff.accessToken, supplier.id, [
      {
        productId: product.id,
        batchNumber: 'A-1',
        expiryDate: '2026-11-01T00:00:00.000Z',
        quantity: 5,
        unitCost: 14,
      },
    ]);

    const checkoutRes = await request(app.getHttpServer())
      .post('/api/inventory/sales/checkout')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({
        items: [{ productId: product.id, quantity: 2 }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/inventory/returns')
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({
        saleId: checkoutRes.body.id,
        items: [{ saleItemId: checkoutRes.body.items[0].id, quantity: 1 }],
      })
      .expect(201);

    const movements = await stockMovementRepo.find({
      where: { productId: product.id },
      order: { createdAt: 'ASC' },
    });

    expect(movements).toHaveLength(3);
    expect(movements.map((movement) => movement.referenceType)).toEqual([
      StockMovementReferenceType.PURCHASE,
      StockMovementReferenceType.SALE,
      StockMovementReferenceType.RETURN,
    ]);
    expect(movements.map((movement) => movement.movementType)).toEqual([
      StockMovementType.STOCK_IN,
      StockMovementType.STOCK_OUT,
      StockMovementType.STOCK_IN,
    ]);
    expect(movements.map((movement) => movement.quantity)).toEqual([5, 2, 1]);
  });
});
