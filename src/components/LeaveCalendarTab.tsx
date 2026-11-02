import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  PlusCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Car,
  CheckSquare,
  Square,
  X,
  ArrowRight,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  StaffMemberRecord,
  LeaveRecordItem,
  CalendarEventItem,
  CalendarEntryType,
  DailyChecklistRecord,
  FleetVehicleItem,
  WorkTaskItem,
  INITIAL_FLEET_VEHICLES,
  INITIAL_WORK_TASKS,
  buildMonthlyCalendarGrid,
  formatFleetVehicleOptionLabel,
  canEditOrDeleteVehicleBooking,
  toLocalDateKey,
} from '../utils/futariLogic';

interface LeaveCalendarTabProps {
  currentUser: StaffMemberRecord;
  staffList?: StaffMemberRecord[];
  leaves: LeaveRecordItem[];
  events: CalendarEventItem[];
  dailyChecklists?: DailyChecklistRecord[];
  fleetVehicles?: FleetVehicleItem[];
  tasks?: WorkTaskItem[];
  onSubmitLeaveRequest: (newLeave: LeaveRecordItem) => void;
  onAddCalendarEvent?: (newEvent: CalendarEventItem) => void;
  onUpdateCalendarEvent?: (
    eventId: string,
    updates: Partial<CalendarEventItem>
  ) => void;
  onDeleteCalendarEvent?: (eventId: string) => void;
  onToggleChecklistItem?: (
    dateStr: string,
    ownerStaffId: string,
    itemId: string
  ) => void;
  onAddChecklistItem?: (
    dateStr: string,
    ownerStaffId: string,
    text: string
  ) => void;
  onEditChecklistItem?: (
    dateStr: string,
    ownerStaffId: string,
    itemId: string,
    newText: string
  ) => void;
  onDeleteChecklistItem?: (
    dateStr: string,
    ownerStaffId: string,
    itemId: string
  ) => void;
  onSyncLeaveToGoogleCalendar: (leave: LeaveRecordItem) => void;
  onOpenTasksTab?: () => void;
  isDark: boolean;
}

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_HEADERS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const LeaveCalendarTab: React.FC<LeaveCalendarTabProps> = ({
  currentUser,
  leaves,
  events,
  fleetVehicles = INITIAL_FLEET_VEHICLES,
  tasks = INITIAL_WORK_TASKS,
  onSubmitLeaveRequest,
  onAddCalendarEvent,
  onUpdateCalendarEvent,
  onDeleteCalendarEvent,
  onSyncLeaveToGoogleCalendar,
  onOpenTasksTab,
  isDark,
}) => {
  // STRICT RBAC FOR VEHICLE BOOKING EDIT & DELETE:
  // ONLY visible and accessible if the currently logged-in user's role is strictly `dev` or `executive`
  const canManageBookingSchedules = canEditOrDeleteVehicleBooking(currentUser);

  // Dynamic real-time date state evaluated from new Date() at runtime
  const todayDate = useMemo(() => new Date(), []);
  const todayDateStr = useMemo(() => toLocalDateKey(todayDate), [todayDate]);

  const [viewYear, setViewYear] = useState<number>(() => todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => todayDate.getMonth()); // 0-indexed
  const [typeFilter, setTypeFilter] = useState<
    'ALL' | CalendarEntryType | 'Task Deadline'
  >('ALL');

  // Selected Day for Day View defaults dynamically to today's date
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => todayDateStr);
  const [isDayViewModalOpen, setIsDayViewModalOpen] = useState<boolean>(false);

  // Multi-Type Entry Form State ('Cuti' | 'Event Kantor' | 'Booking Mobil Operasional')
  const [entryCategory, setEntryCategory] = useState<CalendarEntryType>('Cuti');
  const [leaveType, setLeaveType] = useState<
    'Cuti Tahunan' | 'Izin Sakit' | 'Izin Khusus' | 'Cuti Bersama'
  >('Cuti Tahunan');
  const [startDate, setStartDate] = useState<string>(() => todayDateStr);
  const [endDate, setEndDate] = useState<string>(() => todayDateStr);
  const [reason, setReason] = useState<string>('');
  const [eventTitleInput, setEventTitleInput] = useState<string>('');
  const [eventLocationInput, setEventLocationInput] = useState<string>(
    'Futari HQ Cipete → JCC Senayan'
  );
  // Dynamic "Pilih Mobil" dropdown state populated from `fleetVehicles`
  const [vehicleNameInput, setVehicleNameInput] = useState<string>(() =>
    fleetVehicles[0] ? formatFleetVehicleOptionLabel(fleetVehicles[0]) : ''
  );
  const [timeSlotInput, setTimeSlotInput] =
    useState<string>('09:00 - 17:00 WIB');
  const [formError, setFormError] = useState<string>('');

  // Edit Vehicle Booking Schedule Modal State (Strictly for `dev` & `executive` roles)
  const [editingCarBooking, setEditingCarBooking] =
    useState<CalendarEventItem | null>(null);
  const [editVehicleName, setEditVehicleName] = useState<string>('');
  const [editBookingTitle, setEditBookingTitle] = useState<string>('');
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editEndDate, setEditEndDate] = useState<string>('');
  const [editTimeSlot, setEditTimeSlot] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('');

  const handleOpenEditCarBookingModal = (booking: CalendarEventItem) => {
    if (!canManageBookingSchedules) return;
    setEditingCarBooking(booking);
    setEditVehicleName(
      booking.vehicleName ||
        (fleetVehicles[0]
          ? formatFleetVehicleOptionLabel(fleetVehicles[0])
          : '')
    );
    setEditBookingTitle(booking.title);
    setEditStartDate(booking.startDate);
    setEditEndDate(booking.endDate || booking.startDate);
    setEditTimeSlot(booking.timeSlot || '09:00 - 17:00 WIB');
    setEditLocation(booking.location);
  };

  const handleSaveEditedCarBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageBookingSchedules || !editingCarBooking) return;
    if (onUpdateCalendarEvent) {
      onUpdateCalendarEvent(editingCarBooking.id, {
        vehicleName: editVehicleName.trim() || editingCarBooking.vehicleName,
        title: editBookingTitle.trim() || editingCarBooking.title,
        startDate: editStartDate || editingCarBooking.startDate,
        endDate:
          editEndDate && editEndDate >= editStartDate
            ? editEndDate
            : editStartDate || editingCarBooking.startDate,
        timeSlot: editTimeSlot.trim() || editingCarBooking.timeSlot,
        location: editLocation.trim() || editingCarBooking.location,
      });
    }
    setEditingCarBooking(null);
  };

  const handleDeleteCarBookingItem = (bookingId: string) => {
    if (!canManageBookingSchedules) return;
    if (onDeleteCalendarEvent) {
      onDeleteCalendarEvent(bookingId);
    }
  };

  // Keep selected vehicle in sync if fleetVehicles changes
  useEffect(() => {
    if (fleetVehicles.length > 0) {
      const exists = fleetVehicles.some(
        (v) => formatFleetVehicleOptionLabel(v) === vehicleNameInput
      );
      if (!exists) {
        setVehicleNameInput(formatFleetVehicleOptionLabel(fleetVehicles[0]));
      }
    } else {
      setVehicleNameInput('');
    }
  }, [fleetVehicles, vehicleNameInput]);

  // Calendar Sync: buildMonthlyCalendarGrid automatically reads `tasks` and renders them on their `deadlineDate`
  const calendarCells = useMemo(
    () => buildMonthlyCalendarGrid(viewYear, viewMonth, leaves, events, tasks),
    [viewYear, viewMonth, leaves, events, tasks]
  );

  const selectedDayCell = useMemo(() => {
    const found = calendarCells.find((c) => c.dateStr === selectedDayStr);
    if (found) return found;
    const dayLeaves = leaves.filter(
      (lv) => selectedDayStr >= lv.startDate && selectedDayStr <= lv.endDate
    );
    const dayEvents = events.filter(
      (ev) => selectedDayStr >= ev.startDate && selectedDayStr <= ev.endDate
    );
    const deadlineTasks = tasks.filter((t) => {
      const dueKey = t.deadlineDate || (t.due_date ? t.due_date.split('T')[0] : '');
      return dueKey === selectedDayStr;
    });
    return {
      dateStr: selectedDayStr,
      dayNumber: Number(selectedDayStr.split('-')[2] || 20),
      isCurrentMonth: true,
      leaves: dayLeaves,
      events: dayEvents,
      officeEvents: dayEvents.filter(
        (ev) => (ev.eventType || 'Event Kantor') === 'Event Kantor'
      ),
      carBookings: dayEvents.filter(
        (ev) => ev.eventType === 'Booking Mobil Operasional'
      ),
      deadlineTasks,
    };
  }, [calendarCells, selectedDayStr, leaves, events, tasks]);

  const carBookingsList = useMemo(
    () => events.filter((ev) => ev.eventType === 'Booking Mobil Operasional'),
    [events]
  );

  const officeEventsList = useMemo(
    () =>
      events.filter((ev) => (ev.eventType || 'Event Kantor') === 'Event Kantor'),
    [events]
  );

  const surfaceCard = isDark
    ? 'bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-2xl text-slate-100'
    : 'bg-white/70 backdrop-blur-md border border-white/40 shadow-lg text-slate-900';
  const mutedText = isDark ? 'text-slate-300' : 'text-slate-600';

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDayOnCalendar = (dateStr: string) => {
    setSelectedDayStr(dateStr);
    setStartDate(dateStr);
    setEndDate(dateStr);
    setIsDayViewModalOpen(true);
  };

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!startDate || !endDate) {
      setFormError('Pilih tanggal mulai dan selesai.');
      return;
    }
    if (endDate < startDate) {
      setFormError('Tanggal selesai tidak boleh sebelum tanggal mulai.');
      return;
    }

    if (entryCategory === 'Cuti') {
      if (!reason.trim()) {
        setFormError('Alasan pengajuan cuti/izin wajib diisi.');
        return;
      }

      const firstName = currentUser.name.split(' ')[0];
      const newLeave: LeaveRecordItem = {
        id: `lv_${Date.now()}`,
        staffId: currentUser.staffId,
        staffName: currentUser.name,
        role: currentUser.role,
        divisionLabel: currentUser.divisionLabel,
        branch: currentUser.branch,
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
        status: 'Approved',
        badgeLabel: `${firstName} - ${leaveType}`,
      };

      onSubmitLeaveRequest(newLeave);
      setReason('');
      return;
    }

    if (entryCategory === 'Event Kantor') {
      if (!eventTitleInput.trim()) {
        setFormError('Nama Event Kantor wajib diisi.');
        return;
      }
      if (onAddCalendarEvent) {
        onAddCalendarEvent({
          id: `cal_ev_${Date.now()}`,
          title: eventTitleInput.trim(),
          eventType: 'Event Kantor',
          location: eventLocationInput.trim() || 'Jakarta / Bandung',
          startDate,
          endDate,
          picName: `${currentUser.name} (${currentUser.role})`,
          branch: currentUser.branch,
          timeSlot: timeSlotInput.trim() || '09:00 - 18:00 WIB',
          notes: reason.trim(),
        });
      }
      setEventTitleInput('');
      setReason('');
      return;
    }

    if (entryCategory === 'Booking Mobil Operasional') {
      if (!vehicleNameInput.trim()) {
        setFormError('Pilih Mobil Operasional terlebih dahulu.');
        return;
      }
      if (onAddCalendarEvent) {
        onAddCalendarEvent({
          id: `cal_car_${Date.now()}`,
          title: `Booking Mobil Operasional — ${vehicleNameInput.trim()} (${
            eventTitleInput.trim() || 'Operasional Lapangan'
          })`,
          eventType: 'Booking Mobil Operasional',
          vehicleName: vehicleNameInput.trim(),
          location: eventLocationInput.trim() || 'Futari HQ Cipete',
          startDate,
          endDate,
          picName: `${currentUser.name} & M Rio Antoni`,
          branch: currentUser.branch,
          timeSlot: timeSlotInput.trim() || '09:00 - 17:00 WIB',
          notes:
            reason.trim() ||
            `Terjadwal oleh ${currentUser.name} — dimonitor oleh M Rio Antoni (Operational).`,
        });
      }
      setEventTitleInput('');
      setReason('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Top Header & Multi-Type Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display">
            Calendar
          </h1>
        </div>

        {/* Multi-Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: 'ALL', label: 'Semua Jadwal' },
              { key: 'Cuti', label: 'Cuti Karyawan' },
              { key: 'Event Kantor', label: 'Event Kantor' },
              {
                key: 'Booking Mobil Operasional',
                label: 'Booking Mobil Operasional',
              },
              {
                key: 'Task Deadline',
                label: 'Deadline Task',
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              data-testid={`calendar-filter-${tab.key}`}
              onClick={() => setTypeFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                typeFilter === tab.key
                  ? 'bg-gradient-to-r from-[#0277BD] to-[#00B4D8] text-white border-transparent shadow-sm'
                  : isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Columns: Monthly Calendar Grid + Selected Date Summary */}
        <div className="lg:col-span-8 space-y-6">
          <div className={`p-4 sm:p-6 rounded-2xl border ${surfaceCard}`}>
            {/* Calendar Month Navigation & Legend */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0277BD] to-[#00B4D8] flex items-center justify-center text-white shadow-sm shrink-0">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold font-display">
                    {MONTH_NAMES_ID[viewMonth]} {viewYear}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] mt-0.5">
                    <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Cuti Karyawan
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[#00B4D8] font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#00B4D8]" />
                      Event Kantor
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Booking Mobil
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-purple-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      Deadline Task &amp; Pekerjaan
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Bulan Sebelumnya"
                  className={`p-2 rounded-lg border transition-colors ${
                    isDark
                      ? 'border-slate-800 hover:bg-slate-800 text-slate-200'
                      : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewYear(todayDate.getFullYear());
                    setViewMonth(todayDate.getMonth());
                    setSelectedDayStr(todayDateStr);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    isDark
                      ? 'border-slate-800 hover:bg-slate-800 text-slate-200'
                      : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Bulan Berikutnya"
                  className={`p-2 rounded-lg border transition-colors ${
                    isDark
                      ? 'border-slate-800 hover:bg-slate-800 text-slate-200'
                      : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2">
              {DAY_HEADERS.map((d) => (
                <div
                  key={d}
                  className={`text-center text-[11px] font-bold uppercase tracking-wider py-1.5 ${mutedText}`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* 7-Column Calendar Cells (Click to Open Day View) */}
            <div
              data-testid="leave-calendar-grid"
              className="grid grid-cols-7 gap-1 sm:gap-1.5"
            >
              {calendarCells.map((cell) => {
                const isSelected = cell.dateStr === selectedDayStr;
                const visibleLeaves =
                  typeFilter === 'ALL' || typeFilter === 'Cuti'
                    ? cell.leaves
                    : [];
                const visibleOfficeEvents =
                  typeFilter === 'ALL' || typeFilter === 'Event Kantor'
                    ? cell.officeEvents
                    : [];
                const visibleCarBookings =
                  typeFilter === 'ALL' ||
                  typeFilter === 'Booking Mobil Operasional'
                    ? cell.carBookings
                    : [];
                const visibleDeadlineTasks =
                  typeFilter === 'ALL' || typeFilter === 'Task Deadline'
                    ? cell.deadlineTasks
                    : [];

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    data-testid={`calendar-day-${cell.dateStr}`}
                    aria-label={`Buka Day View tanggal ${cell.dateStr}`}
                    onClick={() => handleSelectDayOnCalendar(cell.dateStr)}
                    className={`min-h-[92px] sm:min-h-[112px] p-1.5 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#00B4D8] ring-2 ring-[#00B4D8]/40 bg-[#00B4D8]/10'
                        : cell.isToday
                        ? isDark
                          ? 'border-[#00B4D8]/70 bg-slate-900/90 ring-1 ring-[#00B4D8]/30'
                          : 'border-[#0277BD]/70 bg-sky-50/70 ring-1 ring-[#0277BD]/30'
                        : cell.isCurrentMonth
                        ? isDark
                          ? 'bg-slate-950/70 border-slate-800/90 hover:border-[#00B4D8]/60'
                          : 'bg-slate-50/70 border-slate-200 hover:border-[#0277BD]'
                        : isDark
                        ? 'bg-slate-950/20 border-slate-900 opacity-40'
                        : 'bg-slate-100/40 border-slate-200/50 opacity-45'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-mono font-bold ${
                            isSelected
                              ? 'px-1.5 py-0.5 rounded bg-[#00B4D8] text-slate-950'
                              : cell.isToday
                              ? 'px-1.5 py-0.5 rounded bg-[#0277BD] text-white'
                              : ''
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        {cell.isToday && !isSelected && (
                          <span className="text-[10px] font-bold text-[#00B4D8] hidden sm:inline">
                            Today
                          </span>
                        )}
                      </div>
                      {cell.deadlineTasks.length > 0 && (
                        <span
                          title={`${cell.deadlineTasks.length} Task Deadline`}
                          className="text-[9px] font-mono px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold hidden sm:inline-block"
                        >
                          🎯{cell.deadlineTasks.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 space-y-1 w-full overflow-hidden">
                      {/* 1. Cuti Karyawan Badges */}
                      {visibleLeaves.slice(0, 1).map((lv) => (
                        <div
                          key={lv.id}
                          title={`${lv.badgeLabel} (${lv.reason})`}
                          className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold truncate bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        >
                          🌴 {lv.badgeLabel}
                        </div>
                      ))}

                      {/* 2. Event Kantor Badges */}
                      {visibleOfficeEvents.slice(0, 1).map((ev) => (
                        <div
                          key={ev.id}
                          title={`${ev.title} (${ev.location})`}
                          className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold truncate bg-[#00B4D8]/20 text-[#00B4D8] border border-[#00B4D8]/30"
                        >
                          📅 {ev.title}
                        </div>
                      ))}

                      {/* 3. Booking Mobil Operasional Badges */}
                      {visibleCarBookings.slice(0, 1).map((car) => (
                        <div
                          key={car.id}
                          title={`${car.vehicleName || car.title} — PIC: ${car.picName}`}
                          className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold truncate bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        >
                          🚗 {car.vehicleName || car.title}
                        </div>
                      ))}

                      {/* 4. Task & Pekerjaan Synced on Deadline Date */}
                      {visibleDeadlineTasks.slice(0, 2).map((task) => {
                        const isDone = task.completed || Boolean(task.is_completed);
                        return (
                          <div
                            key={task.id}
                            data-testid={`calendar-task-deadline-${task.id}`}
                            title={`Deadline Task: ${task.taskName} — Assignee: ${task.assigneeName} (${isDone ? 'Selesai' : 'Pending'})`}
                            className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold truncate border flex items-center gap-1 ${
                              isDone
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 line-through opacity-70'
                                : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            }`}
                          >
                            <span>{isDone ? '✓' : '🎯'}</span>
                            <span className="truncate">{task.taskName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Persistent Day Summary & Synced Task Deadlines Panel */}
          <div
            data-testid="day-view-panel"
            className={`p-5 sm:p-6 rounded-2xl border ${surfaceCard} space-y-5`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/40 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold font-display">
                  Agenda Details: {selectedDayStr}
                </h3>
              </div>

              {onOpenTasksTab && (
                <button
                  type="button"
                  data-testid="open-tasks-tab-from-calendar-btn"
                  onClick={onOpenTasksTab}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-purple-500/40 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Kelola di Tab Task &amp; Pekerjaan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Cuti Card */}
              <div
                className={`p-3.5 rounded-xl border ${
                  isDark
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <p className="text-xs font-bold text-amber-400">
                  🌴 Cuti Karyawan ({selectedDayCell.leaves.length})
                </p>
                {selectedDayCell.leaves.length === 0 ? (
                  <p className={`text-xs mt-1.5 ${mutedText}`}>
                    Tidak ada personel cuti.
                  </p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {selectedDayCell.leaves.map((lv) => (
                      <div key={lv.id} className="text-xs">
                        <p className="font-semibold">{lv.badgeLabel}</p>
                        <p className={`text-[11px] ${mutedText}`}>{lv.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Event Kantor Card */}
              <div
                className={`p-3.5 rounded-xl border ${
                  isDark
                    ? 'bg-[#00B4D8]/5 border-[#00B4D8]/30'
                    : 'bg-sky-50 border-sky-200'
                }`}
              >
                <p className="text-xs font-bold text-[#00B4D8]">
                  📅 Event Kantor ({selectedDayCell.officeEvents.length})
                </p>
                {selectedDayCell.officeEvents.length === 0 ? (
                  <p className={`text-xs mt-1.5 ${mutedText}`}>
                    Tidak ada event kantor.
                  </p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {selectedDayCell.officeEvents.map((ev) => (
                      <div key={ev.id} className="text-xs">
                        <p className="font-semibold">{ev.title}</p>
                        <p className={`text-[11px] ${mutedText}`}>
                          {ev.location} · PIC: {ev.picName}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Booking Mobil Operasional Card */}
              <div
                className={`p-3.5 rounded-xl border ${
                  isDark
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <p className="text-xs font-bold text-emerald-400">
                  🚗 Booking Mobil ({selectedDayCell.carBookings.length})
                </p>
                {selectedDayCell.carBookings.length === 0 ? (
                  <p className={`text-xs mt-1.5 ${mutedText}`}>
                    Armada tersedia di HQ.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {selectedDayCell.carBookings.map((car) => (
                      <div key={car.id} className="text-xs space-y-1">
                        <p className="font-semibold text-emerald-400">
                          {car.vehicleName || car.title}
                        </p>
                        <p className={`text-[11px] ${mutedText}`}>
                          {car.location} · PIC: {car.picName}
                        </p>
                        {canManageBookingSchedules && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCarBookingModal(car)}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#00B4D8]/15 text-[#00B4D8] hover:bg-[#00B4D8]/25 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCarBookingItem(car.id)}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Synced Task Deadlines Card */}
              <div
                data-testid="day-view-deadline-tasks-card"
                className={`p-3.5 rounded-xl border ${
                  isDark
                    ? 'bg-purple-500/5 border-purple-500/30'
                    : 'bg-purple-50 border-purple-200'
                }`}
              >
                <p className="text-xs font-bold text-purple-400">
                  🎯 Deadline Task ({selectedDayCell.deadlineTasks.length})
                </p>
                {selectedDayCell.deadlineTasks.length === 0 ? (
                  <p className={`text-xs mt-1.5 ${mutedText}`}>
                    Tidak ada deadline task.
                  </p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {selectedDayCell.deadlineTasks.map((task) => {
                      const isDone = task.completed || Boolean(task.is_completed);
                      return (
                        <div key={task.id} className="text-xs">
                          <p
                            className={`font-semibold flex items-center gap-1.5 ${
                              isDone ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            <span>{isDone ? '✓' : '🎯'}</span>
                            <span>{task.taskName}</span>
                          </p>
                          <p className={`text-[11px] ${mutedText}`}>
                            Assignee: <strong>{task.assigneeName}</strong>
                            {task.completed_at && (
                              <span className="text-emerald-400 ml-1.5">
                                · Selesai: {new Date(task.completed_at).toLocaleDateString('id-ID')}
                              </span>
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Multi-Type Entry Form + Operational Car Bookings Log */}
        <div className="lg:col-span-4 space-y-6">
          <form
            onSubmit={handleCreateEntry}
            data-testid="multi-type-calendar-form"
            className={`p-5 rounded-2xl border ${surfaceCard} space-y-4`}
          >
            <div className="flex items-center gap-2 text-[#00B4D8]">
              <PlusCircle className="w-4 h-4" />
              <h3 className="text-sm font-bold font-display">
                Tambah Jadwal ke Kalender Operasional
              </h3>
            </div>

            {/* Category Selector: Cuti | Event Kantor | Booking Mobil Operasional */}
            <div>
              <label className="block text-xs font-medium mb-1.5">
                Pilih Tipe Jadwal Kalender
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    'Cuti',
                    'Event Kantor',
                    'Booking Mobil Operasional',
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    data-testid={`entry-type-btn-${cat}`}
                    onClick={() => setEntryCategory(cat)}
                    className={`py-2 px-2 rounded-lg text-[11px] font-bold border text-center transition-all cursor-pointer ${
                      entryCategory === cat
                        ? 'bg-[#0277BD] text-white border-[#00B4D8]'
                        : isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    {cat === 'Booking Mobil Operasional' ? 'Booking Mobil' : cat}
                  </button>
                ))}
              </div>
            </div>

            {entryCategory === 'Cuti' && (
              <div>
                <label
                  htmlFor="leave-type-select"
                  className="block text-xs font-medium mb-1"
                >
                  Kategori Cuti / Izin
                </label>
                <select
                  id="leave-type-select"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-lg text-xs border ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="Cuti Tahunan">Cuti Tahunan</option>
                  <option value="Izin Sakit">Izin Sakit</option>
                  <option value="Izin Khusus">Izin Khusus</option>
                  <option value="Cuti Bersama">Cuti Bersama</option>
                </select>
              </div>
            )}

            {/* DYNAMIC FLEET DROPDOWN: "Pilih Mobil" populated from `fleetVehicles` state */}
            {entryCategory === 'Booking Mobil Operasional' && (
              <div>
                <label
                  htmlFor="car-vehicle-select"
                  className="block text-xs font-semibold text-emerald-400 mb-1"
                >
                  Pilih Mobil (Dari Database Manajemen Kendaraan)
                </label>
                <select
                  id="car-vehicle-select"
                  data-testid="car-vehicle-select"
                  value={vehicleNameInput}
                  onChange={(e) => setVehicleNameInput(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-semibold border ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  {fleetVehicles.length === 0 ? (
                    <option value="">
                      -- Belum ada mobil terdaftar di Manajemen Kendaraan --
                    </option>
                  ) : (
                    fleetVehicles.map((vehicle) => {
                      const optionLabel = formatFleetVehicleOptionLabel(vehicle);
                      return (
                        <option key={vehicle.id} value={optionLabel}>
                          {optionLabel} — [{vehicle.status} · {vehicle.branch}]
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            )}

            {entryCategory !== 'Cuti' && (
              <>
                <div>
                  <label
                    htmlFor="cal-event-title-input"
                    className="block text-xs font-medium mb-1"
                  >
                    {entryCategory === 'Booking Mobil Operasional'
                      ? 'Keperluan / Agenda Operasional'
                      : 'Nama Event Kantor'}
                  </label>
                  <input
                    id="cal-event-title-input"
                    data-testid="cal-event-title-input"
                    type="text"
                    value={eventTitleInput}
                    onChange={(e) => setEventTitleInput(e.target.value)}
                    placeholder={
                      entryCategory === 'Booking Mobil Operasional'
                        ? 'Contoh: Survey Teknis & Loading Venue Senayan'
                        : 'Contoh: Townhall Q4 Futari JKT & BDG'
                    }
                    className={`w-full px-3 py-2 rounded-lg text-xs border ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="cal-location-input"
                      className="block text-xs font-medium mb-1"
                    >
                      Rute / Lokasi Tujuan
                    </label>
                    <input
                      id="cal-location-input"
                      type="text"
                      value={eventLocationInput}
                      onChange={(e) => setEventLocationInput(e.target.value)}
                      className={`w-full px-2.5 py-2 rounded-lg text-xs border ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cal-timeslot-input"
                      className="block text-xs font-medium mb-1"
                    >
                      Jam Operasional
                    </label>
                    <input
                      id="cal-timeslot-input"
                      type="text"
                      value={timeSlotInput}
                      onChange={(e) => setTimeSlotInput(e.target.value)}
                      className={`w-full px-2.5 py-2 rounded-lg text-xs border ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="leave-start-date"
                  className="block text-xs font-medium mb-1"
                >
                  Tanggal Mulai
                </label>
                <input
                  id="leave-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full px-2.5 py-2 rounded-lg text-xs font-mono border ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label
                  htmlFor="leave-end-date"
                  className="block text-xs font-medium mb-1"
                >
                  Tanggal Selesai
                </label>
                <input
                  id="leave-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full px-2.5 py-2 rounded-lg text-xs font-mono border ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="leave-reason-input"
                className="block text-xs font-medium mb-1"
              >
                {entryCategory === 'Cuti'
                  ? 'Alasan & Handover Tugas'
                  : 'Catatan Tambahan / Personel Pendamping'}
              </label>
              <textarea
                id="leave-reason-input"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Contoh: Koordinasi bersama Pak M Rio Antoni & tim lapangan..."
                className={`w-full px-3 py-2 rounded-lg text-xs border ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {formError && <p className="text-xs text-rose-400">{formError}</p>}

            <button
              type="submit"
              data-testid="submit-calendar-entry-btn"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 shadow-md cursor-pointer"
            >
              Simpan Jadwal ({entryCategory}) ke Kalender
            </button>
          </form>

          {/* Dedicated Operational Car Bookings Card (Visible to All, Critical for Pak Rio) */}
          <div
            data-testid="operational-car-bookings-card"
            className={`p-5 rounded-2xl border ${surfaceCard} space-y-3`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-display flex items-center gap-2 text-emerald-400">
                <Car className="w-4 h-4" />
                <span>Log Booking Mobil Operasional (Pak Rio)</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                {carBookingsList.length} Unit Aktif
              </span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {carBookingsList.map((car) => (
                <div
                  key={car.id}
                  onClick={() => handleSelectDayOnCalendar(car.startDate)}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-slate-950/70 border-emerald-500/30 hover:border-emerald-400'
                      : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-emerald-400">
                      🚗 {car.vehicleName || car.title}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                      {car.branch}
                    </span>
                  </div>
                  <p className="font-semibold">{car.title}</p>
                  <p className="text-[11px] font-mono text-[#00B4D8]">
                    {car.startDate} s/d {car.endDate} · {car.timeSlot || 'Full Day'}
                  </p>
                  <p className={`text-[11px] flex items-center gap-1 ${mutedText}`}>
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>
                      {car.location} · PIC: <strong>{car.picName}</strong>
                    </span>
                  </p>

                  {/* STRICT RBAC: Edit (Ubah Jadwal) & Delete (Batalkan Booking) ONLY visible to `dev` or `executive` */}
                  {canManageBookingSchedules && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-2 border-t border-slate-800/60 flex items-center justify-end gap-2"
                    >
                      <button
                        type="button"
                        data-testid={`calendar-edit-car-booking-btn-${car.id}`}
                        onClick={() => handleOpenEditCarBookingModal(car)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#00B4D8]/15 text-[#00B4D8] hover:bg-[#00B4D8]/25 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit (Ubah Jadwal)</span>
                      </button>
                      <button
                        type="button"
                        data-testid={`calendar-delete-car-booking-btn-${car.id}`}
                        onClick={() => handleDeleteCarBookingItem(car.id)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete (Batalkan Booking)</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Active Leaves & Office Events List */}
          <div className={`p-5 rounded-2xl border ${surfaceCard} space-y-3`}>
            <h3 className="text-sm font-bold font-display flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00B4D8]" />
              <span>
                Daftar Cuti ({leaves.length}) &amp; Event ({officeEventsList.length})
              </span>
            </h3>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {leaves.map((lv) => (
                <div
                  key={lv.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                    isDark
                      ? 'bg-slate-950/70 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-amber-400">{lv.badgeLabel}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {lv.status}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-[#00B4D8]">
                    {lv.startDate} s/d {lv.endDate} ({lv.branch})
                  </p>
                  <p className={`text-[11px] ${mutedText}`}>{lv.reason}</p>
                  <button
                    type="button"
                    onClick={() => onSyncLeaveToGoogleCalendar(lv)}
                    className="text-[11px] font-semibold text-[#00B4D8] hover:underline inline-flex items-center gap-1 pt-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Sync ke Google Calendar</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Day View Modal when clicking a calendar cell */}
      <AnimatePresence>
        {isDayViewModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={`Day View Kalender ${selectedDayStr}`}
            data-testid="day-view-modal"
            className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border-2 border-[#00B4D8]/60 p-5 sm:p-6 shadow-2xl space-y-5 ${
                isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-700/40 pb-3">
                <div>
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#00B4D8]/20 text-[#00B4D8]">
                    INTERACTIVE DAY VIEW · DEADLINE TASK SYNC
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold font-display mt-1">
                    Detail Tanggal {selectedDayStr}
                  </h3>
                  <p className={`text-xs ${mutedText}`}>
                    Cuti: {selectedDayCell.leaves.length} · Event Kantor:{' '}
                    {selectedDayCell.officeEvents.length} · Booking Mobil:{' '}
                    {selectedDayCell.carBookings.length} · Deadline Task:{' '}
                    {selectedDayCell.deadlineTasks.length}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="close-day-view-modal-btn"
                  onClick={() => setIsDayViewModalOpen(false)}
                  aria-label="Tutup Day View Modal"
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="font-bold text-amber-400">🌴 Cuti Karyawan</p>
                  {selectedDayCell.leaves.length > 0 ? (
                    selectedDayCell.leaves.map((l) => (
                      <p key={l.id} className="mt-1">
                        {l.badgeLabel}
                      </p>
                    ))
                  ) : (
                    <p className={`mt-1 ${mutedText}`}>Nihil</p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-[#00B4D8]/10 border border-[#00B4D8]/30">
                  <p className="font-bold text-[#00B4D8]">📅 Event Kantor</p>
                  {selectedDayCell.officeEvents.length > 0 ? (
                    selectedDayCell.officeEvents.map((e) => (
                      <p key={e.id} className="mt-1">
                        {e.title} ({e.location})
                      </p>
                    ))
                  ) : (
                    <p className={`mt-1 ${mutedText}`}>Nihil</p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <p className="font-bold text-emerald-400">
                    🚗 Booking Mobil Operasional
                  </p>
                  {selectedDayCell.carBookings.length > 0 ? (
                    selectedDayCell.carBookings.map((c) => (
                      <p key={c.id} className="mt-1">
                        {c.vehicleName || c.title} ({c.picName})
                      </p>
                    ))
                  ) : (
                    <p className={`mt-1 ${mutedText}`}>Armada Tersedia</p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                  <p className="font-bold text-purple-400">
                    🎯 Deadline Task &amp; Pekerjaan
                  </p>
                  {selectedDayCell.deadlineTasks.length > 0 ? (
                    selectedDayCell.deadlineTasks.map((t) => {
                      const isDone = t.completed || Boolean(t.is_completed);
                      return (
                        <div key={t.id} className="mt-1.5 flex items-center gap-1.5">
                          {isDone ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          )}
                          <span className={isDone ? 'line-through text-slate-400' : ''}>
                            {t.taskName} — <strong>{t.assigneeName}</strong>
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className={`mt-1 ${mutedText}`}>Tidak ada deadline task</p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Vehicle Booking Schedule Modal in Calendar View (Strictly Accessible to `dev` & `executive`) */}
      {editingCarBooking && canManageBookingSchedules && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-edit-booking-modal-title"
          data-testid="calendar-edit-vehicle-booking-modal"
          className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSaveEditedCarBooking}
            className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-5 sm:p-6 space-y-4 ${surfaceCard}`}
          >
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
              <div className="flex items-center gap-2 text-[#00B4D8]">
                <Pencil className="w-4 h-4" />
                <h3
                  id="calendar-edit-booking-modal-title"
                  className="text-base font-bold font-display"
                >
                  Ubah Jadwal Booking Kendaraan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCarBooking(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label
                htmlFor="calendar-edit-vehicle-select"
                className="block text-xs font-semibold text-emerald-400 mb-1"
              >
                Pilih Kendaraan Operasional
              </label>
              <select
                id="calendar-edit-vehicle-select"
                data-testid="calendar-edit-vehicle-select"
                value={editVehicleName}
                onChange={(e) => setEditVehicleName(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-semibold border ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {fleetVehicles.length === 0 ? (
                  <option value={editVehicleName}>
                    {editVehicleName || 'Unit Kendaraan Operasional'}
                  </option>
                ) : (
                  fleetVehicles.map((v) => {
                    const label = formatFleetVehicleOptionLabel(v);
                    return (
                      <option key={v.id} value={label}>
                        {label} — [{v.status} · {v.branch}]
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="calendar-edit-booking-title"
                className="block text-xs font-medium mb-1"
              >
                Keperluan / Agenda Operasional
              </label>
              <input
                id="calendar-edit-booking-title"
                type="text"
                value={editBookingTitle}
                onChange={(e) => setEditBookingTitle(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs border ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="calendar-edit-start-date"
                  className="block text-xs font-medium mb-1"
                >
                  Tanggal Mulai
                </label>
                <input
                  id="calendar-edit-start-date"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => {
                    setEditStartDate(e.target.value);
                    if (editEndDate < e.target.value) {
                      setEditEndDate(e.target.value);
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono border ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label
                  htmlFor="calendar-edit-timeslot"
                  className="block text-xs font-medium mb-1"
                >
                  Jam Operasional
                </label>
                <input
                  id="calendar-edit-timeslot"
                  type="text"
                  value={editTimeSlot}
                  onChange={(e) => setEditTimeSlot(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-xs border ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="calendar-edit-location"
                className="block text-xs font-medium mb-1"
              >
                Rute / Lokasi Tujuan
              </label>
              <input
                id="calendar-edit-location"
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs border ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingCarBooking(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                data-testid="calendar-save-edited-booking-btn"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Simpan Perubahan Jadwal</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
};
