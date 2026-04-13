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
import { User } from '../../../users/entities/user.entity';
import { ReturnItem } from '../../return-items/entities/return-item.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { StockMovement } from '../../stock-movements/entities/stock-movement.entity';

@Entity('sale_returns')
export class SaleReturn {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  saleId!: string;

  @ManyToOne(() => Sale, (sale) => sale.returns, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'saleId' })
  sale!: Sale;

  @Column({ type: 'uuid' })
  processedById!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'processedById' })
  processedBy!: User;

  @Column({ type: 'varchar', nullable: true })
  reason!: string | null;

  @Column({ type: 'timestamptz' })
  returnedAt!: Date;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  totalRefund!: number;

  @OneToMany(() => ReturnItem, (returnItem) => returnItem.returnTransaction)
  items!: ReturnItem[];

  @OneToMany(() => StockMovement, (movement) => movement.returnTransaction)
  stockMovements!: StockMovement[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
