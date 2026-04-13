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
import { SaleItem } from '../../sale-items/entities/sale-item.entity';
import { SaleReturn } from '../../sale-returns/entities/sale-return.entity';
import { StockMovement } from '../../stock-movements/entities/stock-movement.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  soldById!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'soldById' })
  soldBy!: User;

  @Column({ type: 'varchar', nullable: true })
  notes!: string | null;

  @Column({ type: 'timestamptz' })
  soldAt!: Date;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  totalAmount!: number;

  @OneToMany(() => SaleItem, (saleItem) => saleItem.sale)
  items!: SaleItem[];

  @OneToMany(() => SaleReturn, (saleReturn) => saleReturn.sale)
  returns!: SaleReturn[];

  @OneToMany(() => StockMovement, (movement) => movement.sale)
  stockMovements!: StockMovement[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
