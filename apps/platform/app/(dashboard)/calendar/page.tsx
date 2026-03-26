import Link from 'next/link';

const API_URL = process.env['API_GATEWAY_URL'] ?? process.env['API_URL'] ?? 'http://localhost:3000';

interface Appointment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  timezone: string | null;
  status: string;
  notes: string | null;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  business: {
    id: string;
    name: string;
  } | null;
}

async function getAppointments(startDate: string, endDate: string): Promise<Appointment[]> {
  try {
    const res = await fetch(
      `${API_URL}/appointments?startDate=${startDate}&endDate=${endDate}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const data = await res.json() as { items: Appointment[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'CONFIRMED': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'PENDING': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'CANCELLED': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'COMPLETED': return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
    case 'NO_SHOW': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function contactName(c: { firstName: string | null; lastName: string | null } | null): string {
  if (!c) return 'Unknown';
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown';
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export default async function CalendarPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Fetch 3 months of appointments (prev, current, next)
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month + 2, 0).toISOString();
  const appointments = await getAppointments(startDate, endDate);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Group appointments by date
  const appointmentsByDate: Record<string, Appointment[]> = {};
  for (const apt of appointments) {
    const dateKey = new Date(apt.startTime).toISOString().split('T')[0]!;
    if (!appointmentsByDate[dateKey]) appointmentsByDate[dateKey] = [];
    appointmentsByDate[dateKey]!.push(apt);
  }

  // Upcoming appointments (next 14 days)
  const upcoming = appointments
    .filter((a) => new Date(a.startTime) >= now && a.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 10);

  // Today's appointments
  const todayKey = now.toISOString().split('T')[0]!;
  const todayAppointments = appointmentsByDate[todayKey] ?? [];

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Calendar</h1>
        <p className="text-slate-400 mt-1 text-sm">Manage your Cal.com bookings and meetings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-white/5 rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">{monthName}</h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <span className="text-slate-500">Meeting</span>
              </span>
              <span className="flex items-center gap-1.5 ml-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-500">Confirmed</span>
              </span>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-px">
            {/* Empty cells for days before the 1st */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] bg-white/[0.01] rounded-lg p-1.5" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(year, month, day);
              const dateKey = date.toISOString().split('T')[0]!;
              const dayAppts = appointmentsByDate[dateKey] ?? [];
              const today = isToday(date);

              return (
                <div
                  key={day}
                  className={`min-h-[80px] rounded-lg p-1.5 transition-colors ${
                    today
                      ? 'bg-violet-500/[0.08] border border-violet-500/20'
                      : dayAppts.length > 0
                        ? 'bg-white/[0.03] hover:bg-white/[0.05]'
                        : 'bg-white/[0.01] hover:bg-white/[0.02]'
                  }`}
                >
                  <span className={`text-xs font-medium ${
                    today ? 'text-violet-400' : dayAppts.length > 0 ? 'text-white' : 'text-slate-600'
                  }`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayAppts.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        className={`text-[9px] px-1 py-0.5 rounded truncate ${
                          apt.status === 'CONFIRMED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : apt.status === 'CANCELLED'
                              ? 'bg-red-500/15 text-red-400 line-through'
                              : 'bg-violet-500/20 text-violet-300'
                        }`}
                        title={`${formatTime(apt.startTime)} - ${apt.title} (${contactName(apt.contact)})`}
                      >
                        {formatTime(apt.startTime)} {apt.contact?.firstName ?? ''}
                      </div>
                    ))}
                    {dayAppts.length > 3 && (
                      <span className="text-[9px] text-slate-600">+{dayAppts.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel — today + upcoming */}
        <div className="space-y-6">
          {/* Today */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Today</h3>
            <p className="text-[10px] text-slate-600 mb-4">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-6">No meetings today</p>
            ) : (
              <div className="space-y-3">
                {todayAppointments.map((apt) => (
                  <div key={apt.id} className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.06]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{apt.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                        </p>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${statusColor(apt.status)}`}>
                        {apt.status}
                      </span>
                    </div>
                    {apt.contact && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0">
                          {contactName(apt.contact)[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-300 truncate">{contactName(apt.contact)}</p>
                          <p className="text-[10px] text-slate-600 truncate">{apt.contact.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Upcoming</h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-6">No upcoming meetings</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((apt) => (
                  <div key={apt.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                    <div className="flex-shrink-0 text-center w-10">
                      <p className="text-lg font-bold text-white leading-none">
                        {new Date(apt.startTime).getDate()}
                      </p>
                      <p className="text-[9px] text-slate-500 uppercase">
                        {new Date(apt.startTime).toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-300 truncate">{apt.title}</p>
                      <p className="text-[10px] text-slate-600">
                        {formatTime(apt.startTime)} {apt.contact ? `with ${contactName(apt.contact)}` : ''}
                      </p>
                    </div>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${statusColor(apt.status)}`}>
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick link to Cal.com */}
          <a
            href="https://cal.com/jason-marchese-mkfkwl"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-3 rounded-xl bg-violet-600/20 border border-violet-500/20 text-sm font-medium text-violet-300 hover:bg-violet-600/30 hover:border-violet-500/30 transition-colors"
          >
            Open Cal.com Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
