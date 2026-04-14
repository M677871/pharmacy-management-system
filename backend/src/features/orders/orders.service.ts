import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { BatchesRepository } from '../inventory/batches/batches.repository';
import { Batch } from '../inventory/batches/entities/batch.entity';
import { InventoryRealtimeService } from '../inventory/realtime/inventory-realtime.service';
import { roundCurrency, toDateOnly } from '../inventory/inventory.utils';
import { ProductsRepository } from '../inventory/products/products.repository';
import { SaleItemAllocationsRepository } from '../inventory/sale-item-allocations/sale-item-allocations.repository';
import { SaleItemsRepository } from '../inventory/sale-items/sale-items.repository';
import { SalesRepository } from '../inventory/sales/sales.repository';
import { StockMovementsRepository } from '../inventory/stock-movements/stock-movements.repository';
import {
  StockMovementReferenceType,
  StockMovementType,
} from '../inventory/inventory.enums';
import { ChatService } from '../messaging/chat.service';
import {
  NotificationSeverity,
  NotificationType,
} from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PresenceService } from '../realtime/core/presence.service';
import { RealtimeEmitterService } from '../realtime/core/realtime-emitter.service';
import { RealtimeServerEvent } from '../realtime/realtime.events';
import {
  DeliveryDriverPayload,
  OrderItemAllocationPayload,
  OrderItemPayload,
  OrderPayload,
  OrderStatusValue,
  RealtimeUserSummary,
} from '../realtime/realtime.types';
import { User, UserRole } from '../users/entities/user.entity';
import {
  ApproveOrderDto,
  CreateDeliveryDriverDto,
  CreateOrderDto,
  ListOrdersQueryDto,
  RejectOrderDto,
  UpdateDeliveryDriverDto,
} from './dto/order.dto';
import {
  CatalogOrder,
  CatalogOrderPaymentMethod,
  OrderStatus,
} from './entities/catalog-order.entity';
import { CatalogOrderItem } from './entities/catalog-order-item.entity';
import { CatalogOrderItemAllocation } from './entities/catalog-order-item-allocation.entity';
import { DeliveryDriver } from './entities/delivery-driver.entity';

interface GroupedOrderItem {
  productId: string;
  quantity: number;
}

@Injectable()
export class OrdersService {
  private readonly currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CatalogOrder)
    private readonly ordersRepository: Repository<CatalogOrder>,
    @InjectRepository(CatalogOrderItem)
    private readonly orderItemsRepository: Repository<CatalogOrderItem>,
    @InjectRepository(CatalogOrderItemAllocation)
    private readonly orderItemAllocationsRepository: Repository<CatalogOrderItemAllocation>,
    @InjectRepository(DeliveryDriver)
    private readonly deliveryDriversRepository: Repository<DeliveryDriver>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly presenceService: PresenceService,
    private readonly realtimeEmitter: RealtimeEmitterService,
    private readonly notificationsService: NotificationsService,
    private readonly chatService: ChatService,
    private readonly productsRepository: ProductsRepository,
    private readonly batchesRepository: BatchesRepository,
    private readonly salesRepository: SalesRepository,
    private readonly saleItemsRepository: SaleItemsRepository,
    private readonly saleItemAllocationsRepository: SaleItemAllocationsRepository,
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly inventoryRealtimeService: InventoryRealtimeService,
  ) {}

  async listOrders(user: User, query: ListOrdersQueryDto) {
    const builder = this.createListQuery();

    if (user.role === UserRole.CUSTOMER) {
      builder.andWhere('catalogOrder.clientId = :clientId', { clientId: user.id });
    } else if (user.role === UserRole.EMPLOYEE) {
      builder.andWhere('catalogOrder.assignedEmployeeId = :employeeId', {
        employeeId: user.id,
      });
    } else if (query.mine) {
      builder.andWhere('catalogOrder.assignedEmployeeId = :employeeId', {
        employeeId: user.id,
      });
    }

    if (query.status) {
      builder.andWhere('catalogOrder.status = :status', { status: query.status });
    }

    const orders = await builder.getMany();
    return orders.map((order) => this.toOrderPayload(order));
  }

  async getOrderForUser(orderId: string, user: User) {
    const order = await this.loadOrderEntityOrThrow(orderId);
    this.assertCanAccessOrder(user, order);
    return this.toOrderPayload(order);
  }

  async createOrder(customer: User, dto: CreateOrderDto) {
    const groupedItems = this.groupItems(dto.items);
    const pricedItems = await this.validateOrderItems(groupedItems);
    const orderId = await this.dataSource.transaction(async (manager) => {
      const order = manager.getRepository(CatalogOrder).create({
        orderNumber: this.generateOrderNumber(),
        clientId: customer.id,
        status: OrderStatus.PENDING_ASSIGNMENT,
        notes: dto.notes?.trim() || null,
        approvalMessage: null,
        rejectionReason: null,
        paymentMethod: null,
        totalAmount: roundCurrency(
          pricedItems.reduce((sum, item) => sum + item.lineTotal, 0),
        ),
        assignedEmployeeId: null,
        deliveryDriverId: null,
        saleId: null,
        assignedAt: null,
        reviewedAt: null,
        locationSharedAt: null,
        paidAt: null,
      });

      const savedOrder = await manager.getRepository(CatalogOrder).save(order);

      for (const item of pricedItems) {
        await manager.getRepository(CatalogOrderItem).save(
          manager.getRepository(CatalogOrderItem).create({
            orderId: savedOrder.id,
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          }),
        );
      }

      return savedOrder.id;
    });

    const createdOrder = await this.loadOrderEntityOrThrow(orderId);
    this.emitOrderCreated(createdOrder);
    await this.assignPendingOrders();
    const latestOrder = await this.loadOrderEntityOrThrow(orderId);
    return this.toOrderPayload(latestOrder);
  }

  async approveOrder(orderId: string, employee: User, dto: ApproveOrderDto) {
    const deliveryDriver = await this.deliveryDriversRepository.findOne({
      where: { id: dto.deliveryDriverId },
    });

    if (!deliveryDriver || !deliveryDriver.isActive) {
      throw new NotFoundException('Active delivery driver not found.');
    }

    const existingOrder = await this.loadOrderEntityOrThrow(orderId);
    const productIds = [...new Set(existingOrder.items.map((item) => item.productId))];
    const previousProductStates =
      await this.inventoryRealtimeService.captureProductStates(productIds);

    const result = await this.dataSource.transaction(async (manager) => {
      await this.lockOrderOrThrow(orderId, manager);
      const order = await this.loadOrderEntityOrThrow(orderId, manager);
      this.assertCanManageOrder(employee, order);

      if (order.status !== OrderStatus.PENDING_REVIEW) {
        throw new BadRequestException('Only pending assigned orders can be approved.');
      }

      const today = toDateOnly(new Date());
      const batchIds: string[] = [];

      for (const item of order.items) {
        const batches = await manager
          .getRepository(Batch)
          .createQueryBuilder('batch')
          .setLock('pessimistic_write')
          .where('batch.productId = :productId', { productId: item.productId })
          .andWhere('batch.quantityOnHand > batch.quantityReserved')
          .andWhere('batch.expiryDate >= :today', { today })
          .orderBy('batch.expiryDate', 'ASC')
          .addOrderBy('batch.receivedAt', 'ASC')
          .addOrderBy('batch.createdAt', 'ASC')
          .getMany();

        let remaining = item.quantity;

        for (const batch of batches) {
          if (remaining <= 0) {
            break;
          }

          const availableQuantity = batch.quantityOnHand - batch.quantityReserved;
          if (availableQuantity <= 0) {
            continue;
          }

          const reservedQuantity = Math.min(availableQuantity, remaining);
          batch.quantityReserved += reservedQuantity;
          await manager.getRepository(Batch).save(batch);
          await manager.getRepository(CatalogOrderItemAllocation).save(
            manager.getRepository(CatalogOrderItemAllocation).create({
              orderItemId: item.id,
              batchId: batch.id,
              quantity: reservedQuantity,
              unitCost: batch.unitCost,
            }),
          );
          batchIds.push(batch.id);
          remaining -= reservedQuantity;
        }

        if (remaining > 0) {
          throw new BadRequestException(
            `Insufficient stock to approve "${item.product.name}".`,
          );
        }
      }

      order.status = OrderStatus.APPROVED;
      order.deliveryDriverId = deliveryDriver.id;
      order.approvalMessage = dto.responseMessage?.trim() || null;
      order.rejectionReason = null;
      order.reviewedAt = new Date();
      await manager.getRepository(CatalogOrder).save(order);

      return { batchIds };
    });

    const order = await this.loadOrderEntityOrThrow(orderId);
    await this.inventoryRealtimeService.publishInventoryChange({
      reason: 'order.approved',
      productIds,
      batchIds: result.batchIds,
      relatedEntityId: order.id,
      actorUserId: employee.id,
      previousProductStates,
    });
    await this.resolveAssignmentNotification(order);
    await this.notificationsService.createForUserIds([order.clientId], {
      type: NotificationType.ORDER,
      severity: NotificationSeverity.SUCCESS,
      title: `Order approved: ${order.orderNumber}`,
      body: `${deliveryDriver.name} will deliver your order. Share your location on WhatsApp at ${deliveryDriver.phone}.`,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        driverId: deliveryDriver.id,
        driverPhone: deliveryDriver.phone,
        status: order.status,
      },
      dedupeKey: this.orderApprovalNotificationKey(order.id),
    });
    await this.chatService.sendAutomatedDirectMessage(
      employee.id,
      order.clientId,
      this.buildApprovalMessage(order),
    );
    this.emitOrderUpdated(order);
    return this.toOrderPayload(order);
  }

  async rejectOrder(orderId: string, employee: User, dto: RejectOrderDto) {
    const reason = dto.reason.trim();
    if (!reason) {
      throw new BadRequestException('A rejection reason is required.');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.lockOrderOrThrow(orderId, manager);
      const order = await this.loadOrderEntityOrThrow(orderId, manager);
      this.assertCanManageOrder(employee, order);

      if (order.status !== OrderStatus.PENDING_REVIEW) {
        throw new BadRequestException('Only pending assigned orders can be rejected.');
      }

      order.status = OrderStatus.REJECTED;
      order.rejectionReason = reason;
      order.approvalMessage = null;
      order.deliveryDriverId = null;
      order.reviewedAt = new Date();
      await manager.getRepository(CatalogOrder).save(order);
    });

    const order = await this.loadOrderEntityOrThrow(orderId);
    await this.resolveAssignmentNotification(order);
    await this.notificationsService.createForUserIds([order.clientId], {
      type: NotificationType.ORDER,
      severity: NotificationSeverity.WARNING,
      title: `Order rejected: ${order.orderNumber}`,
      body: reason,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
      },
      dedupeKey: this.orderRejectionNotificationKey(order.id),
    });
    await this.chatService.sendAutomatedDirectMessage(
      employee.id,
      order.clientId,
      this.buildRejectionMessage(order),
    );
    this.emitOrderUpdated(order);
    return this.toOrderPayload(order);
  }

  async markLocationShared(orderId: string, customer: User) {
    let notifyEmployee = false;

    await this.dataSource.transaction(async (manager) => {
      await this.lockOrderOrThrow(orderId, manager);
      const order = await this.loadOrderEntityOrThrow(orderId, manager);
      this.assertCanAccessOrder(customer, order);

      if (customer.role !== UserRole.CUSTOMER || order.clientId !== customer.id) {
        throw new ForbiddenException('You can only update your own orders.');
      }

      if (order.status !== OrderStatus.APPROVED) {
        throw new BadRequestException(
          'Location can only be shared for approved orders.',
        );
      }

      if (!order.locationSharedAt) {
        order.locationSharedAt = new Date();
        notifyEmployee = Boolean(order.assignedEmployeeId);
        await manager.getRepository(CatalogOrder).save(order);
      }
    });

    const order = await this.loadOrderEntityOrThrow(orderId);

    if (notifyEmployee && order.assignedEmployeeId) {
      await this.chatService.sendAutomatedDirectMessage(
        customer.id,
        order.assignedEmployeeId,
        this.buildLocationSharedMessage(order),
      );
    }

    this.emitOrderUpdated(order);
    return this.toOrderPayload(order);
  }

  async markOrderPaid(orderId: string, employee: User) {
    const currentOrder = await this.loadOrderEntityOrThrow(orderId);
    const productIds = [...new Set(currentOrder.items.map((item) => item.productId))];
    const batchIds = [
      ...new Set(
        currentOrder.items.flatMap((item) =>
          item.allocations.map((allocation) => allocation.batchId),
        ),
      ),
    ];
    const [previousProductStates, previousBatchStates] = await Promise.all([
      this.inventoryRealtimeService.captureProductStates(productIds),
      this.inventoryRealtimeService.captureBatchStates(batchIds),
    ]);

    const result = await this.dataSource.transaction(async (manager) => {
      await this.lockOrderOrThrow(orderId, manager);
      const order = await this.loadOrderEntityOrThrow(orderId, manager);
      this.assertCanManageOrder(employee, order);

      if (order.status !== OrderStatus.APPROVED) {
        throw new BadRequestException('Only approved orders can be marked as paid.');
      }

      const orderAllocations = order.items.flatMap((item) => item.allocations);
      if (!orderAllocations.length) {
        throw new BadRequestException(
          'Approved order is missing reserved stock allocations.',
        );
      }

      const lockedBatches = batchIds.length
        ? await manager
            .getRepository(Batch)
            .createQueryBuilder('batch')
            .setLock('pessimistic_write')
            .where('batch.id IN (:...batchIds)', { batchIds })
            .getMany()
        : [];
      const batchesById = new Map(lockedBatches.map((batch) => [batch.id, batch]));

      let sale = this.salesRepository.create(
        {
          soldById: order.assignedEmployeeId ?? employee.id,
          notes: this.buildSaleNotes(order),
          soldAt: new Date(),
          totalAmount: 0,
        },
        manager,
      );
      sale = await this.salesRepository.save(sale, manager);

      let totalAmount = 0;

      for (const orderItem of order.items) {
        const saleItem = await this.saleItemsRepository.save(
          this.saleItemsRepository.create(
            {
              saleId: sale.id,
              productId: orderItem.productId,
              quantity: orderItem.quantity,
              unitPrice: orderItem.unitPrice,
              lineTotal: orderItem.lineTotal,
            },
            manager,
          ),
          manager,
        );

        totalAmount += saleItem.lineTotal;

        for (const allocation of orderItem.allocations) {
          const batch = batchesById.get(allocation.batchId);

          if (!batch) {
            throw new NotFoundException('Reserved batch no longer exists.');
          }

          if (batch.quantityReserved < allocation.quantity) {
            throw new BadRequestException(
              `Reserved stock for batch ${batch.batchNumber} is inconsistent.`,
            );
          }

          if (batch.quantityOnHand < allocation.quantity) {
            throw new BadRequestException(
              `Batch ${batch.batchNumber} no longer has enough stock.`,
            );
          }

          batch.quantityReserved -= allocation.quantity;
          batch.quantityOnHand -= allocation.quantity;
          await this.batchesRepository.save(batch, manager);

          await this.saleItemAllocationsRepository.save(
            this.saleItemAllocationsRepository.create(
              {
                saleItemId: saleItem.id,
                batchId: batch.id,
                quantity: allocation.quantity,
                unitCost: allocation.unitCost,
              },
              manager,
            ),
            manager,
          );

          await this.stockMovementsRepository.save(
            this.stockMovementsRepository.create(
              {
                movementType: StockMovementType.STOCK_OUT,
                referenceType: StockMovementReferenceType.SALE,
                productId: orderItem.productId,
                batchId: batch.id,
                purchaseId: null,
                purchaseItemId: null,
                saleId: sale.id,
                saleItemId: saleItem.id,
                returnId: null,
                returnItemId: null,
                quantity: allocation.quantity,
                unitCost: allocation.unitCost,
                unitPrice: saleItem.unitPrice,
                occurredAt: new Date(),
                note: this.buildSaleNotes(order),
              },
              manager,
            ),
            manager,
          );
        }
      }

      sale.totalAmount = roundCurrency(totalAmount);
      await this.salesRepository.save(sale, manager);

      order.saleId = sale.id;
      order.status = OrderStatus.COMPLETED;
      order.paymentMethod = CatalogOrderPaymentMethod.CASH;
      order.paidAt = new Date();
      await manager.getRepository(CatalogOrder).save(order);

      return { saleId: sale.id };
    });

    const order = await this.loadOrderEntityOrThrow(orderId);
    await this.inventoryRealtimeService.publishInventoryChange({
      reason: 'sale.completed',
      productIds,
      batchIds,
      relatedEntityId: result.saleId,
      actorUserId: employee.id,
      previousProductStates,
      previousBatchStates,
    });
    await this.notificationsService.createForUserIds([order.clientId], {
      type: NotificationType.ORDER,
      severity: NotificationSeverity.SUCCESS,
      title: `Order completed: ${order.orderNumber}`,
      body: 'Your cash delivery has been completed successfully.',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        saleId: order.saleId,
        status: order.status,
      },
      dedupeKey: this.orderCompletedNotificationKey(order.id),
    });
    if (order.assignedEmployeeId) {
      await this.notificationsService.resolveByDedupeKeys(
        [order.clientId],
        [this.orderApprovalNotificationKey(order.id)],
      );
      await this.chatService.sendAutomatedDirectMessage(
        order.assignedEmployeeId,
        order.clientId,
        this.buildPaidMessage(order),
      );
    }
    this.emitOrderUpdated(order);
    return this.toOrderPayload(order);
  }

  async listDeliveryDrivers() {
    const drivers = await this.deliveryDriversRepository.find({
      order: {
        isActive: 'DESC',
        name: 'ASC',
      },
    });

    return drivers.map((driver) => this.toDeliveryDriverPayload(driver));
  }

  async createDeliveryDriver(dto: CreateDeliveryDriverDto) {
    const name = dto.name.trim();
    const existing = await this.findDriverByName(name);

    if (existing) {
      throw new ConflictException('Delivery driver name already exists.');
    }

    const driver = this.deliveryDriversRepository.create({
      name,
      phone: dto.phone.trim(),
      email: dto.email?.trim() || null,
      vehicleDescription: dto.vehicleDescription?.trim() || null,
      notes: dto.notes?.trim() || null,
      isActive: true,
    });

    const savedDriver = await this.deliveryDriversRepository.save(driver);
    return this.toDeliveryDriverPayload(savedDriver);
  }

  async updateDeliveryDriver(driverId: string, dto: UpdateDeliveryDriverDto) {
    const driver = await this.deliveryDriversRepository.findOne({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Delivery driver not found.');
    }

    const nextName = dto.name?.trim();
    if (nextName && nextName.toLowerCase() !== driver.name.toLowerCase()) {
      const existing = await this.findDriverByName(nextName);

      if (existing && existing.id !== driver.id) {
        throw new ConflictException('Delivery driver name already exists.');
      }
    }

    this.deliveryDriversRepository.merge(driver, {
      name: nextName ?? driver.name,
      phone: dto.phone?.trim() ?? driver.phone,
      email: dto.email === undefined ? driver.email : dto.email?.trim() || null,
      vehicleDescription:
        dto.vehicleDescription === undefined
          ? driver.vehicleDescription
          : dto.vehicleDescription?.trim() || null,
      notes: dto.notes === undefined ? driver.notes : dto.notes?.trim() || null,
      isActive: dto.isActive ?? driver.isActive,
    });

    const savedDriver = await this.deliveryDriversRepository.save(driver);
    return this.toDeliveryDriverPayload(savedDriver);
  }

  async removeDeliveryDriver(driverId: string) {
    const driver = await this.deliveryDriversRepository.findOne({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Delivery driver not found.');
    }

    const linkedOrders = await this.ordersRepository.count({
      where: { deliveryDriverId: driverId },
    });

    if (linkedOrders > 0) {
      throw new ConflictException(
        'Delivery driver cannot be deleted while related orders still exist.',
      );
    }

    await this.deliveryDriversRepository.remove(driver);
    return { id: driverId };
  }

  async assignPendingOrders() {
    const onlineEmployeeIds = this.presenceService.getOnlineUserIdsByRole(
      UserRole.EMPLOYEE,
    );

    if (!onlineEmployeeIds.length) {
      return [];
    }

    const assignments = await this.dataSource.transaction(async (manager) => {
      const pendingOrders = await manager
        .getRepository(CatalogOrder)
        .createQueryBuilder('catalogOrder')
        .setLock('pessimistic_write')
        .where('catalogOrder.status = :status', {
          status: OrderStatus.PENDING_ASSIGNMENT,
        })
        .andWhere('catalogOrder.assignedEmployeeId IS NULL')
        .orderBy('catalogOrder.createdAt', 'ASC')
        .getMany();

      if (!pendingOrders.length) {
        return [] as Array<{ orderId: string; employeeId: string }>;
      }

      const sortedEmployeeIds = await this.sortEmployeesByLastAssignment(
        onlineEmployeeIds,
        manager,
      );

      const nextAssignments: Array<{ orderId: string; employeeId: string }> = [];

      for (const [index, pendingOrder] of pendingOrders.entries()) {
        const employeeId = sortedEmployeeIds[index % sortedEmployeeIds.length];
        pendingOrder.assignedEmployeeId = employeeId;
        pendingOrder.status = OrderStatus.PENDING_REVIEW;
        pendingOrder.assignedAt = new Date();
        await manager.getRepository(CatalogOrder).save(pendingOrder);
        nextAssignments.push({
          orderId: pendingOrder.id,
          employeeId,
        });
      }

      return nextAssignments;
    });

    const payloads: OrderPayload[] = [];

    for (const assignment of assignments) {
      const order = await this.loadOrderEntityOrThrow(assignment.orderId);
      await this.notificationsService.createForUserIds([assignment.employeeId], {
        type: NotificationType.ORDER,
        severity: NotificationSeverity.INFO,
        title: `New catalog order: ${order.orderNumber}`,
        body: `${this.toUserSummary(order.client).displayName} placed an order totaling ${this.formatCurrency(
          order.totalAmount,
        )}.`,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          clientId: order.clientId,
          status: order.status,
        },
        dedupeKey: this.orderAssignmentNotificationKey(order.id),
      });
      await this.chatService.sendAutomatedDirectMessage(
        order.clientId,
        assignment.employeeId,
        this.buildAssignmentMessage(order),
      );
      this.emitOrderUpdated(order);
      payloads.push(this.toOrderPayload(order));
    }

    return payloads;
  }

  private async validateOrderItems(items: GroupedOrderItem[]) {
    return Promise.all(
      items.map(async (item) => {
        const product = await this.productsRepository.findById(item.productId);

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found.`);
        }

        if (!product.isActive) {
          throw new BadRequestException(
            `Product "${product.name}" is inactive and cannot be ordered.`,
          );
        }

        const today = toDateOnly(new Date());
        const availableQuantity = product.batches
          .filter(
            (batch) =>
              batch.quantityOnHand > batch.quantityReserved &&
              batch.expiryDate >= today,
          )
          .reduce(
            (sum, batch) => sum + (batch.quantityOnHand - batch.quantityReserved),
            0,
          );

        if (availableQuantity < item.quantity) {
          throw new BadRequestException(
            `Product "${product.name}" does not have enough available stock.`,
          );
        }

        return {
          product,
          quantity: item.quantity,
          unitPrice: product.salePrice,
          lineTotal: roundCurrency(product.salePrice * item.quantity),
        };
      }),
    );
  }

  private groupItems(items: CreateOrderDto['items']): GroupedOrderItem[] {
    const grouped = new Map<string, number>();

    for (const item of items) {
      grouped.set(item.productId, (grouped.get(item.productId) ?? 0) + item.quantity);
    }

    return [...grouped.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
  }

  private createListQuery() {
    return this.ordersRepository
      .createQueryBuilder('catalogOrder')
      .leftJoinAndSelect('catalogOrder.client', 'client')
      .leftJoinAndSelect('catalogOrder.assignedEmployee', 'assignedEmployee')
      .leftJoinAndSelect('catalogOrder.deliveryDriver', 'deliveryDriver')
      .leftJoinAndSelect('catalogOrder.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('item.allocations', 'allocation')
      .leftJoinAndSelect('allocation.batch', 'batch')
      .orderBy('catalogOrder.createdAt', 'DESC')
      .addOrderBy('item.createdAt', 'ASC')
      .addOrderBy('allocation.createdAt', 'ASC');
  }

  private async loadOrderEntityOrThrow(
    orderId: string,
    manager?: EntityManager,
  ): Promise<CatalogOrder> {
    const repository = manager?.getRepository(CatalogOrder) ?? this.ordersRepository;
    const order = await repository.findOne({
      where: { id: orderId },
      relations: {
        client: true,
        assignedEmployee: true,
        deliveryDriver: true,
        sale: true,
        items: {
          product: true,
          allocations: {
            batch: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  private async lockOrderOrThrow(orderId: string, manager: EntityManager) {
    const order = await manager
      .getRepository(CatalogOrder)
      .createQueryBuilder('catalogOrder')
      .setLock('pessimistic_write')
      .where('catalogOrder.id = :orderId', { orderId })
      .getOne();

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  private assertCanAccessOrder(user: User, order: CatalogOrder) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === UserRole.CUSTOMER && order.clientId !== user.id) {
      throw new ForbiddenException('You do not have access to this order.');
    }

    if (user.role === UserRole.EMPLOYEE && order.assignedEmployeeId !== user.id) {
      throw new ForbiddenException('You do not have access to this order.');
    }
  }

  private assertCanManageOrder(user: User, order: CatalogOrder) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (order.assignedEmployeeId !== user.id) {
      throw new ForbiddenException('Only the assigned employee can manage this order.');
    }
  }

  private async sortEmployeesByLastAssignment(
    employeeIds: string[],
    manager: EntityManager,
  ) {
    const rows = await manager
      .getRepository(CatalogOrder)
      .createQueryBuilder('catalogOrder')
      .select('catalogOrder.assignedEmployeeId', 'employeeId')
      .addSelect('MAX(catalogOrder.assignedAt)', 'lastAssignedAt')
      .where('catalogOrder.assignedEmployeeId IN (:...employeeIds)', { employeeIds })
      .groupBy('catalogOrder.assignedEmployeeId')
      .getRawMany<{ employeeId: string; lastAssignedAt: string | null }>();

    const lastAssignedAtByEmployeeId = new Map(
      rows.map((row) => [
        row.employeeId,
        row.lastAssignedAt ? Date.parse(row.lastAssignedAt) : 0,
      ]),
    );

    return employeeIds.slice().sort((left, right) => {
      const leftValue = lastAssignedAtByEmployeeId.get(left) ?? 0;
      const rightValue = lastAssignedAtByEmployeeId.get(right) ?? 0;
      return leftValue - rightValue;
    });
  }

  private async resolveAssignmentNotification(order: CatalogOrder) {
    if (!order.assignedEmployeeId) {
      return;
    }

    await this.notificationsService.resolveByDedupeKeys(
      [order.assignedEmployeeId],
      [this.orderAssignmentNotificationKey(order.id)],
    );
  }

  private emitOrderCreated(order: CatalogOrder) {
    const payload = this.toOrderPayload(order);
    this.realtimeEmitter.emitToUser(
      order.clientId,
      RealtimeServerEvent.ORDER_CREATED,
      payload,
    );
    this.realtimeEmitter.emitToRole(
      UserRole.ADMIN,
      RealtimeServerEvent.ORDER_CREATED,
      payload,
    );

    if (order.assignedEmployeeId) {
      this.realtimeEmitter.emitToUser(
        order.assignedEmployeeId,
        RealtimeServerEvent.ORDER_CREATED,
        payload,
      );
    }
  }

  private emitOrderUpdated(order: CatalogOrder) {
    const payload = this.toOrderPayload(order);
    this.realtimeEmitter.emitToUser(
      order.clientId,
      RealtimeServerEvent.ORDER_UPDATED,
      payload,
    );
    this.realtimeEmitter.emitToRole(
      UserRole.ADMIN,
      RealtimeServerEvent.ORDER_UPDATED,
      payload,
    );

    if (order.assignedEmployeeId) {
      this.realtimeEmitter.emitToUser(
        order.assignedEmployeeId,
        RealtimeServerEvent.ORDER_UPDATED,
        payload,
      );
    }
  }

  private toOrderPayload(order: CatalogOrder): OrderPayload {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status as OrderStatusValue,
      notes: order.notes,
      approvalMessage: order.approvalMessage,
      rejectionReason: order.rejectionReason,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      saleId: order.saleId,
      itemCount: order.items.length,
      client: this.toUserSummary(order.client),
      assignedEmployee: order.assignedEmployee
        ? this.toUserSummary(order.assignedEmployee)
        : null,
      deliveryDriver: order.deliveryDriver
        ? this.toDeliveryDriverPayload(order.deliveryDriver)
        : null,
      items: order.items
        .slice()
        .sort((left, right) => left.product.name.localeCompare(right.product.name))
        .map((item) => this.toOrderItemPayload(item)),
      createdAt: order.createdAt.toISOString(),
      assignedAt: order.assignedAt?.toISOString() ?? null,
      reviewedAt: order.reviewedAt?.toISOString() ?? null,
      locationSharedAt: order.locationSharedAt?.toISOString() ?? null,
      paidAt: order.paidAt?.toISOString() ?? null,
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private toOrderItemPayload(item: CatalogOrderItem): OrderItemPayload {
    return {
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      sku: item.product.sku,
      unit: item.product.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      allocations: item.allocations
        .slice()
        .sort((left, right) => left.batch.expiryDate.localeCompare(right.batch.expiryDate))
        .map((allocation) => this.toOrderItemAllocationPayload(allocation)),
    };
  }

  private toOrderItemAllocationPayload(
    allocation: CatalogOrderItemAllocation,
  ): OrderItemAllocationPayload {
    return {
      id: allocation.id,
      batchId: allocation.batchId,
      batchNumber: allocation.batch.batchNumber,
      expiryDate: allocation.batch.expiryDate,
      quantity: allocation.quantity,
    };
  }

  private toDeliveryDriverPayload(driver: DeliveryDriver): DeliveryDriverPayload {
    return {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      vehicleDescription: driver.vehicleDescription,
      notes: driver.notes,
      isActive: driver.isActive,
      createdAt: driver.createdAt.toISOString(),
      updatedAt: driver.updatedAt.toISOString(),
    };
  }

  private toUserSummary(user: User): RealtimeUserSummary {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: `${user.firstName} ${user.lastName}`.trim() || user.email,
      role: user.role,
    };
  }

  private buildAssignmentMessage(order: CatalogOrder) {
    return [
      `New catalog order ${order.orderNumber}`,
      `Client: ${this.toUserSummary(order.client).displayName}`,
      'Items:',
      ...order.items.map(
        (item) =>
          `- ${item.product.name} x${item.quantity} @ ${this.formatCurrency(item.unitPrice)}`,
      ),
      `Total: ${this.formatCurrency(order.totalAmount)}`,
      order.notes ? `Client note: ${order.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildApprovalMessage(order: CatalogOrder) {
    return [
      `Order ${order.orderNumber} approved.`,
      order.deliveryDriver ? `Driver: ${order.deliveryDriver.name}` : null,
      order.deliveryDriver ? `WhatsApp / Phone: ${order.deliveryDriver.phone}` : null,
      order.approvalMessage ? `Message: ${order.approvalMessage}` : null,
      'Please share your delivery location with the driver on WhatsApp.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildRejectionMessage(order: CatalogOrder) {
    return [
      `Order ${order.orderNumber} was rejected.`,
      order.rejectionReason ? `Reason: ${order.rejectionReason}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildLocationSharedMessage(order: CatalogOrder) {
    return [
      `Order ${order.orderNumber} location shared with the delivery driver.`,
      order.deliveryDriver ? `Driver: ${order.deliveryDriver.name}` : null,
      order.deliveryDriver ? `Phone: ${order.deliveryDriver.phone}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildPaidMessage(order: CatalogOrder) {
    return `Order ${order.orderNumber} has been completed and marked paid in cash.`;
  }

  private buildSaleNotes(order: CatalogOrder) {
    return [
      `Catalog order ${order.orderNumber}`,
      order.notes ? `Client note: ${order.notes}` : null,
    ]
      .filter(Boolean)
      .join(' | ');
  }

  private formatCurrency(amount: number) {
    return this.currencyFormatter.format(amount);
  }

  private async findDriverByName(name: string) {
    return this.deliveryDriversRepository
      .createQueryBuilder('driver')
      .where('LOWER(driver.name) = LOWER(:name)', { name })
      .getOne();
  }

  private generateOrderNumber() {
    return `ORD-${Date.now().toString(36).toUpperCase()}-${randomUUID()
      .slice(0, 4)
      .toUpperCase()}`;
  }

  private orderAssignmentNotificationKey(orderId: string) {
    return `order:assignment:${orderId}`;
  }

  private orderApprovalNotificationKey(orderId: string) {
    return `order:approval:${orderId}`;
  }

  private orderRejectionNotificationKey(orderId: string) {
    return `order:rejection:${orderId}`;
  }

  private orderCompletedNotificationKey(orderId: string) {
    return `order:completed:${orderId}`;
  }
}
