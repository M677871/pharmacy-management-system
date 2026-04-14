import api from '../../../shared/api/axios';
import type { DeliveryDriver, OrderRecord, OrderStatus } from '../types/order.types';

export const ordersService = {
  async listOrders(params?: { status?: OrderStatus; mine?: boolean }) {
    const { data } = await api.get<OrderRecord[]>('/orders', {
      params: {
        status: params?.status,
        mine: params?.mine ? 'true' : undefined,
      },
    });
    return data;
  },

  async getOrder(orderId: string) {
    const { data } = await api.get<OrderRecord>(`/orders/${orderId}`);
    return data;
  },

  async createOrder(payload: {
    items: Array<{
      productId: string;
      quantity: number;
    }>;
    notes?: string;
  }) {
    const { data } = await api.post<OrderRecord>('/orders', payload);
    return data;
  },

  async approveOrder(
    orderId: string,
    payload: {
      deliveryDriverId: string;
      responseMessage?: string;
    },
  ) {
    const { data } = await api.post<OrderRecord>(`/orders/${orderId}/approve`, payload);
    return data;
  },

  async rejectOrder(orderId: string, payload: { reason: string }) {
    const { data } = await api.post<OrderRecord>(`/orders/${orderId}/reject`, payload);
    return data;
  },

  async markLocationShared(orderId: string) {
    const { data } = await api.post<OrderRecord>(`/orders/${orderId}/location-shared`);
    return data;
  },

  async markPaid(orderId: string) {
    const { data } = await api.post<OrderRecord>(`/orders/${orderId}/mark-paid`);
    return data;
  },

  async listDrivers() {
    const { data } = await api.get<DeliveryDriver[]>('/orders/drivers');
    return data;
  },

  async createDriver(payload: {
    name: string;
    phone: string;
    email?: string;
    vehicleDescription?: string;
    notes?: string;
  }) {
    const { data } = await api.post<DeliveryDriver>('/orders/drivers', payload);
    return data;
  },

  async updateDriver(
    driverId: string,
    payload: Partial<{
      name: string;
      phone: string;
      email: string | null;
      vehicleDescription: string | null;
      notes: string | null;
      isActive: boolean;
    }>,
  ) {
    const { data } = await api.patch<DeliveryDriver>(
      `/orders/drivers/${driverId}`,
      payload,
    );
    return data;
  },

  async deleteDriver(driverId: string) {
    const { data } = await api.delete<{ id: string }>(`/orders/drivers/${driverId}`);
    return data;
  },
};
