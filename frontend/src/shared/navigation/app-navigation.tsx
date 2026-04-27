import type { ReactNode } from 'react';
import type { User } from '../../features/auth/types/auth.types';
import {
  CatalogIcon,
  CalendarIcon,
  DashboardIcon,
  DeliveryIcon,
  BellIcon,
  InventoryIcon,
  MessageIcon,
  PurchasesIcon,
  ReportsIcon,
  SalesIcon,
  SettingsIcon,
} from '../components/AppIcons';

export interface NavigationItem {
  label: string;
  to: string;
  icon: ReactNode;
  roles: User['role'][];
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: <DashboardIcon className="nav-icon" />,
    roles: ['admin', 'employee', 'customer'],
  },
  {
    label: 'Messages',
    to: '/messages',
    icon: <MessageIcon className="nav-icon" />,
    roles: ['admin', 'employee', 'customer'],
  },
  {
    label: 'Notifications',
    to: '/notifications',
    icon: <BellIcon className="nav-icon" />,
    roles: ['admin', 'employee', 'customer'],
  },
  {
    label: 'Meetings',
    to: '/meetings',
    icon: <CalendarIcon className="nav-icon" />,
    roles: ['admin', 'employee'],
  },
  {
    label: 'Inventory',
    to: '/inventory',
    icon: <InventoryIcon className="nav-icon" />,
    roles: ['admin', 'employee'],
  },
  {
    label: 'Point of Sale',
    to: '/sales',
    icon: <SalesIcon className="nav-icon" />,
    roles: ['admin', 'employee'],
  },
  {
    label: 'Purchases',
    to: '/purchases',
    icon: <PurchasesIcon className="nav-icon" />,
    roles: ['admin', 'employee'],
  },
  {
    label: 'Reports',
    to: '/reports',
    icon: <ReportsIcon className="nav-icon" />,
    roles: ['admin', 'employee'],
  },
  {
    label: 'Catalog',
    to: '/catalog',
    icon: <CatalogIcon className="nav-icon" />,
    roles: ['customer'],
  },
  {
    label: 'Orders',
    to: '/orders',
    icon: <DeliveryIcon className="nav-icon" />,
    roles: ['admin', 'employee', 'customer'],
  },
  {
    label: 'Settings',
    to: '/settings',
    icon: <SettingsIcon className="nav-icon" />,
    roles: ['admin', 'employee', 'customer'],
  },
];

export function getNavigationForRole(role: User['role']) {
  return navigationItems.filter((item) => item.roles.includes(role));
}
