import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../decimal.transformer';
import { Product } from '../../products/entities/product.entity';
import { PurchaseItem } from '../../purchase-items/entities/purchase-item.entity';
import { SaleItemAllocation } from '../../sale-item-allocations/entities/sale-item-allocation.entity';
import { StockMovement } from '../../stock-movements/entities/stock-movement.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';

@Entity('batches')
@Index(['productId', 'batchNumber', 'expiryDate'], { unique: true })
@Check(`"receivedQuantity" >= 0`)
@Check(`"quantityOnHand" >= 0`)
@Check(`"receivedQuantity" >= "quantityOnHand"`)
export class Batch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.batches, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'uuid', nullable: true })
  supplierId: string | null;

  @ManyToOne(() => Supplier, (supplier) => supplier.batches, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier | null;

  @Column({ type: 'varchar' })
  batchNumber: string;

  @Column({ type: 'date' })
  expiryDate: string;

  @Column({ type: 'int', default: 0 })
  receivedQuantity: number;

  @Column({ type: 'int', default: 0 })
  quantityOnHand: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitCost: number;

  @Column({ type: 'timestamptz' })
  receivedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @OneToMany(() => PurchaseItem, (purchaseItem) => purchaseItem.batch)
  purchaseItems: PurchaseItem[];

  @OneToMany(() => SaleItemAllocation, (allocation) => allocation.batch)
  saleItemAllocations: SaleItemAllocation[];

  @OneToMany(() => StockMovement, (movement) => movement.batch)
  stockMovements: StockMovement[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
