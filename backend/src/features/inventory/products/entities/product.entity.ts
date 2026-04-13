import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../decimal.transformer';
import { Batch } from '../../batches/entities/batch.entity';
import { Category } from '../../categories/entities/category.entity';
import { PurchaseItem } from '../../purchase-items/entities/purchase-item.entity';
import { ReturnItem } from '../../return-items/entities/return-item.entity';
import { SaleItem } from '../../sale-items/entities/sale-item.entity';
import { StockMovement } from '../../stock-movements/entities/stock-movement.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  sku!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  barcode!: string | null;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', default: 'unit' })
  unit!: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  salePrice!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => Category, (category) => category.products, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoryId' })
  category!: Category | null;

  @OneToMany(() => Batch, (batch) => batch.product)
  batches!: Batch[];

  @OneToMany(() => PurchaseItem, (purchaseItem) => purchaseItem.product)
  purchaseItems!: PurchaseItem[];

  @OneToMany(() => SaleItem, (saleItem) => saleItem.product)
  saleItems!: SaleItem[];

  @OneToMany(() => ReturnItem, (returnItem) => returnItem.product)
  returnItems!: ReturnItem[];

  @OneToMany(() => StockMovement, (movement) => movement.product)
  stockMovements!: StockMovement[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
