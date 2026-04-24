import CalSyncButton from './sync-button';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeader, Panel } from '../../../components/ui/primitives';

const API_URL = process.env['API_GATEWAY_URL'] ?? process.env['API_URL'] ?? 'http://localhost:3000';

interface Appointment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  timezone: string | null;
  status: string;
  notes: string | null;
  contact: { id: string; firstName: string | null; lastName: string | null; email: string | null; phone: string | null } | null;
  business: { id: string; name: string } | null;
}

async function getAppointments(startDate: string, endDate: string): Promise<Appointment[]> {
  try {
    const res = await fetch(`${API_URL}/appointments?startDate=${startDate}&endDate=${endDate}`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const data = await res.json() as { items: Appointment[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'SCHEDULED': return 'text-signal';
    case 'COMPLETED': return 'text-paper';
    case 'CANCELLED': return 'text-ember';
    case 'NO_SHOW':   return 'text-amber';
    default:          return 'text-paper-3';
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function contactName(c: { firstName: string | null; lastName: string | null } | null): string {
  if (!c) return 'Unknown';
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';
}

function getDaysInMonth(year: number, month: number): number { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfWeek(year: number, month: number): number { return new Date(year, month, 1).getDay(); }
function isSameDay(d1: Date, d2: Date): boolean { return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate(); }
function isToday(date: Date): boolean { return isSameDay(date, new Date()); }

export default async function CalendarPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month + 2, 0).toISOString();
  const appointments = await getAppointments(startDate, endDate);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const appointmentsByDate: Record<string, Appointment[]> = {};
  for (const apt of appointments) {
    const dateKey = new Date(apt.startTime).toISOString().split('T')[0]!;
    if (!appointmentsByDate[dateKey]) appointmentsByDate[dateKey] = [];
    appointmentsByDate[dateKey]!.push(apt);
  }

  const upcoming = appointments
    .filter((a) => new Date(a.startTime) >= now && a.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 10);

  const todayKey = now.toISOString().split('T')[0]!;
  const todayAppointments = appointmentsByDate[todayKey] ?? [];

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-14">
      {/* Masthead */}
      <section className="pb-10 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
            Chapter 13 · Calendar
          </span>
          <span className="h-px w-16 bg-rule" />
          <span className="font-mono text-[10px] tracking-mega text-paper-3 uppercase">
            {upcoming.length} upcoming
          </span>
        </div>
        <div className="flex items-end justify-between gap-8">
          <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[64px] lg:text-[76px] max-w-3xl">
            {monthName}.
          </h1>
          <CalSyncButton />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <SectionHeader numeral="1" title="The month" />

          <div className="mt-6 panel p-5">
            <div className="grid grid-cols-7 gap-0 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center py-2 font-mono text-[9px] tracking-mega uppercase text-paper-4">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-rule">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[88px] bg-ink-1" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(year, month, day);
                const dateKey = date.toISOString().split('T')[0]!;
                const dayAppts = appointmentsByDate[dateKey] ?? [];
                const today = isToday(date);
                return (
                  <div
                    key={day}
                    className={`min-h-[88px] p-2 transition-colors ${
                      today ? 'bg-signal-soft ring-signal' : dayAppts.length > 0 ? 'bg-ink-2' : 'bg-ink-1'
                    }`}
                  >
                    <span className={`font-mono text-[11px] nums ${
                      today ? 'text-signal font-bold' : dayAppts.length > 0 ? 'text-paper' : 'text-paper-4'
                    }`}>
                      {day}
                    </span>
                    <div className="mt-2 space-y-0.5">
                      {dayAppts.slice(0, 3).map((apt) => (
                        <div
                          key={apt.id}
                          className={`font-mono text-[9px] tracking-micro truncate leading-tight ${
                            apt.status === 'CANCELLED' ? 'text-ember line-through' : 'text-paper-2'
                          }`}
                          title={`${formatTime(apt.startTime)} - ${apt.title} (${contactName(apt.contact)})`}
                        >
                          <span className="text-signal">▸</span> {formatTime(apt.startTime)} {apt.contact?.firstName ?? ''}
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <span className="font-mono text-[9px] text-paper-4">+{dayAppts.length - 3}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-8">
          <Panel title="Today" numeral="2" action={
            <span className="font-mono text-[9px] tracking-mega uppercase text-paper-4">
              {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          }>
            {todayAppointments.length === 0 ? (
              <p className="p-6 text-center font-display italic text-paper-3 text-lg font-light">
                Nothing on today.
              </p>
            ) : (
              <div className="divide-y divide-rule">
                {todayAppointments.map((apt) => (
                  <div key={apt.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-display italic text-paper text-base font-light leading-tight">{apt.title}</p>
                        <p className="font-mono text-[10px] tracking-micro text-paper-3 mt-1 uppercase">
                          {formatTime(apt.startTime)} — {formatTime(apt.endTime)}
                        </p>
                      </div>
                      <span className={`font-mono text-[9px] tracking-mega uppercase shrink-0 ${statusColor(apt.status)}`}>
                        {apt.status}
                      </span>
                    </div>
                    {apt.contact && (
                      <div className="mt-3 flex items-center gap-2 hairline-t pt-3">
                        <div className="w-6 h-6 bg-signal flex items-center justify-center font-display italic text-ink-0 text-[10px]">
                          {contactName(apt.contact)[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-ui text-[12px] text-paper truncate">{contactName(apt.contact)}</p>
                          {apt.contact.email && <p className="font-mono text-[10px] text-paper-4 truncate">{apt.contact.email}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Upcoming" numeral="3">
            {upcoming.length === 0 ? (
              <p className="p-6 text-center font-display italic text-paper-3 text-lg font-light">
                Clear horizon.
              </p>
            ) : (
              <div className="divide-y divide-rule">
                {upcoming.map((apt) => (
                  <div key={apt.id} className="flex items-center gap-4 p-4">
                    <div className="text-center w-12 shrink-0">
                      <p className="font-display italic font-light text-paper text-2xl nums leading-none">
                        {new Date(apt.startTime).getDate()}
                      </p>
                      <p className="font-mono text-[9px] tracking-mega text-paper-4 mt-1 uppercase">
                        {new Date(apt.startTime).toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui text-sm text-paper truncate">{apt.title}</p>
                      <p className="font-mono text-[10px] tracking-micro text-paper-4 uppercase mt-0.5 truncate">
                        {formatTime(apt.startTime)}{apt.contact ? ` · ${contactName(apt.contact)}` : ''}
                      </p>
                    </div>
                    <span className={`font-mono text-[9px] tracking-mega uppercase shrink-0 ${statusColor(apt.status)}`}>
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <a
            href="https://cal.com/jason-marchese-mkfkwl"
            target="_blank"
            rel="noopener noreferrer"
            className="btn w-full justify-between"
          >
            <span>Cal.com dashboard</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      </section>
    </div>
  );
}
