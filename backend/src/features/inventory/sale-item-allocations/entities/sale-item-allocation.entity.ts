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
import { Batch } from '../../batches/entities/batch.entity';
import { SaleItem } from '../../sale-items/entities/sale-item.entity';

@Entity('sale_item_allocations')
@Check(`"quantity" > 0`)
export class SaleItemAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  saleItemId: string;

  @ManyToOne(() => SaleItem, (saleItem) => saleItem.allocations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'saleItemId' })
  saleItem: SaleItem;

  @Column({ type: 'uuid' })
  batchId: string;

  @ManyToOne(() => Batch, (batch) => batch.saleItemAllocations, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'batchId' })
  batch: Batch;

  @Column({ type: 'int' })
  quantity: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitCost: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
