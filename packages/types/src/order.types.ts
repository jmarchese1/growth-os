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

export type ToolTypeValue =
  | 'TAKEOUT_ORDERS'
  | 'WAITLIST'
  | 'DAILY_SPECIALS'
  | 'CATERING_REQUESTS'
  | 'REVIEW_RESPONSE'
  | 'FEEDBACK_COLLECTION'
  | 'PROMO_ALERTS'
  | 'TABLE_TURNOVER'
  | 'DELIVERY_TRACKING'
  | 'GIFT_CARD_LOYALTY'
  // Salon
  | 'SALON_AVAILABILITY'
  | 'SALON_WAITLIST'
  | 'CLIENT_NOTES'
  // Fitness
  | 'CLASS_ROSTER'
  | 'FACILITY_STATUS'
  | 'SESSION_PACKAGES'
  // Retail
  | 'LIVE_INVENTORY'
  | 'ORDER_STATUS'
  | 'PRICE_PROMO'
  // Medical
  | 'PROVIDER_SCHEDULE'
  | 'MEDICAL_WAITLIST'
  | 'VISIT_PREP';

export interface MenuItemConfig {
  name: string;
  price: number;
  category?: string;
  description?: string;
  available?: boolean;
}

export interface EnableToolRequest {
  businessId: string;
  type: ToolTypeValue;
  config?: Record<string, unknown>;
}

export interface UpdateToolConfigRequest {
  config: Record<string, unknown>;
}

// ─── Waitlist types ───────────────────────────────────────────────────────────

export interface CreateWaitlistEntryRequest {
  businessId: string;
  guestName: string;
  guestPhone?: string;
  partySize: number;
  notes?: string;
  source: 'VOICE_AGENT' | 'CHATBOT' | 'WEBSITE' | 'MANUAL';
}

export interface UpdateWaitlistEntryRequest {
  status: 'WAITING' | 'NOTIFIED' | 'SEATED' | 'NO_SHOW' | 'CANCELLED';
}

// ─── Catering types ───────────────────────────────────────────────────────────

export interface CreateCateringInquiryRequest {
  businessId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  eventDate?: string;
  eventTime?: string;
  eventType?: string;
  headcount: number;
  budget?: number;
  location?: string;
  dietaryNotes?: string;
  menuRequests?: string;
  notes?: string;
  source: 'VOICE_AGENT' | 'CHATBOT' | 'WEBSITE' | 'MANUAL';
  voiceCallLogId?: string;
  chatSessionId?: string;
}

export interface UpdateCateringStatusRequest {
  status: 'NEW' | 'CONTACTED' | 'QUOTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  quotedAmount?: number;
  quoteNotes?: string;
}

// ─── Feedback types ───────────────────────────────────────────────────────────

export interface CreateFeedbackRequest {
  businessId: string;
  customerName?: string;
  customerPhone?: string;
  contactId?: string;
  triggerType?: string;
  triggerId?: string;
  rating?: 'TERRIBLE' | 'POOR' | 'OKAY' | 'GOOD' | 'EXCELLENT';
  comment?: string;
}

export interface RespondToFeedbackRequest {
  responseText: string;
}

// ─── Table Turnover types ─────────────────────────────────────────────────────

export interface CreateTableRequest {
  businessId: string;
  tableNumber: string;
  tableCapacity?: number;
}

export interface SeatTableRequest {
  partySize: number;
  guestName?: string;
  estimatedMinutes?: number;
}

export interface UpdateTableStatusRequest {
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
}

// ─── Gift Card types ──────────────────────────────────────────────────────────

export interface CreateGiftCardRequest {
  businessId: string;
  amount: number;
  purchaserName?: string;
  purchaserEmail?: string;
  purchaserPhone?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  personalMessage?: string;
  expiresAt?: string;
  source: 'VOICE_AGENT' | 'CHATBOT' | 'WEBSITE' | 'MANUAL';
}

export interface RedeemGiftCardRequest {
  amount: number;
}
