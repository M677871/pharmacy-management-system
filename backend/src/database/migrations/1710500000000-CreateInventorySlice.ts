import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventorySlice1710500000000
  implements MigrationInterface
{
  name = 'CreateInventorySlice1710500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
          CREATE TYPE "users_role_enum" AS ENUM ('admin', 'employee', 'customer');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type_enum') THEN
          CREATE TYPE "stock_movement_type_enum" AS ENUM ('stock_in', 'stock_out');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_reference_type_enum') THEN
          CREATE TYPE "stock_movement_reference_type_enum" AS ENUM ('purchase', 'sale', 'return');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "password" character varying,
        "firstName" character varying NOT NULL DEFAULT '',
        "lastName" character varying NOT NULL DEFAULT '',
        "role" "users_role_enum" NOT NULL DEFAULT 'customer',
        "isEmailVerified" boolean NOT NULL DEFAULT false,
        "totpSecret" character varying,
        "isTotpEnabled" boolean NOT NULL DEFAULT false,
        "refreshToken" character varying,
        "passwordResetToken" character varying,
        "passwordResetExpires" TIMESTAMP WITH TIME ZONE,
        "googleId" character varying,
        "facebookId" character varying,
        "instagramId" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "description" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_categories_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_categories_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "suppliers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "contactName" character varying,
        "email" character varying,
        "phone" character varying,
        "address" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_suppliers_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_suppliers_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sku" character varying NOT NULL,
        "name" character varying NOT NULL,
        "barcode" character varying,
        "description" character varying,
        "unit" character varying NOT NULL DEFAULT 'unit',
        "salePrice" numeric(12, 2) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "categoryId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_products_sku" UNIQUE ("sku"),
        CONSTRAINT "UQ_products_barcode" UNIQUE ("barcode"),
        CONSTRAINT "FK_products_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "batches" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "productId" uuid NOT NULL,
        "supplierId" uuid,
        "batchNumber" character varying NOT NULL,
        "expiryDate" date NOT NULL,
        "receivedQuantity" integer NOT NULL DEFAULT 0,
        "quantityOnHand" integer NOT NULL DEFAULT 0,
        "unitCost" numeric(12, 2) NOT NULL,
        "receivedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "notes" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_batches_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_batches_received_quantity_non_negative" CHECK ("receivedQuantity" >= 0),
        CONSTRAINT "CHK_batches_quantity_on_hand_non_negative" CHECK ("quantityOnHand" >= 0),
        CONSTRAINT "CHK_batches_received_ge_on_hand" CHECK ("receivedQuantity" >= "quantityOnHand"),
        CONSTRAINT "FK_batches_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_batches_supplier" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_batches_product_batch_expiry"
      ON "batches" ("productId", "batchNumber", "expiryDate")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchases" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "supplierId" uuid NOT NULL,
        "receivedById" uuid NOT NULL,
        "invoiceNumber" character varying,
        "notes" character varying,
        "receivedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "totalCost" numeric(12, 2) NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchases_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_purchases_supplier" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchases_user" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchase_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "purchaseId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "batchId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unitCost" numeric(12, 2) NOT NULL,
        "lineTotal" numeric(12, 2) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_purchase_items_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "FK_purchase_items_purchase" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_purchase_items_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchase_items_batch" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "soldById" uuid NOT NULL,
        "notes" character varying,
        "soldAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "totalAmount" numeric(12, 2) NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sales_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sales_user" FOREIGN KEY ("soldById") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sale_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "saleId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unitPrice" numeric(12, 2) NOT NULL,
        "lineTotal" numeric(12, 2) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sale_items_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "FK_sale_items_sale" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sale_items_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sale_item_allocations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "saleItemId" uuid NOT NULL,
        "batchId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unitCost" numeric(12, 2) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_item_allocations_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sale_item_allocations_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "FK_sale_item_allocations_item" FOREIGN KEY ("saleItemId") REFERENCES "sale_items"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sale_item_allocations_batch" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sale_returns" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "saleId" uuid NOT NULL,
        "processedById" uuid NOT NULL,
        "reason" character varying,
        "returnedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "totalRefund" numeric(12, 2) NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_returns_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sale_returns_sale" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_sale_returns_user" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "return_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "returnId" uuid NOT NULL,
        "saleItemId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unitPrice" numeric(12, 2) NOT NULL,
        "lineTotal" numeric(12, 2) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_return_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_return_items_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "FK_return_items_return" FOREIGN KEY ("returnId") REFERENCES "sale_returns"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_return_items_sale_item" FOREIGN KEY ("saleItemId") REFERENCES "sale_items"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_return_items_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_movements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "movementType" "stock_movement_type_enum" NOT NULL,
        "referenceType" "stock_movement_reference_type_enum" NOT NULL,
        "productId" uuid NOT NULL,
        "batchId" uuid,
        "purchaseId" uuid,
        "purchaseItemId" uuid,
        "saleId" uuid,
        "saleItemId" uuid,
        "returnId" uuid,
        "returnItemId" uuid,
        "quantity" integer NOT NULL,
        "unitCost" numeric(12, 2),
        "unitPrice" numeric(12, 2),
        "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "note" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_movements_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_stock_movements_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "FK_stock_movements_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_stock_movements_batch" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_stock_movements_purchase" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_stock_movements_purchase_item" FOREIGN KEY ("purchaseItemId") REFERENCES "purchase_items"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_stock_movements_sale" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_stock_movements_sale_item" FOREIGN KEY ("saleItemId") REFERENCES "sale_items"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_stock_movements_return" FOREIGN KEY ("returnId") REFERENCES "sale_returns"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_stock_movements_return_item" FOREIGN KEY ("returnItemId") REFERENCES "return_items"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_batches_product" ON "batches" ("productId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_batches_expiry" ON "batches" ("expiryDate")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_purchase_items_purchase" ON "purchase_items" ("purchaseId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sale_items_sale" ON "sale_items" ("saleId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_return_items_sale_item" ON "return_items" ("saleItemId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stock_movements_product" ON "stock_movements" ("productId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stock_movements_batch" ON "stock_movements" ("batchId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stock_movements_sale_item" ON "stock_movements" ("saleItemId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_movements" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "return_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sale_returns" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sale_item_allocations" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sale_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchases" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "batches" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "suppliers" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "stock_movement_reference_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "stock_movement_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}
