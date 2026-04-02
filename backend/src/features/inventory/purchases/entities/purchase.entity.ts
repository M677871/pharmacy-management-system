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
import { PurchaseItem } from '../../purchase-items/entities/purchase-item.entity';
import { StockMovement } from '../../stock-movements/entities/stock-movement.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  supplierId: string;

  @ManyToOne(() => Supplier, (supplier) => supplier.purchases, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @Column({ type: 'uuid' })
  receivedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'receivedById' })
  receivedBy: User;

  @Column({ type: 'varchar', nullable: true })
  invoiceNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamptz' })
  receivedAt: Date;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  totalCost: number;

  @OneToMany(() => PurchaseItem, (purchaseItem) => purchaseItem.purchase)
  items: PurchaseItem[];

  @OneToMany(() => StockMovement, (movement) => movement.purchase)
  stockMovements: StockMovement[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
