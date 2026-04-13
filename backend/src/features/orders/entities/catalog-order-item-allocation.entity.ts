import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../../inventory/decimal.transformer';
import { Batch } from '../../inventory/batches/entities/batch.entity';
import { CatalogOrderItem } from './catalog-order-item.entity';

@Entity('catalog_order_item_allocations')
@Check(`"quantity" > 0`)
export class CatalogOrderItemAllocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  orderItemId!: string;

  @ManyToOne(() => CatalogOrderItem, (orderItem) => orderItem.allocations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderItemId' })
  orderItem!: CatalogOrderItem;

  @Column({ type: 'uuid' })
  batchId!: string;

  @ManyToOne(() => Batch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batchId' })
  batch!: Batch;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitCost!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
