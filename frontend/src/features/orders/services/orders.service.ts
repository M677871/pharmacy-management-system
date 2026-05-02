import { gql, graphqlMutation, graphqlQuery } from '../../../shared/api/graphql';
import type { DeliveryDriver, OrderRecord, OrderStatus } from '../types/order.types';

const ORDERS = gql`
  query Orders($input: JSONObject) {
    orders(input: $input)
  }
`;
const ORDER = gql`
  query Order($orderId: ID!) {
    order(orderId: $orderId)
  }
`;
const CREATE_ORDER = gql`
  mutation CreateOrder($input: JSONObject!) {
    createOrder(input: $input)
  }
`;
const APPROVE_ORDER = gql`
  mutation ApproveOrder($orderId: ID!, $input: JSONObject!) {
    approveOrder(orderId: $orderId, input: $input)
  }
`;
const REJECT_ORDER = gql`
  mutation RejectOrder($orderId: ID!, $input: JSONObject!) {
    rejectOrder(orderId: $orderId, input: $input)
  }
`;
const MARK_ORDER_LOCATION_SHARED = gql`
  mutation MarkOrderLocationShared($orderId: ID!) {
    markOrderLocationShared(orderId: $orderId)
  }
`;
const MARK_ORDER_PAID = gql`
  mutation MarkOrderPaid($orderId: ID!) {
    markOrderPaid(orderId: $orderId)
  }
`;
const DELIVERY_DRIVERS = gql`
  query DeliveryDrivers {
    deliveryDrivers
  }
`;
const CREATE_DELIVERY_DRIVER = gql`
  mutation CreateDeliveryDriver($input: JSONObject!) {
    createDeliveryDriver(input: $input)
  }
`;
const UPDATE_DELIVERY_DRIVER = gql`
  mutation UpdateDeliveryDriver($driverId: ID!, $input: JSONObject!) {
    updateDeliveryDriver(driverId: $driverId, input: $input)
  }
`;
const DELETE_DELIVERY_DRIVER = gql`
  mutation DeleteDeliveryDriver($driverId: ID!) {
    deleteDeliveryDriver(driverId: $driverId)
  }
`;

export const ordersService = {
  async listOrders(params?: { status?: OrderStatus; mine?: boolean }) {
    const input = {
      status: params?.status,
      mine: params?.mine || undefined,
    };
    const result = await graphqlQuery<
      { orders: OrderRecord[] },
      { input: typeof input }
    >(ORDERS, { input });
    return result.orders;
  },

  async getOrder(orderId: string) {
    const result = await graphqlQuery<
      { order: OrderRecord },
      { orderId: string }
    >(ORDER, { orderId });
    return result.order;
  },

  async createOrder(payload: {
    items: Array<{
      productId: string;
      quantity: number;
    }>;
    notes?: string;
  }) {
    const result = await graphqlMutation<
      { createOrder: OrderRecord },
      { input: typeof payload }
    >(CREATE_ORDER, { input: payload });
    return result.createOrder;
  },

  async approveOrder(
    orderId: string,
    payload: {
      deliveryDriverId: string;
      responseMessage?: string;
    },
  ) {
    const result = await graphqlMutation<
      { approveOrder: OrderRecord },
      { orderId: string; input: typeof payload }
    >(APPROVE_ORDER, { orderId, input: payload });
    return result.approveOrder;
  },

  async rejectOrder(orderId: string, payload: { reason: string }) {
    const result = await graphqlMutation<
      { rejectOrder: OrderRecord },
      { orderId: string; input: typeof payload }
    >(REJECT_ORDER, { orderId, input: payload });
    return result.rejectOrder;
  },

  async markLocationShared(orderId: string) {
    const result = await graphqlMutation<
      { markOrderLocationShared: OrderRecord },
      { orderId: string }
    >(MARK_ORDER_LOCATION_SHARED, { orderId });
    return result.markOrderLocationShared;
  },

  async markPaid(orderId: string) {
    const result = await graphqlMutation<
      { markOrderPaid: OrderRecord },
      { orderId: string }
    >(MARK_ORDER_PAID, { orderId });
    return result.markOrderPaid;
  },

  async listDrivers() {
    const result = await graphqlQuery<{ deliveryDrivers: DeliveryDriver[] }>(
      DELIVERY_DRIVERS,
    );
    return result.deliveryDrivers;
  },

  async createDriver(payload: {
    name: string;
    phone: string;
    email?: string;
    vehicleDescription?: string;
    notes?: string;
  }) {
    const result = await graphqlMutation<
      { createDeliveryDriver: DeliveryDriver },
      { input: typeof payload }
    >(CREATE_DELIVERY_DRIVER, { input: payload });
    return result.createDeliveryDriver;
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
    const result = await graphqlMutation<
      { updateDeliveryDriver: DeliveryDriver },
      { driverId: string; input: typeof payload }
    >(UPDATE_DELIVERY_DRIVER, { driverId, input: payload });
    return result.updateDeliveryDriver;
  },

  async deleteDriver(driverId: string) {
    const result = await graphqlMutation<
      { deleteDeliveryDriver: { id: string } },
      { driverId: string }
    >(DELETE_DELIVERY_DRIVER, { driverId });
    return result.deleteDeliveryDriver;
  },
};
