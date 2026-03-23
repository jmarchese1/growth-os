import { createLogger } from '@embedo/utils';

const logger = createLogger('opentable');

/**
 * OpenTable API Integration
 *
 * Status: STUB — waiting for partner API approval from dev.opentable.com
 * Once approved, replace these stubs with real API calls.
 *
 * Apply for access: https://dev.opentable.com
 * Docs: https://docs.opentable.com
 */

export async function checkAvailability(params: {
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
}): Promise<{ available: boolean; slots: Array<{ time: string; available: boolean }> }> {
  logger.info({ ...params }, 'Checking OpenTable availability (STUB)');

  // TODO: Replace with real OpenTable API call
  // const response = await fetch(`https://api.opentable.com/v2/availability`, {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify(params),
  // });

  // Return mock availability for now
  const requestedHour = parseInt(params.time.split(':')[0] ?? '12');
  const slots: Array<{ time: string; available: boolean }> = [];
  for (let i = -2; i <= 2; i++) {
    const hour = requestedHour + i;
    if (hour >= 11 && hour <= 21) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        available: true,
      });
    }
  }

  return {
    available: true,
    slots,
  };
}

export async function bookReservation(params: {
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  specialRequests?: string;
}): Promise<{ confirmationNumber: string; status: string }> {
  logger.info(
    { restaurantId: params.restaurantId, date: params.date, time: params.time, partySize: params.partySize },
    'Booking OpenTable reservation (STUB)',
  );

  // TODO: Replace with real OpenTable API call
  // const response = await fetch(`https://api.opentable.com/v2/reservations`, {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify(params),
  // });

  // Generate a mock confirmation number
  const confirmationNumber = `OT-${Date.now().toString(36).toUpperCase()}`;

  return {
    confirmationNumber,
    status: 'CONFIRMED',
  };
}

export async function cancelReservation(confirmationNumber: string): Promise<{ success: boolean }> {
  logger.info({ confirmationNumber }, 'Cancelling OpenTable reservation (STUB)');

  // TODO: Replace with real OpenTable API call

  return { success: true };
}
