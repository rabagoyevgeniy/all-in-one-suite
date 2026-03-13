import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Users,
  Clock,
  MapPin,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Status config ───
const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-primary/15 text-primary border-primary/30',
  in_progress: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled_client: 'bg-destructive/15 text-destructive border-destructive/30',
  cancelled_coach: 'bg-destructive/15 text-destructive border-destructive/30',
  no_show: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
};

const STATUS_DOTS: Record<string, string> = {
  confirmed: 'bg-primary',
  in_progress: 'bg-emerald-500',
  completed: 'bg-muted-foreground',
  cancelled_client: 'bg-destructive',
  cancelled_coach: 'bg-destructive',
  no_show: 'bg-amber-500',
};

type ViewMode = 'calendar' | 'list';
type CalendarView = 'month' | 'week';

interface BookingRow {
  id: string;
  status: string;
  lesson_fee: number | null;
  currency: string | null;
  created_at: string;
  booking_type: string | null;
  coach_id: string | null;
  student: { profiles: { full_name: string } | null } | null;
  coach: { profiles: { full_name: string } | null } | null;
  pool: { name: string } | null;
  time_slots: { date: string; start_time: string; end_time: string } | null;
}

// ─── Hook ───
function useBookings() {
  return useQuery({
    queryKey: ['admin-bookings-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, status, lesson_fee, currency, created_at, booking_type, coach_id,
          student:students!bookings_student_id_fkey(
            profiles!students_id_fkey(full_name)
          ),
          coach:coaches!bookings_coach_id_fkey(
            profiles!coaches_id_fkey(full_name)
          ),
          pool:pools(name),
          time_slots(date, start_time, end_time)
        `)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as BookingRow[];
    },
  });
}

// ─── Helpers ───
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const nd = new Date(d);
    nd.setDate(d.getDate() + i);
    return nd;
  });
}

// ─── Component ───
export default function AdminBookings() {
  const { data: bookings, isLoading } = useBookings();
  const { t } = useLanguage();

  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const map: Record<string, BookingRow[]> = {};
    bookings?.forEach(b => {
      const date = (b.time_slots as unknown as { date: string })?.date
        || b.created_at?.split('T')[0]
        || '';
      if (!map[date]) map[date] = [];
      map[date].push(b);
    });
    return map;
  }, [bookings]);

  // Filtered bookings for list view
  const filteredBookings = useMemo(() => {
    let list = bookings || [];
    if (statusFilter) list = list.filter(b => b.status === statusFilter);
    if (selectedDate) {
      list = list.filter(b => {
        const date = (b.time_slots as unknown as { date: string })?.date || b.created_at?.split('T')[0];
        return date === selectedDate;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b =>
        (b.student?.profiles?.full_name || '').toLowerCase().includes(q) ||
        (b.coach?.profiles?.full_name || '').toLowerCase().includes(q) ||
        (b.pool?.name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [bookings, statusFilter, selectedDate, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const all = bookings || [];
    return {
      total: all.length,
      confirmed: all.filter(b => b.status === 'confirmed').length,
      inProgress: all.filter(b => b.status === 'in_progress').length,
      completed: all.filter(b => b.status === 'completed').length,
      cancelled: all.filter(b => b.status?.startsWith('cancelled')).length,
    };
  }, [bookings]);

  // Calendar navigation
  const navigateMonth = (dir: number) => {
    const d = new Date(currentDate);
    if (calendarView === 'month') {
      d.setMonth(d.getMonth() + dir);
    } else {
      d.setDate(d.getDate() + dir * 7);
    }
    setCurrentDate(d);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = formatDate(new Date());

  const weekDates = getWeekDates(currentDate);
  const dayLabels = [
    t('Mon', 'Пн'), t('Tue', 'Вт'), t('Wed', 'Ср'),
    t('Thu', 'Чт'), t('Fri', 'Пт'), t('Sat', 'Сб'), t('Sun', 'Вс'),
  ];

  const monthNames = [
    t('January', 'Январь'), t('February', 'Февраль'), t('March', 'Март'),
    t('April', 'Апрель'), t('May', 'Май'), t('June', 'Июнь'),
    t('July', 'Июль'), t('August', 'Август'), t('September', 'Сентябрь'),
    t('October', 'Октябрь'), t('November', 'Ноябрь'), t('December', 'Декабрь'),
  ];

  return (
    <div className="px-4 py-4 space-y-4 pb-28">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          title={t('Bookings', 'Бронирования')}
          subtitle={`${stats.total} ${t('total', 'всего')}`}
          backRoute="/admin"
        />
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: t('Confirmed', 'Подтв.'), value: stats.confirmed, color: 'text-primary' },
          { label: t('Active', 'Активн.'), value: stats.inProgress, color: 'text-emerald-600' },
          { label: t('Done', 'Завершено'), value: stats.completed, color: 'text-muted-foreground' },
          { label: t('Cancelled', 'Отменено'), value: stats.cancelled, color: 'text-destructive' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-2.5 text-center">
            <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* View toggle */}
        <div className="flex bg-muted/50 rounded-xl p-0.5">
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1',
              viewMode === 'calendar' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
            )}
          >
            <CalendarIcon size={12} /> {t('Calendar', 'Календарь')}
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1',
              viewMode === 'list' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
            )}
          >
            <List size={12} /> {t('List', 'Список')}
          </button>
        </div>

        {/* Calendar view toggle */}
        {viewMode === 'calendar' && (
          <div className="flex bg-muted/50 rounded-xl p-0.5">
            <button
              onClick={() => setCalendarView('month')}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all',
                calendarView === 'month' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
              )}
            >
              {t('Month', 'Месяц')}
            </button>
            <button
              onClick={() => setCalendarView('week')}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all',
                calendarView === 'week' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
              )}
            >
              {t('Week', 'Неделя')}
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Filter button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'p-2 rounded-xl border transition-colors',
            showFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground'
          )}
        >
          <Filter size={14} />
        </button>
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-xl border border-border p-3 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('Search student, coach, pool...', 'Поиск ученика, тренера, бассейна...')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 rounded-lg border-0 focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              {/* Status filters */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setStatusFilter(null)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors',
                    !statusFilter ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                  )}
                >
                  {t('All', 'Все')}
                </button>
                {Object.keys(STATUS_STYLES).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors',
                      statusFilter === s ? STATUS_STYLES[s] : 'border-border text-muted-foreground'
                    )}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Clear filters */}
              {(statusFilter || searchQuery || selectedDate) && (
                <button
                  onClick={() => { setStatusFilter(null); setSearchQuery(''); setSelectedDate(null); }}
                  className="text-xs text-destructive flex items-center gap-1"
                >
                  <X size={12} /> {t('Clear filters', 'Сбросить')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : viewMode === 'calendar' ? (
        <>
          {/* Calendar header */}
          <div className="flex items-center justify-between">
            <button onClick={() => navigateMonth(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <ChevronLeft size={16} />
            </button>
            <h3 className="font-semibold text-sm text-foreground">
              {calendarView === 'month'
                ? `${monthNames[month]} ${year}`
                : `${weekDates[0].toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} — ${weekDates[6].toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
              }
            </h3>
            <button onClick={() => navigateMonth(1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1">
            {dayLabels.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          {calendarView === 'month' ? (
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {/* Day cells */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayBookings = bookingsByDate[dateStr] || [];
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const hasBookings = dayBookings.length > 0;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={cn(
                      'aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs transition-all relative',
                      isToday && !isSelected && 'ring-1 ring-primary',
                      isSelected && 'bg-primary text-primary-foreground',
                      !isSelected && hasBookings && 'bg-primary/5',
                      !isSelected && !hasBookings && 'hover:bg-muted/50'
                    )}
                  >
                    <span className={cn('font-medium', isSelected ? 'text-primary-foreground' : 'text-foreground')}>
                      {day}
                    </span>
                    {hasBookings && (
                      <div className="flex gap-0.5">
                        {dayBookings.slice(0, 3).map((b, bi) => (
                          <span
                            key={bi}
                            className={cn(
                              'w-1 h-1 rounded-full',
                              isSelected ? 'bg-primary-foreground/70' : (STATUS_DOTS[b.status] || 'bg-muted-foreground')
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Week view */
            <div className="grid grid-cols-7 gap-1">
              {weekDates.map(d => {
                const dateStr = formatDate(d);
                const dayBookings = bookingsByDate[dateStr] || [];
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={cn(
                      'rounded-xl p-2 flex flex-col items-center gap-1 transition-all min-h-[80px]',
                      isToday && !isSelected && 'ring-1 ring-primary',
                      isSelected && 'bg-primary text-primary-foreground',
                      !isSelected && 'hover:bg-muted/50'
                    )}
                  >
                    <span className="text-xs font-medium">{d.getDate()}</span>
                    <span className={cn(
                      'text-lg font-bold',
                      isSelected ? 'text-primary-foreground' : dayBookings.length > 0 ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {dayBookings.length}
                    </span>
                    <span className={cn('text-[9px]', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {t('lessons', 'зан.')}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected date bookings */}
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </h4>
                <button onClick={() => setSelectedDate(null)} className="text-xs text-muted-foreground">
                  <X size={14} />
                </button>
              </div>
              {filteredBookings.length > 0 ? (
                filteredBookings.map(b => <BookingCard key={b.id} booking={b} t={t} />)
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {t('No bookings on this date', 'Нет бронирований на эту дату')}
                </div>
              )}
            </motion.div>
          )}

          {/* Today button */}
          {formatDate(currentDate) !== today && (
            <div className="text-center">
              <button
                onClick={() => { setCurrentDate(new Date()); setSelectedDate(today); }}
                className="text-xs text-primary font-medium"
              >
                {t('Go to Today', 'Перейти к сегодня')}
              </button>
            </div>
          )}
        </>
      ) : (
        /* List view */
        <div className="space-y-2">
          {filteredBookings.length > 0 ? (
            filteredBookings.map(b => <BookingCard key={b.id} booking={b} t={t} />)
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t('No bookings found', 'Бронирования не найдены')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Booking Card ───
function BookingCard({ booking: b, t }: { booking: BookingRow; t: (en: string, ru: string) => string }) {
  const studentName = b.student?.profiles?.full_name;
  const coachName = b.coach?.profiles?.full_name;
  const poolName = b.pool?.name;
  const slot = b.time_slots as unknown as { date: string; start_time: string; end_time: string } | null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-card rounded-xl border border-border p-3 space-y-2"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">
            {studentName || b.booking_type || t('Lesson', 'Занятие')}
          </p>
          {coachName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users size={10} /> {coachName}
            </p>
          )}
        </div>
        <Badge variant="outline" className={cn('text-[10px]', STATUS_STYLES[b.status || 'confirmed'] || '')}>
          {b.status?.replace('_', ' ')}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        {slot?.start_time && (
          <span className="flex items-center gap-1">
            <Clock size={10} /> {slot.start_time.substring(0, 5)}
            {slot.end_time ? ` — ${slot.end_time.substring(0, 5)}` : ''}
          </span>
        )}
        {poolName && (
          <span className="flex items-center gap-1">
            <MapPin size={10} /> {poolName}
          </span>
        )}
        {b.lesson_fee != null && (
          <span className="ml-auto font-medium text-foreground">
            {b.lesson_fee} {b.currency || 'AED'}
          </span>
        )}
      </div>
    </motion.div>
  );
}
