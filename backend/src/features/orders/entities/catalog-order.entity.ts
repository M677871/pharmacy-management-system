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
import { decimalTransformer } from '../../inventory/decimal.transformer';
import { Sale } from '../../inventory/sales/entities/sale.entity';
import { User } from '../../users/entities/user.entity';
import { DeliveryDriver } from './delivery-driver.entity';
import { CatalogOrderItem } from './catalog-order-item.entity';

export enum OrderStatus {
  PENDING_ASSIGNMENT = 'pending_assignment',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

export enum CatalogOrderPaymentMethod {
  CASH = 'cash',
}

@Entity('catalog_orders')
export class CatalogOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  orderNumber!: string;

  @Column({ type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clientId' })
  client!: User;

  @Column({ type: 'uuid', nullable: true })
  assignedEmployeeId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedEmployeeId' })
  assignedEmployee!: User | null;

  @Column({ type: 'uuid', nullable: true })
  deliveryDriverId!: string | null;

  @ManyToOne(() => DeliveryDriver, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deliveryDriverId' })
  deliveryDriver!: DeliveryDriver | null;

  @Column({ type: 'uuid', nullable: true })
  saleId!: string | null;

  @ManyToOne(() => Sale, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'saleId' })
  sale!: Sale | null;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING_ASSIGNMENT,
  })
  status!: OrderStatus;

  @Column({ type: 'varchar', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', nullable: true })
  approvalMessage!: string | null;

  @Column({ type: 'varchar', nullable: true })
  rejectionReason!: string | null;

  @Column({
    type: 'enum',
    enum: CatalogOrderPaymentMethod,
    nullable: true,
  })
  paymentMethod!: CatalogOrderPaymentMethod | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  totalAmount!: number;

  @Column({ type: 'timestamptz', nullable: true })
  assignedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  locationSharedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @OneToMany(() => CatalogOrderItem, (item) => item.order)
  items!: CatalogOrderItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
