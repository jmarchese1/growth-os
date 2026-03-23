// Reservation & OpenTable integration types

export interface CreateReservationRequest {
  businessId: string;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  partySize: number;
  date: string;        // ISO date string
  time: string;        // "HH:mm" format
  timezone?: string;
  specialRequests?: string;
  source: 'VOICE_AGENT' | 'CHATBOT' | 'MANUAL' | 'WEBSITE';
  voiceCallLogId?: string;
  chatSessionId?: string;
}

export interface ReservationResponse {
  id: string;
  businessId: string;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  partySize: number;
  date: string;
  time: string;
  timezone?: string;
  specialRequests?: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  source: 'VOICE_AGENT' | 'CHATBOT' | 'MANUAL' | 'WEBSITE';
  openTableConfirmation?: string;
  createdAt: string;
}

export interface OpenTableConfig {
  restaurantId: string;
  apiKey?: string;        // Will be set once partner API access is granted
  enabled: boolean;
}

export interface OpenTableAvailabilityRequest {
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
}

export interface OpenTableAvailabilitySlot {
  time: string;
  available: boolean;
}

export interface OpenTableBookingRequest {
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  specialRequests?: string;
}

export interface OpenTableBookingResponse {
  confirmationNumber: string;
  restaurantName: string;
  date: string;
  time: string;
  partySize: number;
}
