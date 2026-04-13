import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../../decimal.transformer';
import {
  StockMovementReferenceType,
  StockMovementType,
} from '../../inventory.enums';
import { Batch } from '../../batches/entities/batch.entity';
import { Product } from '../../products/entities/product.entity';
import { PurchaseItem } from '../../purchase-items/entities/purchase-item.entity';
import { Purchase } from '../../purchases/entities/purchase.entity';
import { ReturnItem } from '../../return-items/entities/return-item.entity';
import { SaleReturn } from '../../sale-returns/entities/sale-return.entity';
import { SaleItem } from '../../sale-items/entities/sale-item.entity';
import { Sale } from '../../sales/entities/sale.entity';

@Entity('stock_movements')
@Check(`"quantity" > 0`)
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: StockMovementType,
    enumName: 'stock_movement_type_enum',
  })
  movementType!: StockMovementType;

  @Column({
    type: 'enum',
    enum: StockMovementReferenceType,
    enumName: 'stock_movement_reference_type_enum',
  })
  referenceType!: StockMovementReferenceType;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, (product) => product.stockMovements, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'uuid', nullable: true })
  batchId!: string | null;

  @ManyToOne(() => Batch, (batch) => batch.stockMovements, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'batchId' })
  batch!: Batch | null;

  @Column({ type: 'uuid', nullable: true })
  purchaseId!: string | null;

  @ManyToOne(() => Purchase, (purchase) => purchase.stockMovements, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'purchaseId' })
  purchase!: Purchase | null;

  @Column({ type: 'uuid', nullable: true })
  purchaseItemId!: string | null;

  @ManyToOne(() => PurchaseItem, (purchaseItem) => purchaseItem.stockMovements, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'purchaseItemId' })
  purchaseItem!: PurchaseItem | null;

  @Column({ type: 'uuid', nullable: true })
  saleId!: string | null;

  @ManyToOne(() => Sale, (sale) => sale.stockMovements, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'saleId' })
  sale!: Sale | null;

  @Column({ type: 'uuid', nullable: true })
  saleItemId!: string | null;

  @ManyToOne(() => SaleItem, (saleItem) => saleItem.stockMovements, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'saleItemId' })
  saleItem!: SaleItem | null;

  @Column({ type: 'uuid', nullable: true })
  returnId!: string | null;

  @ManyToOne(() => SaleReturn, (saleReturn) => saleReturn.stockMovements, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'returnId' })
  returnTransaction!: SaleReturn | null;

  @Column({ type: 'uuid', nullable: true })
  returnItemId!: string | null;

  @ManyToOne(() => ReturnItem, (returnItem) => returnItem.stockMovements, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'returnItemId' })
  returnItem!: ReturnItem | null;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  unitCost!: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  unitPrice!: number | null;

  @Column({ type: 'timestamptz' })
  occurredAt!: Date;

  @Column({ type: 'varchar', nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
