import {
  Check,
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
import { Product } from '../../products/entities/product.entity';
import { SaleReturn } from '../../sale-returns/entities/sale-return.entity';
import { SaleItem } from '../../sale-items/entities/sale-item.entity';
import { StockMovement } from '../../stock-movements/entities/stock-movement.entity';

@Entity('return_items')
@Check(`"quantity" > 0`)
export class ReturnItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  returnId!: string;

  @ManyToOne(() => SaleReturn, (saleReturn) => saleReturn.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'returnId' })
  returnTransaction!: SaleReturn;

  @Column({ type: 'uuid' })
  saleItemId!: string;

  @ManyToOne(() => SaleItem, (saleItem) => saleItem.returnItems, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'saleItemId' })
  saleItem!: SaleItem;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, (product) => product.returnItems, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitPrice!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  lineTotal!: number;

  @OneToMany(() => StockMovement, (movement) => movement.returnItem)
  stockMovements!: StockMovement[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
