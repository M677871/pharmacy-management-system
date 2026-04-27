import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { User } from '../features/users/entities/user.entity';
import { Batch } from '../features/inventory/batches/entities/batch.entity';
import { Category } from '../features/inventory/categories/entities/category.entity';
import { Product } from '../features/inventory/products/entities/product.entity';
import { PurchaseItem } from '../features/inventory/purchase-items/entities/purchase-item.entity';
import { Purchase } from '../features/inventory/purchases/entities/purchase.entity';
import { ReturnItem } from '../features/inventory/return-items/entities/return-item.entity';
import { SaleItemAllocation } from '../features/inventory/sale-item-allocations/entities/sale-item-allocation.entity';
import { SaleItem } from '../features/inventory/sale-items/entities/sale-item.entity';
import { SaleReturn } from '../features/inventory/sale-returns/entities/sale-return.entity';
import { Sale } from '../features/inventory/sales/entities/sale.entity';
import { StockMovement } from '../features/inventory/stock-movements/entities/stock-movement.entity';
import { BroadcastMessage } from '../features/messaging/entities/broadcast-message.entity';
import { ChatMessage } from '../features/messaging/entities/chat-message.entity';
import { Notification } from '../features/notifications/entities/notification.entity';
import { Supplier } from '../features/inventory/suppliers/entities/supplier.entity';
import { CatalogOrder } from '../features/orders/entities/catalog-order.entity';
import { CatalogOrderItem } from '../features/orders/entities/catalog-order-item.entity';
import { CatalogOrderItemAllocation } from '../features/orders/entities/catalog-order-item-allocation.entity';
import { DeliveryDriver } from '../features/orders/entities/delivery-driver.entity';
import { CallParticipant } from '../features/calls/entities/call-participant.entity';
import { CallRecording } from '../features/calls/entities/call-recording.entity';
import { CallSession } from '../features/calls/entities/call-session.entity';
import { TranscriptSegment } from '../features/media/entities/transcript-segment.entity';
import { Meeting } from '../features/meetings/entities/meeting.entity';
import { MeetingNote } from '../features/meetings/entities/meeting-note.entity';
import { MeetingParticipant } from '../features/meetings/entities/meeting-participant.entity';
import { MeetingRecording } from '../features/meetings/entities/meeting-recording.entity';

function loadEnvFile() {
  const envFileName = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
  const envPath = path.resolve(process.cwd(), envFileName);

  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

function requireEnv(key: string) {
  const value = process.env[key];

  if (!value?.trim()) {
    throw new Error(`${key} environment variable is required.`);
  }

  return value.trim();
}

function requireEnvNumber(key: string) {
  const value = Number(requireEnv(key));

  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be a valid number.`);
  }

  return value;
}

export default new DataSource({
  type: 'postgres',
  host: requireEnv('DATABASE_HOST'),
  port: requireEnvNumber('DATABASE_PORT'),
  username: requireEnv('DATABASE_USER'),
  password: requireEnv('DATABASE_PASSWORD'),
  database: requireEnv('DATABASE_NAME'),
  synchronize: false,
  entities: [
    User,
    Category,
    Supplier,
    Product,
    Batch,
    Purchase,
    PurchaseItem,
    Sale,
    SaleItem,
    SaleItemAllocation,
    SaleReturn,
    ReturnItem,
    StockMovement,
    Notification,
    ChatMessage,
    BroadcastMessage,
    DeliveryDriver,
    CatalogOrder,
    CatalogOrderItem,
    CatalogOrderItemAllocation,
    CallSession,
    CallParticipant,
    CallRecording,
    TranscriptSegment,
    Meeting,
    MeetingParticipant,
    MeetingNote,
    MeetingRecording,
  ],
  migrations: [path.join(__dirname, 'migrations', '*.{js,ts}')],
});
