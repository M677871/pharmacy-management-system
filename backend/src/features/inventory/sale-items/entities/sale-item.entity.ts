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
import { ReturnItem } from '../../return-items/entities/return-item.entity';
import { SaleItemAllocation } from '../../sale-item-allocations/entities/sale-item-allocation.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { StockMovement } from '../../stock-movements/entities/stock-movement.entity';

@Entity('sale_items')
@Check(`"quantity" > 0`)
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  saleId!: string;

  @ManyToOne(() => Sale, (sale) => sale.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'saleId' })
  sale!: Sale;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, (product) => product.saleItems, {
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

  @OneToMany(() => SaleItemAllocation, (allocation) => allocation.saleItem)
  allocations!: SaleItemAllocation[];

  @OneToMany(() => ReturnItem, (returnItem) => returnItem.saleItem)
  returnItems!: ReturnItem[];

  @OneToMany(() => StockMovement, (movement) => movement.saleItem)
  stockMovements!: StockMovement[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
