// Takeout Order types

export interface CreateOrderRequest {
  businessId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: CreateOrderItemInput[];
  specialNotes?: string;
  pickupTime?: string;       // "HH:mm" format
  source: 'VOICE_AGENT' | 'CHATBOT' | 'WEBSITE' | 'MANUAL';
  voiceCallLogId?: string;
  chatSessionId?: string;
}

export interface CreateOrderItemInput {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface UpdateOrderStatusRequest {
  status: 'RECEIVED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'CANCELLED';
  estimatedReady?: string;   // "HH:mm" format
}

export interface OrderResponse {
  id: string;
  businessId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: OrderItemResponse[];
  specialNotes?: string;
  pickupTime?: string;
  estimatedReady?: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'RECEIVED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'CANCELLED';
  source: 'VOICE_AGENT' | 'CHATBOT' | 'WEBSITE' | 'MANUAL';
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemResponse {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

// Business Tool types

export interface BusinessToolConfig {
  // For TAKEOUT_ORDERS
  taxRate?: number;           // e.g. 0.08 for 8%
  menuItems?: MenuItemConfig[];
  prepTimeMinutes?: number;   // default prep time
  acceptingOrders?: boolean;
  orderNotificationPhone?: string;
  orderNotificationEmail?: string;
}

export interface MenuItemConfig {
  name: string;
  price: number;
  category?: string;
  description?: string;
  available?: boolean;
}

export interface EnableToolRequest {
  businessId: string;
  type: 'TAKEOUT_ORDERS';
  config?: BusinessToolConfig;
}

export interface UpdateToolConfigRequest {
  config: BusinessToolConfig;
}
