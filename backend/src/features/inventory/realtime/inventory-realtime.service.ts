import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  NotificationSeverity,
  NotificationType,
} from '../../notifications/entities/notification.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { RealtimeEmitterService } from '../../realtime/core/realtime-emitter.service';
import { RealtimeServerEvent } from '../../realtime/realtime.events';
import {
  AnalyticsRefreshPayload,
  InventoryChangeReason,
  InventoryChangedPayload,
} from '../../realtime/realtime.types';
import { User, UserRole } from '../../users/entities/user.entity';
import { toDateOnly } from '../inventory.utils';
import { Batch } from '../batches/entities/batch.entity';
import { Product } from '../products/entities/product.entity';

type StockStatus = 'normal' | 'low' | 'out';

interface ProductAlertState {
  id: string;
  name: string;
  sku: string;
  unit: string;
  categoryName: string | null;
  availableQuantity: number;
  status: StockStatus;
}

interface BatchAlertState {
  id: string;
  productId: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  quantityOnHand: number;
  nearExpiry: boolean;
}

interface PublishInventoryChangeInput {
  reason: InventoryChangeReason;
  productIds?: string[];
  batchIds?: string[];
  relatedEntityId?: string | null;
  actorUserId?: string | null;
  previousProductStates?: Map<string, ProductAlertState>;
  previousBatchStates?: Map<string, BatchAlertState>;
}

const STAFF_ROLES = [UserRole.ADMIN, UserRole.EMPLOYEE];

@Injectable()
export class InventoryRealtimeService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Batch)
    private readonly batchesRepository: Repository<Batch>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly emitter: RealtimeEmitterService,
  ) {}

  async captureProductStates(productIds: string[]) {
    const uniqueProductIds = [...new Set(productIds)].filter(Boolean);

    if (!uniqueProductIds.length) {
      return new Map<string, ProductAlertState>();
    }

    const products = await this.productsRepository.find({
      where: {
        id: In(uniqueProductIds),
      },
      relations: {
        category: true,
        batches: true,
      },
    });

    const today = toDateOnly(new Date());
    const threshold = this.getLowStockThreshold();
    const stateByProductId = new Map<string, ProductAlertState>();

    for (const product of products) {
      const activeBatches = product.batches.filter(
        (batch) => batch.quantityOnHand > 0,
      );
      const sellableBatches = activeBatches.filter(
        (batch) => batch.expiryDate >= today,
      );
      const availableQuantity = sellableBatches.reduce(
        (sum, batch) => sum + batch.quantityOnHand,
        0,
      );
      const status = !product.isActive
        ? 'normal'
        : availableQuantity === 0
          ? 'out'
          : availableQuantity <= threshold
            ? 'low'
            : 'normal';

      stateByProductId.set(product.id, {
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        categoryName: product.category?.name ?? null,
        availableQuantity,
        status,
      });
    }

    return stateByProductId;
  }

  async captureBatchStates(batchIds: string[]) {
    const uniqueBatchIds = [...new Set(batchIds)].filter(Boolean);

    if (!uniqueBatchIds.length) {
      return new Map<string, BatchAlertState>();
    }

    const batches = await this.batchesRepository.find({
      where: {
        id: In(uniqueBatchIds),
      },
      relations: {
        product: true,
      },
    });

    return this.toBatchStateMap(batches);
  }

  async captureBatchStatesForProducts(productIds: string[]) {
    const uniqueProductIds = [...new Set(productIds)].filter(Boolean);

    if (!uniqueProductIds.length) {
      return new Map<string, BatchAlertState>();
    }

    const batches = await this.batchesRepository.find({
      where: {
        productId: In(uniqueProductIds),
      },
      relations: {
        product: true,
      },
    });

    return this.toBatchStateMap(batches);
  }

  async publishInventoryChange(input: PublishInventoryChangeInput) {
    const productIds = [...new Set(input.productIds ?? [])].filter(Boolean);
    const batchIds = [...new Set(input.batchIds ?? [])].filter(Boolean);
    const occurredAt = new Date().toISOString();

    const [nextProductStates, nextBatchStates] = await Promise.all([
      this.captureProductStates(productIds),
      this.captureBatchStates(batchIds),
    ]);

    await Promise.all([
      this.reconcileProductAlerts(
        input.previousProductStates ?? new Map<string, ProductAlertState>(),
        nextProductStates,
      ),
      this.reconcileBatchAlerts(
        input.previousBatchStates ?? new Map<string, BatchAlertState>(),
        nextBatchStates,
      ),
    ]);

    const inventoryPayload: InventoryChangedPayload = {
      reason: input.reason,
      productIds,
      batchIds,
      relatedEntityId: input.relatedEntityId ?? null,
      actorUserId: input.actorUserId ?? null,
      occurredAt,
    };
    this.emitter.emitToRoles(
      this.getInventoryAudience(input.reason),
      RealtimeServerEvent.INVENTORY_CHANGED,
      inventoryPayload,
    );

    for (const scope of this.getAnalyticsScopes(input.reason)) {
      const analyticsPayload: AnalyticsRefreshPayload = {
        scope,
        reason: input.reason,
        occurredAt,
      };
      this.emitter.emitToRoles(
        this.getAnalyticsAudience(scope),
        RealtimeServerEvent.ANALYTICS_REFRESH,
        analyticsPayload,
      );
    }
  }

  private async reconcileProductAlerts(
    previousStates: Map<string, ProductAlertState>,
    nextStates: Map<string, ProductAlertState>,
  ) {
    const staffUserIds = await this.getStaffUserIds();

    for (const productId of new Set([
      ...previousStates.keys(),
      ...nextStates.keys(),
    ])) {
      const previous = previousStates.get(productId);
      const next = nextStates.get(productId);
      const previousStatus = previous?.status ?? 'normal';
      const nextStatus = next?.status ?? 'normal';
      const lowStockKey = this.lowStockDedupeKey(productId);
      const outOfStockKey = this.outOfStockDedupeKey(productId);

      if (nextStatus === previousStatus) {
        continue;
      }

      if (nextStatus === 'normal') {
        await this.notificationsService.resolveByDedupeKeys(staffUserIds, [
          lowStockKey,
          outOfStockKey,
        ]);
        continue;
      }

      if (nextStatus === 'low' && next) {
        await this.notificationsService.resolveByDedupeKeys(staffUserIds, [
          outOfStockKey,
        ]);
        await this.notificationsService.createForRoles(STAFF_ROLES, {
          type: NotificationType.LOW_STOCK,
          severity: NotificationSeverity.WARNING,
          title: `Low stock: ${next.name}`,
          body: `${next.name} (${next.sku}) is down to ${next.availableQuantity} ${next.unit}.`,
          metadata: {
            productId: next.id,
            sku: next.sku,
            availableQuantity: next.availableQuantity,
            categoryName: next.categoryName,
          },
          dedupeKey: lowStockKey,
        });
        continue;
      }

      if (nextStatus === 'out' && next) {
        await this.notificationsService.resolveByDedupeKeys(staffUserIds, [
          lowStockKey,
        ]);
        await this.notificationsService.createForRoles(STAFF_ROLES, {
          type: NotificationType.OUT_OF_STOCK,
          severity: NotificationSeverity.CRITICAL,
          title: `Out of stock: ${next.name}`,
          body: `${next.name} (${next.sku}) no longer has sellable inventory.`,
          metadata: {
            productId: next.id,
            sku: next.sku,
          },
          dedupeKey: outOfStockKey,
        });
      }
    }
  }

  private async reconcileBatchAlerts(
    previousStates: Map<string, BatchAlertState>,
    nextStates: Map<string, BatchAlertState>,
  ) {
    const staffUserIds = await this.getStaffUserIds();

    for (const batchId of new Set([
      ...previousStates.keys(),
      ...nextStates.keys(),
    ])) {
      const previous = previousStates.get(batchId);
      const next = nextStates.get(batchId);
      const previousNearExpiry = previous?.nearExpiry ?? false;
      const nextNearExpiry = next?.nearExpiry ?? false;
      const expiryKey = this.expiryDedupeKey(batchId);

      if (previousNearExpiry === nextNearExpiry) {
        continue;
      }

      if (!nextNearExpiry) {
        await this.notificationsService.resolveByDedupeKeys(staffUserIds, [
          expiryKey,
        ]);
        continue;
      }

      if (!next) {
        continue;
      }

      const daysRemaining = Math.max(0, this.daysUntil(next.expiryDate));
      await this.notificationsService.createForRoles(STAFF_ROLES, {
        type: NotificationType.EXPIRY_WARNING,
        severity: NotificationSeverity.WARNING,
        title: `Expiring soon: ${next.productName}`,
        body: `Batch ${next.batchNumber} expires in ${daysRemaining} day(s) with ${next.quantityOnHand} units on hand.`,
        metadata: {
          batchId: next.id,
          productId: next.productId,
          batchNumber: next.batchNumber,
          expiryDate: next.expiryDate,
          quantityOnHand: next.quantityOnHand,
        },
        dedupeKey: expiryKey,
      });
    }
  }

  private toBatchStateMap(batches: Batch[]) {
    const stateByBatchId = new Map<string, BatchAlertState>();
    const today = toDateOnly(new Date());
    const horizonDays = this.getExpiringSoonDays();

    for (const batch of batches) {
      const nearExpiry =
        batch.quantityOnHand > 0 &&
        batch.expiryDate >= today &&
        this.daysUntil(batch.expiryDate) <= horizonDays;

      stateByBatchId.set(batch.id, {
        id: batch.id,
        productId: batch.productId,
        productName: batch.product?.name ?? 'Unknown Product',
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantityOnHand: batch.quantityOnHand,
        nearExpiry,
      });
    }

    return stateByBatchId;
  }

  private async getStaffUserIds() {
    const users = await this.usersRepository.find({
      where: {
        role: In(STAFF_ROLES),
      },
      select: ['id'],
    });

    return users.map((user) => user.id);
  }

  private getInventoryAudience(reason: InventoryChangeReason) {
    if (
      reason === 'category.created' ||
      reason === 'category.updated' ||
      reason === 'category.deleted' ||
      reason === 'supplier.created' ||
      reason === 'supplier.updated' ||
      reason === 'supplier.deleted'
    ) {
      return STAFF_ROLES;
    }

    return [UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.CUSTOMER];
  }

  private getAnalyticsScopes(reason: InventoryChangeReason) {
    if (
      reason === 'category.created' ||
      reason === 'category.updated' ||
      reason === 'category.deleted' ||
      reason === 'supplier.created' ||
      reason === 'supplier.updated' ||
      reason === 'supplier.deleted'
    ) {
      return ['inventory'] as const;
    }

    if (
      reason === 'purchase.received' ||
      reason === 'sale.completed' ||
      reason === 'return.completed'
    ) {
      return ['inventory', 'catalog', 'purchases', 'sales', 'returns'] as const;
    }

    return ['inventory', 'catalog'] as const;
  }

  private getAnalyticsAudience(scope: AnalyticsRefreshPayload['scope']) {
    if (scope === 'users') {
      return STAFF_ROLES;
    }

    return [UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.CUSTOMER];
  }

  private getLowStockThreshold() {
    const configured = Number(
      this.configService.get<string>('LOW_STOCK_THRESHOLD', '20'),
    );

    if (!Number.isFinite(configured)) {
      return 20;
    }

    return Math.max(1, Math.floor(configured));
  }

  private getExpiringSoonDays() {
    const configured = Number(
      this.configService.get<string>('EXPIRING_SOON_DAYS', '30'),
    );

    if (!Number.isFinite(configured)) {
      return 30;
    }

    return Math.max(7, Math.floor(configured));
  }

  private daysUntil(dateOnly: string) {
    const today = new Date(`${toDateOnly(new Date())}T00:00:00.000Z`);
    const target = new Date(`${dateOnly}T00:00:00.000Z`);
    return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  }

  private lowStockDedupeKey(productId: string) {
    return `inventory:low-stock:${productId}`;
  }

  private outOfStockDedupeKey(productId: string) {
    return `inventory:out-of-stock:${productId}`;
  }

  private expiryDedupeKey(batchId: string) {
    return `inventory:expiring-soon:${batchId}`;
  }
}
