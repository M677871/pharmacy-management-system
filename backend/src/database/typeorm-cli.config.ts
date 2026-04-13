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

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT || 5432),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'pharmacy',
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
  ],
  migrations: [path.join(__dirname, 'migrations', '*.{js,ts}')],
});
