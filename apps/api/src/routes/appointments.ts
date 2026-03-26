import type { FastifyInstance } from 'fastify';
import { db } from '@embedo/db';
import type { AppointmentStatus } from '@embedo/db';
import { createLogger, NotFoundError } from '@embedo/utils';

const log = createLogger('api:appointments');

export async function appointmentRoutes(app: FastifyInstance): Promise<void> {
  // GET /appointments
  app.get('/appointments', async (request) => {
    const { startDate, endDate, status } = request.query as Record<string, string>;

    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);
    const defaultEnd = new Date(now);
    defaultEnd.setDate(defaultEnd.getDate() + 60);

    const filterStart = startDate ? new Date(startDate) : defaultStart;
    const filterEnd = endDate ? new Date(endDate) : defaultEnd;

    const where = {
      startTime: {
        gte: filterStart,
        lte: filterEnd,
      },
      ...(status ? { status: status as AppointmentStatus } : {}),
    };

    const appointments = await db.appointment.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        business: {
          select: { id: true, name: true },
        },
      },
    });

    return { items: appointments, total: appointments.length };
  });

  // GET /appointments/:id
  app.get('/appointments/:id', async (request) => {
    const { id } = request.params as { id: string };

    const appointment = await db.appointment.findUnique({
      where: { id },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        business: {
          select: { id: true, name: true },
        },
      },
    });

    if (!appointment) throw new NotFoundError('Appointment', id);
    return appointment;
  });

  // PATCH /appointments/:id
  app.patch('/appointments/:id', async (request) => {
    const { id } = request.params as { id: string };
    const { status, notes } = request.body as { status?: string; notes?: string };

    const existing = await db.appointment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Appointment', id);

    const updated = await db.appointment.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status: status as AppointmentStatus } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        business: {
          select: { id: true, name: true },
        },
      },
    });

    log.info({ appointmentId: id, status, notes }, 'Appointment updated');
    return updated;
  });
}
