import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Car,
  PlusCircle,
  ShieldCheck,
  Lock,
  Pencil,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  X,
  Mail,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  FleetVehicleItem,
  FleetVehicleStatus,
  StaffMemberRecord,
  CalendarEventItem,
  SEED_FLEET_VEHICLES_FIXTURE,
  canManageFleetVehicles,
  canEditOrDeleteVehicleBooking,
  formatFleetVehicleOptionLabel,
  toDatetimeLocalInputValue,
  formatBookingTimestamptzLabel,
} from '../utils/futariLogic';

interface FleetManagementTabProps {
  currentUser: StaffMemberRecord;
  fleetVehicles: FleetVehicleItem[];
  carBookings: CalendarEventItem[];
  onAddVehicle: (input: {
    model: string;
    licensePlate: string;
    status: FleetVehicleStatus;
    branch?: 'JKT' | 'Bandung';
    notes?: string;
  }) => void;
  onUpdateVehicle: (
    vehicleId: string,
    updates: {
      model?: string;
      licensePlate?: string;
      status?: FleetVehicleStatus;
      branch?: 'JKT' | 'Bandung';
      notes?: string;
    }
  ) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onBookVehicle: (newBooking: CalendarEventItem) => Promise<void> | void;
  onUpdateBooking?: (
    bookingId: string,
    updates: Partial<CalendarEventItem>
  ) => Promise<void> | void;
  onDeleteBooking?: (bookingId: string) => Promise<void> | void;
  isDark: boolean;
}

function getDefaultBookingTimes(): { startLocal: string; endLocal: string } {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    9,
    0,
    0
  );
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    17,
    0,
    0
  );
  return {
    startLocal: toDatetimeLocalInputValue(start.toISOString()),
    endLocal: toDatetimeLocalInputValue(end.toISOString()),
  };
}

export const FleetManagementTab: React.FC<FleetManagementTabProps> = ({
  currentUser,
  fleetVehicles,
  carBookings,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onBookVehicle,
  onUpdateBooking,
  onDeleteBooking,
  isDark,
}) => {
  // Strict RBAC for fleet inventory management:
  // ONLY users with role 'Operasional', 'Executive', or 'Digital' (Dev Root) can see the form and manage vehicles.
  const canManageFleet = canManageFleetVehicles(currentUser);

  // STRICT RBAC FOR BOOKING SCHEDULE EDIT & DELETE:
  // ONLY visible and functional if the currently logged-in user's role is strictly `dev` or `executive`
  const canManageBookingSchedules = canEditOrDeleteVehicleBooking(currentUser);

  // Vehicles list from Supabase `vehicles` table
  const selectableVehicles = useMemo<FleetVehicleItem[]>(
    () => fleetVehicles,
    [fleetVehicles]
  );

  // Vehicle CRUD Form State (for Operational & Digital)
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [modelInput, setModelInput] = useState<string>('');
  const [licensePlateInput, setLicensePlateInput] = useState<string>('');
  const [statusInput, setStatusInput] = useState<FleetVehicleStatus>('Tersedia');
  const [branchInput, setBranchInput] = useState<'JKT' | 'Bandung'>('JKT');
  const [notesInput, setNotesInput] = useState<string>('');
  const [vehicleFormError, setVehicleFormError] = useState<string>('');

  // Supabase `vehicle_bookings` Form State (`email`, `vehicle`, `start_time`, `end_time`, `purpose`)
  const defaultTimes = useMemo(() => getDefaultBookingTimes(), []);
  const [selectedVehicleLabel, setSelectedVehicleLabel] = useState<string>(
    selectableVehicles[0]
      ? formatFleetVehicleOptionLabel(selectableVehicles[0])
      : 'Toyota Innova Zenix B 1829 FTR'
  );
  const [bookingStartTime, setBookingStartTime] = useState<string>(
    defaultTimes.startLocal
  );
  const [bookingEndTime, setBookingEndTime] = useState<string>(
    defaultTimes.endLocal
  );
  const [bookingPurpose, setBookingPurpose] = useState<string>('');
  const [bookingFormError, setBookingFormError] = useState<string>('');
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string>('');
  const [isSubmittingBooking, setIsSubmittingBooking] =
    useState<boolean>(false);

  // Edit Existing Vehicle Booking Schedule Modal State (Strictly for `dev` & `executive` roles)
  const [editingBooking, setEditingBooking] =
    useState<CalendarEventItem | null>(null);
  const [editBookingVehicle, setEditBookingVehicle] = useState<string>('');
  const [editBookingStartTime, setEditBookingStartTime] = useState<string>('');
  const [editBookingEndTime, setEditBookingEndTime] = useState<string>('');
  const [editBookingPurpose, setEditBookingPurpose] = useState<string>('');
  const [editModalError, setEditModalError] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  useEffect(() => {
    if (selectableVehicles.length > 0) {
      const exists = selectableVehicles.some(
        (v) => formatFleetVehicleOptionLabel(v) === selectedVehicleLabel
      );
      if (!exists) {
        setSelectedVehicleLabel(
          formatFleetVehicleOptionLabel(selectableVehicles[0])
        );
      }
    }
  }, [selectableVehicles, selectedVehicleLabel]);

  // Sort active bookings chronologically by start_time
  const sortedBookings = useMemo(() => {
    return [...carBookings].sort((a, b) => {
      const tA = new Date(a.start_time || a.startDate).getTime() || 0;
      const tB = new Date(b.start_time || b.startDate).getTime() || 0;
      return tA - tB;
    });
  }, [carBookings]);

  const handleOpenEditBookingModal = (booking: CalendarEventItem) => {
    if (!canManageBookingSchedules) return;
    setEditingBooking(booking);
    setEditModalError('');
    setEditBookingVehicle(
      booking.vehicle ||
        booking.vehicleName ||
        (selectableVehicles[0]
          ? formatFleetVehicleOptionLabel(selectableVehicles[0])
          : 'Toyota Innova Zenix B 1829 FTR')
    );
    setEditBookingStartTime(
      toDatetimeLocalInputValue(
        booking.start_time || `${booking.startDate}T09:00`
      )
    );
    setEditBookingEndTime(
      toDatetimeLocalInputValue(
        booking.end_time || `${booking.endDate || booking.startDate}T17:00`
      )
    );
    setEditBookingPurpose(booking.purpose || booking.title || '');
  };

  const handleSaveEditedBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageBookingSchedules || !editingBooking) return;
    setEditModalError('');

    const cleanVehicle = editBookingVehicle.trim();
    const cleanPurpose = editBookingPurpose.trim();
    const startParsed = new Date(editBookingStartTime);
    const endParsed = new Date(editBookingEndTime);

    if (!cleanVehicle) {
      setEditModalError('Pilih unit kendaraan terlebih dahulu.');
      return;
    }
    if (!cleanPurpose) {
      setEditModalError('Keperluan (purpose) wajib diisi.');
      return;
    }
    if (
      Number.isNaN(startParsed.getTime()) ||
      Number.isNaN(endParsed.getTime())
    ) {
      setEditModalError('Waktu mulai dan waktu selesai wajib valid.');
      return;
    }
    if (endParsed <= startParsed) {
      setEditModalError(
        'Waktu selesai (end_time) harus lebih besar dari waktu mulai (start_time).'
      );
      return;
    }

    const startIso = startParsed.toISOString();
    const endIso = endParsed.toISOString();
    const pad = (n: number) => String(n).padStart(2, '0');
    const startDateStr = `${startParsed.getFullYear()}-${pad(
      startParsed.getMonth() + 1
    )}-${pad(startParsed.getDate())}`;
    const endDateStr = `${endParsed.getFullYear()}-${pad(
      endParsed.getMonth() + 1
    )}-${pad(endParsed.getDate())}`;
    const timeSlotStr = `${pad(startParsed.getHours())}:${pad(
      startParsed.getMinutes()
    )} - ${pad(endParsed.getHours())}:${pad(endParsed.getMinutes())} WIB`;

    setIsSavingEdit(true);
    try {
      if (onUpdateBooking) {
        await onUpdateBooking(editingBooking.id, {
          vehicle: cleanVehicle,
          vehicleName: cleanVehicle,
          purpose: cleanPurpose,
          title: cleanPurpose,
          start_time: startIso,
          end_time: endIso,
          startDate: startDateStr,
          endDate: endDateStr,
          timeSlot: timeSlotStr,
        });
      }
      setBookingSuccessMsg(
        `Jadwal booking "${cleanVehicle}" berhasil diperbarui di tabel vehicle_bookings.`
      );
      setEditingBooking(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteBookingItem = async (bookingId: string, label: string) => {
    if (!canManageBookingSchedules) return;
    if (onDeleteBooking) {
      await onDeleteBooking(bookingId);
    }
    setBookingSuccessMsg(
      `Booking "${label}" telah dibatalkan dan dihapus dari tabel vehicle_bookings.`
    );
  };

  const surfaceCard = isDark
    ? 'bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-2xl text-slate-100'
    : 'bg-white/70 backdrop-blur-md border border-white/40 shadow-lg text-slate-900';
  const mutedText = isDark ? 'text-slate-300' : 'text-slate-600';

  const handleVehicleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageFleet) return;
    setVehicleFormError('');

    const cleanModel = modelInput.trim();
    const cleanPlate = licensePlateInput.trim().toUpperCase();
    if (!cleanModel) {
      setVehicleFormError('Model Kendaraan wajib diisi.');
      return;
    }
    if (!cleanPlate) {
      setVehicleFormError('Nomor Polisi (License Plate) wajib diisi.');
      return;
    }

    if (editingVehicleId) {
      onUpdateVehicle(editingVehicleId, {
        model: cleanModel,
        licensePlate: cleanPlate,
        status: statusInput,
        branch: branchInput,
        notes: notesInput,
      });
      setEditingVehicleId(null);
    } else {
      onAddVehicle({
        model: cleanModel,
        licensePlate: cleanPlate,
        status: statusInput,
        branch: branchInput,
        notes: notesInput,
      });
    }

    setModelInput('');
    setLicensePlateInput('');
    setStatusInput('Tersedia');
    setNotesInput('');
  };

  const handleStartEditVehicle = (vehicle: FleetVehicleItem) => {
    if (!canManageFleet) return;
    setEditingVehicleId(vehicle.id);
    setModelInput(vehicle.model);
    setLicensePlateInput(vehicle.licensePlate);
    setStatusInput(vehicle.status);
    setBranchInput(vehicle.branch);
    setNotesInput(vehicle.notes || '');
    setVehicleFormError('');
  };

  const handleBookVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingFormError('');
    setBookingSuccessMsg('');

    const cleanVehicle = selectedVehicleLabel.trim();
    const cleanPurpose = bookingPurpose.trim();
    const startParsed = new Date(bookingStartTime);
    const endParsed = new Date(bookingEndTime);

    if (!cleanVehicle) {
      setBookingFormError('Silakan pilih unit kendaraan (vehicle).');
      return;
    }
    if (!cleanPurpose) {
      setBookingFormError(
        'Keperluan / Tujuan peminjaman (purpose) wajib diisi.'
      );
      return;
    }
    if (
      Number.isNaN(startParsed.getTime()) ||
      Number.isNaN(endParsed.getTime())
    ) {
      setBookingFormError(
        'Waktu mulai (start_time) dan waktu selesai (end_time) wajib diisi.'
      );
      return;
    }
    if (endParsed <= startParsed) {
      setBookingFormError(
        'Waktu selesai (end_time) harus setelah waktu mulai (start_time).'
      );
      return;
    }

    const startIso = startParsed.toISOString();
    const endIso = endParsed.toISOString();
    const pad = (n: number) => String(n).padStart(2, '0');
    const startDateStr = `${startParsed.getFullYear()}-${pad(
      startParsed.getMonth() + 1
    )}-${pad(startParsed.getDate())}`;
    const endDateStr = `${endParsed.getFullYear()}-${pad(
      endParsed.getMonth() + 1
    )}-${pad(endParsed.getDate())}`;
    const timeSlotStr = `${pad(startParsed.getHours())}:${pad(
      startParsed.getMinutes()
    )} - ${pad(endParsed.getHours())}:${pad(endParsed.getMinutes())} WIB`;
    const userEmail = (currentUser.email || '').trim().toLowerCase();

    const newBooking: CalendarEventItem = {
      id: `car_${Date.now()}`,
      email: userEmail,
      vehicle: cleanVehicle,
      vehicleName: cleanVehicle,
      start_time: startIso,
      end_time: endIso,
      purpose: cleanPurpose,
      title: cleanPurpose,
      eventType: 'Booking Mobil Operasional',
      location: currentUser.branch === 'Bandung' ? 'Bandung Hub' : 'Jakarta HQ',
      startDate: startDateStr,
      endDate: endDateStr,
      timeSlot: timeSlotStr,
      picName: `${currentUser.name} (${userEmail})`,
      branch: currentUser.branch,
      notes: `Booked via Manajemen Kendaraan oleh ${currentUser.name}`,
    };

    setIsSubmittingBooking(true);
    try {
      await onBookVehicle(newBooking);
      setBookingPurpose('');
      setBookingSuccessMsg(
        `Booking kendaraan "${cleanVehicle}" (${formatBookingTimestamptzLabel(
          startIso
        )} – ${formatBookingTimestamptzLabel(
          endIso
        )}) berhasil disimpan ke tabel vehicle_bookings.`
      );
    } catch (err: any) {
      setBookingFormError(
        err?.message || 'Gagal menyimpan booking ke tabel vehicle_bookings.'
      );
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
      data-testid="fleet-management-tab"
    >
      {/* Header */}
      <div className={`p-4 md:p-6 rounded-2xl border min-w-0 ${surfaceCard}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold font-display mt-1.5 break-words">
              Manajemen Kendaraan &amp; Jadwal Booking Operasional
            </h1>
            <p className={`text-xs md:text-sm mt-1 break-words ${mutedText}`}>
              Pemesanan kendaraan operasional Futari dan manajemen armada operasional.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================================
          1. BOOKING INTERFACE: Form to Book a Vehicle
         ===================================================================== */}
      <form
        onSubmit={handleBookVehicleSubmit}
        data-testid="fleet-booking-form"
        className={`p-5 md:p-6 rounded-2xl border ${surfaceCard} space-y-4`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-700/40 pb-3">
          <div className="flex items-center gap-2 text-[#00B4D8]">
            <Car className="w-5 h-5" />
            <h2 className="text-base font-bold font-display">
              Form Booking Kendaraan Operasional
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Vehicle Selector (`vehicle`) */}
          <div>
            <label
              htmlFor="fleet-booking-vehicle-select"
              className="block text-xs font-semibold text-[#00B4D8] mb-1.5"
            >
              Pilih Kendaraan (vehicle)
            </label>
            <select
              id="fleet-booking-vehicle-select"
              data-testid="fleet-booking-vehicle-select"
              value={selectedVehicleLabel}
              onChange={(e) => setSelectedVehicleLabel(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              {selectableVehicles.map((v) => {
                const label = formatFleetVehicleOptionLabel(v);
                return (
                  <option key={v.id} value={label}>
                    {label} — [{v.status} · {v.branch}]
                  </option>
                );
              })}
            </select>
          </div>

          {/* Start Time (`start_time` timestamptz) */}
          <div>
            <label
              htmlFor="fleet-booking-start-time-input"
              className="block text-xs font-semibold text-[#00B4D8] mb-1.5"
            >
              Waktu Mulai (start_time)
            </label>
            <input
              id="fleet-booking-start-time-input"
              data-testid="fleet-booking-start-time-input"
              type="datetime-local"
              required
              value={bookingStartTime}
              onChange={(e) => setBookingStartTime(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg text-xs font-mono border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* End Time (`end_time` timestamptz) */}
          <div>
            <label
              htmlFor="fleet-booking-end-time-input"
              className="block text-xs font-semibold text-[#00B4D8] mb-1.5"
            >
              Waktu Selesai (end_time)
            </label>
            <input
              id="fleet-booking-end-time-input"
              data-testid="fleet-booking-end-time-input"
              type="datetime-local"
              required
              value={bookingEndTime}
              onChange={(e) => setBookingEndTime(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg text-xs font-mono border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Purpose (`purpose`) */}
          <div>
            <label
              htmlFor="fleet-booking-purpose-input"
              className="block text-xs font-semibold text-[#00B4D8] mb-1.5"
            >
              Keperluan / Tujuan (purpose)
            </label>
            <input
              id="fleet-booking-purpose-input"
              data-testid="fleet-booking-purpose-input"
              type="text"
              required
              value={bookingPurpose}
              onChange={(e) => setBookingPurpose(e.target.value)}
              placeholder="Contoh: Survey Teknis & Mobilisasi Kru JCC Senayan"
              className={`w-full px-3 py-2 rounded-lg text-xs border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>
        </div>

        {bookingFormError && (
          <div
            data-testid="fleet-booking-error-alert"
            className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{bookingFormError}</span>
          </div>
        )}

        {bookingSuccessMsg && (
          <div
            data-testid="fleet-booking-success-alert"
            className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{bookingSuccessMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmittingBooking}
            data-testid="submit-fleet-booking-btn"
            className="py-2.5 px-5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 disabled:opacity-50 shadow-md inline-flex items-center gap-2 cursor-pointer"
          >
            {isSubmittingBooking ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan Booking...</span>
              </>
            ) : (
              <>
                <Car className="w-4 h-4" />
                <span>Simpan Booking Kendaraan</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* =====================================================================
          2. SCHEDULE LIST / TIMELINE BELOW THE FORM (`vehicle_bookings`)
             WITH STRICT RBAC EDIT & DELETE (DEV & EXECUTIVE ONLY)
         ===================================================================== */}
      <div className={`p-5 md:p-6 rounded-2xl border ${surfaceCard} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-700/40 pb-3">
          <div>
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-emerald-400">
              <Calendar className="w-4 h-4" />
              <span>
                Jadwal &amp; Timeline Pemakaian Kendaraan Aktif (
                {sortedBookings.length} Booking)
              </span>
            </h2>
            <p className={`text-xs mt-0.5 ${mutedText}`}>
              Menampilkan seluruh jadwal aktif booking kendaraan.
            </p>
          </div>
        </div>

        {sortedBookings.length === 0 ? (
          <div
            data-testid="empty-car-bookings-state"
            className={`p-8 rounded-xl border border-dashed text-center text-xs space-y-2 ${
              isDark
                ? 'border-slate-700 bg-slate-950/40 text-slate-400'
                : 'border-slate-300 bg-slate-50 text-slate-600'
            }`}
          >
            <Car className="w-8 h-8 text-[#00B4D8] mx-auto opacity-80" />
            <p className="text-sm font-bold font-display text-slate-200">
              Belum Ada Jadwal Booking Kendaraan Aktif
            </p>
            <p>
              Semua unit kendaraan operasional tersedia. Gunakan formulir di atas
              untuk membuat jadwal peminjaman baru.
            </p>
          </div>
        ) : (
          <div
            data-testid="vehicle-bookings-schedule-list"
            className="space-y-3"
          >
            {sortedBookings.map((booking) => {
              const vehicleDisplay =
                booking.vehicle || booking.vehicleName || booking.title;
              const purposeDisplay = booking.purpose || booking.title;
              const emailDisplay = booking.email || booking.picName;
              const startTimeFormatted = booking.start_time
                ? formatBookingTimestamptzLabel(booking.start_time)
                : `${booking.startDate} (${booking.timeSlot || '09:00 WIB'})`;
              const endTimeFormatted = booking.end_time
                ? formatBookingTimestamptzLabel(booking.end_time)
                : `${booking.endDate || booking.startDate}`;

              return (
                <div
                  key={booking.id}
                  data-testid={`fleet-booking-item-${booking.id}`}
                  className={`p-4 rounded-xl border text-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 ${
                    isDark
                      ? 'bg-slate-950/75 border-emerald-500/30 hover:border-[#00B4D8]/50'
                      : 'bg-emerald-50/50 border-emerald-200'
                  } transition-colors`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30">
                        🚗 {vehicleDisplay}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[11px] text-[#00B4D8] bg-[#00B4D8]/10 border border-[#00B4D8]/30">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>
                          {startTimeFormatted} → {endTimeFormatted}
                        </span>
                      </span>
                    </div>

                    <p className="text-sm font-bold break-words">
                      {purposeDisplay}
                    </p>

                    <div
                      className={`flex flex-wrap items-center gap-3 text-[11px] ${mutedText}`}
                    >
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Mail className="w-3 h-3 text-[#00B4D8] shrink-0" />
                        <span>
                          Booked by: <strong>{emailDisplay}</strong>
                        </span>
                      </span>
                      {booking.picName &&
                        booking.picName !== booking.email && (
                          <span>· PIC: {booking.picName}</span>
                        )}
                    </div>
                  </div>

                  {/* STRICT RBAC: 'Edit' and 'Delete' (Cancel) buttons ONLY visible and functional if role is `dev` or `executive` */}
                  {canManageBookingSchedules && (
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/60">
                      <button
                        type="button"
                        data-testid={`edit-car-booking-btn-${booking.id}`}
                        onClick={() => handleOpenEditBookingModal(booking)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00B4D8]/15 text-[#00B4D8] border border-[#00B4D8]/30 hover:bg-[#00B4D8]/25 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        data-testid={`delete-car-booking-btn-${booking.id}`}
                        onClick={() =>
                          handleDeleteBookingItem(booking.id, vehicleDisplay)
                        }
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete (Cancel)</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          3. FLEET INVENTORY SECTION (Armada Operasional Futari)
         ===================================================================== */}
      <div className={`p-5 md:p-6 rounded-2xl border ${surfaceCard} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-sm md:text-base font-bold font-display flex items-center gap-2">
            <Car className="w-4 h-4 text-[#00B4D8] shrink-0" />
            <span>
              Daftar Unit Armada Operasional ({selectableVehicles.length} Unit)
            </span>
          </h2>
        </div>

        {canManageFleet && (
          <form
            onSubmit={handleVehicleFormSubmit}
            data-testid="fleet-crud-form"
            className="p-4 rounded-xl border border-emerald-500/30 bg-slate-950/50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>
                  {editingVehicleId
                    ? 'Edit Unit Armada'
                    : 'Tambah Unit Armada Baru'}
                </span>
              </h3>
              {editingVehicleId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingVehicleId(null);
                    setModelInput('');
                    setLicensePlateInput('');
                    setStatusInput('Tersedia');
                    setNotesInput('');
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                id="fleet-model-input"
                data-testid="fleet-model-input"
                type="text"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                placeholder="Model (cth: Innova Zenix)"
                className={`px-3 py-2 rounded-lg text-xs border ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <input
                id="fleet-plate-input"
                data-testid="fleet-plate-input"
                type="text"
                value={licensePlateInput}
                onChange={(e) => setLicensePlateInput(e.target.value)}
                placeholder="Plat Nomor (cth: B 1829 FTR)"
                className={`px-3 py-2 rounded-lg text-xs font-mono border ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <select
                id="fleet-status-select"
                data-testid="fleet-status-select"
                value={statusInput}
                onChange={(e) =>
                  setStatusInput(e.target.value as FleetVehicleStatus)
                }
                className={`px-3 py-2 rounded-lg text-xs border ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value="Tersedia">Tersedia</option>
                <option value="Digunakan">Digunakan</option>
                <option value="Servis">Servis</option>
              </select>
              <button
                type="submit"
                data-testid="submit-fleet-vehicle-btn"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer"
              >
                {editingVehicleId ? 'Simpan Unit' : '+ Tambah Unit'}
              </button>
            </div>
            {vehicleFormError && (
              <p className="text-xs text-rose-400">{vehicleFormError}</p>
            )}
          </form>
        )}

        <div
          data-testid="fleet-vehicles-list"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {selectableVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              data-testid={`fleet-vehicle-card-${vehicle.id}`}
              className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 ${
                isDark
                  ? 'bg-slate-950/75 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00B4D8]/15 text-[#00B4D8] border border-[#00B4D8]/30">
                    {vehicle.licensePlate}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      vehicle.status === 'Tersedia'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : vehicle.status === 'Digunakan'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {vehicle.status}
                  </span>
                </div>
                <h3 className="text-xs font-bold font-display">
                  {vehicle.model}
                </h3>
                <p className={`text-[11px] ${mutedText}`}>
                  Cabang: <strong>{vehicle.branch}</strong>
                </p>
              </div>

              {canManageFleet && (
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    data-testid={`edit-vehicle-btn-${vehicle.id}`}
                    onClick={() => handleStartEditVehicle(vehicle)}
                    className="px-2 py-1 rounded text-[10px] font-semibold bg-[#00B4D8]/15 text-[#00B4D8] cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-vehicle-btn-${vehicle.id}`}
                    onClick={() => onDeleteVehicle(vehicle.id)}
                    className="px-2 py-1 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* =====================================================================
          4. EDIT VEHICLE BOOKING MODAL (Strictly Accessible to `dev` & `executive`)
         ===================================================================== */}
      {editingBooking && canManageBookingSchedules && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-booking-modal-title"
          data-testid="edit-vehicle-booking-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSaveEditedBooking}
            className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-5 sm:p-6 space-y-4 ${surfaceCard}`}
          >
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
              <div className="flex items-center gap-2 text-[#00B4D8]">
                <Pencil className="w-4 h-4" />
                <h3
                  id="edit-booking-modal-title"
                  className="text-base font-bold font-display"
                >
                  Edit Jadwal Booking Kendaraan (vehicle_bookings)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label
                htmlFor="edit-booking-vehicle-select"
                className="block text-xs font-semibold text-emerald-400 mb-1"
              >
                Kendaraan Operasional (vehicle)
              </label>
              <select
                id="edit-booking-vehicle-select"
                data-testid="edit-booking-vehicle-select"
                value={editBookingVehicle}
                onChange={(e) => setEditBookingVehicle(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-semibold border ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {selectableVehicles.map((v) => {
                  const label = formatFleetVehicleOptionLabel(v);
                  return (
                    <option key={v.id} value={label}>
                      {label} — [{v.status} · {v.branch}]
                    </option>
                  );
                })}
                {!selectableVehicles.some(
                  (v) => formatFleetVehicleOptionLabel(v) === editBookingVehicle
                ) &&
                  editBookingVehicle && (
                    <option value={editBookingVehicle}>
                      {editBookingVehicle}
                    </option>
                  )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="edit-booking-start-time-input"
                  className="block text-xs font-medium mb-1"
                >
                  Waktu Mulai (start_time)
                </label>
                <input
                  id="edit-booking-start-time-input"
                  data-testid="edit-booking-start-time-input"
                  type="datetime-local"
                  required
                  value={editBookingStartTime}
                  onChange={(e) => setEditBookingStartTime(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono border ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-booking-end-time-input"
                  className="block text-xs font-medium mb-1"
                >
                  Waktu Selesai (end_time)
                </label>
                <input
                  id="edit-booking-end-time-input"
                  data-testid="edit-booking-end-time-input"
                  type="datetime-local"
                  required
                  value={editBookingEndTime}
                  onChange={(e) => setEditBookingEndTime(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono border ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-booking-purpose-input"
                className="block text-xs font-medium mb-1"
              >
                Keperluan / Tujuan (purpose)
              </label>
              <input
                id="edit-booking-purpose-input"
                data-testid="edit-booking-purpose-input"
                type="text"
                required
                value={editBookingPurpose}
                onChange={(e) => setEditBookingPurpose(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs border ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {editModalError && (
              <p className="text-xs text-rose-400 font-medium">
                {editModalError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                data-testid="save-edited-booking-btn"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {isSavingEdit
                    ? 'Menyimpan...'
                    : 'Simpan Perubahan ke Supabase'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
};
