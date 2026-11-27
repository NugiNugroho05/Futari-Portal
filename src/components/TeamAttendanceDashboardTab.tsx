import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  FileDown,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  Search,
  CheckCircle2,
  Building2,
  MapPin,
  Sparkles,
  X,
  Printer,
  Calendar,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import {
  StaffMemberRecord,
  AttendanceRecord,
  LeaveRecordItem,
  CalendarEventItem,
  PayrollCycleOption,
  canViewAllAttendance,
  canSelectHistoricalPayrollCycle,
  getRecentPayrollCycles,
  formatCustomDateRangeLabel,
  filterAttendanceLogsByDateRange,
  getTeamDashboardPersonnel,
  buildTeamDashboardExportLogs,
  calculateAttendanceExportTotals,
  calculateRegularWorkingHours,
  formatIDR,
  formatRoomDisplayName,
  getGlassSurfaceClasses,
  COMPANY_DIVISIONS,
  syncAttendanceLogsWithLeave,
  toJakartaDateKey,
} from '../utils/futariLogic';

interface TeamAttendanceDashboardTabProps {
  currentUser: StaffMemberRecord;
  staffList: StaffMemberRecord[];
  attendanceLogs: AttendanceRecord[];
  payrollCycleLabel: string;
  payrollCycles?: PayrollCycleOption[];
  selectedPeriodId?: string;
  onSelectPeriodId?: (periodId: string) => void;
  customStartDate?: string;
  customEndDate?: string;
  onChangeCustomStartDate?: (date: string) => void;
  onChangeCustomEndDate?: (date: string) => void;
  activePeriodRange?: {
    startDate: string;
    endDate: string;
    label: string;
    isCurrent: boolean;
    isCustom?: boolean;
  };
  isLoadingPeriod?: boolean;
  onDownloadTeamPdf: (
    targetEmployee: StaffMemberRecord,
    logsToExport: AttendanceRecord[],
    periodLabel?: string,
    dateRange?: { startDate: string; endDate: string }
  ) => void;
  onDownloadTeamExcel: (
    targetEmployee: StaffMemberRecord,
    logsToExport: AttendanceRecord[],
    periodLabel?: string,
    dateRange?: { startDate: string; endDate: string }
  ) => void;
  isExporting: boolean;
  isDark: boolean;
  leaveRecords?: LeaveRecordItem[];
  calendarEvents?: CalendarEventItem[];
}

export const TeamAttendanceDashboardTab: React.FC<TeamAttendanceDashboardTabProps> = ({
  currentUser,
  staffList,
  attendanceLogs,
  payrollCycleLabel,
  payrollCycles: externalPayrollCycles,
  selectedPeriodId: externalSelectedPeriodId,
  onSelectPeriodId,
  customStartDate: externalCustomStartDate,
  customEndDate: externalCustomEndDate,
  onChangeCustomStartDate,
  onChangeCustomEndDate,
  activePeriodRange: externalActivePeriodRange,
  isLoadingPeriod = false,
  onDownloadTeamPdf,
  onDownloadTeamExcel,
  isExporting,
  isDark,
  leaveRecords = [],
  calendarEvents = [],
}) => {
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'WFO' | 'WFE' | 'OFFLINE'>('ALL');
  const [selectedDetailMember, setSelectedDetailMember] = useState<StaffMemberRecord | null>(null);
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState<boolean>(false);

  const fallbackCycles = useMemo(() => getRecentPayrollCycles(new Date(), 12), []);
  const payrollCycles =
    externalPayrollCycles && externalPayrollCycles.length > 0
      ? externalPayrollCycles
      : fallbackCycles;

  const [localPeriodId, setLocalPeriodId] = useState<string>(
    payrollCycles[0]?.id || ''
  );
  const [localCustomStart, setLocalCustomStart] = useState<string>(
    payrollCycles[0]?.startDate || ''
  );
  const [localCustomEnd, setLocalCustomEnd] = useState<string>(
    payrollCycles[0]?.endDate || ''
  );

  const selectedPeriodId =
    externalSelectedPeriodId !== undefined
      ? externalSelectedPeriodId
      : localPeriodId;
  const customStartDate =
    externalCustomStartDate !== undefined
      ? externalCustomStartDate
      : localCustomStart;
  const customEndDate =
    externalCustomEndDate !== undefined
      ? externalCustomEndDate
      : localCustomEnd;

  const handleChangePeriodId = (nextId: string) => {
    if (onSelectPeriodId) {
      onSelectPeriodId(nextId);
    } else {
      setLocalPeriodId(nextId);
    }
  };

  const handleChangeCustomStart = (nextDate: string) => {
    if (onChangeCustomStartDate) {
      onChangeCustomStartDate(nextDate);
    } else {
      setLocalCustomStart(nextDate);
    }
  };

  const handleChangeCustomEnd = (nextDate: string) => {
    if (onChangeCustomEndDate) {
      onChangeCustomEndDate(nextDate);
    } else {
      setLocalCustomEnd(nextDate);
    }
  };

  const effectivePeriod = useMemo(() => {
    if (externalActivePeriodRange) {
      return externalActivePeriodRange;
    }
    if (selectedPeriodId === 'CUSTOM') {
      const rawStart = customStartDate || payrollCycles[0]?.startDate || '';
      const rawEnd = customEndDate || payrollCycles[0]?.endDate || '';
      const startDate = rawStart <= rawEnd ? rawStart : rawEnd;
      const endDate = rawStart <= rawEnd ? rawEnd : rawStart;
      return {
        startDate,
        endDate,
        label: formatCustomDateRangeLabel(startDate, endDate),
        isCurrent: false,
        isCustom: true,
      };
    }
    const found =
      payrollCycles.find((c) => c.id === selectedPeriodId) || payrollCycles[0];
    return {
      startDate: found?.startDate || '',
      endDate: found?.endDate || '',
      label: found?.label || payrollCycleLabel,
      isCurrent: Boolean(found?.isCurrent),
      isCustom: false,
    };
  }, [
    externalActivePeriodRange,
    selectedPeriodId,
    customStartDate,
    customEndDate,
    payrollCycles,
    payrollCycleLabel,
  ]);

  const canSelectPeriod = useMemo(
    () => canSelectHistoricalPayrollCycle(currentUser, staffList),
    [currentUser, staffList]
  );

  const isGlobalViewer = useMemo(
    () => canViewAllAttendance(currentUser),
    [currentUser]
  );

  // Visible personnel governed strictly by Dynamic RBAC Filtering Logic:
  // - Global View: Executive, Finance, Digital (nuginugroho2005@gmail.com) see ALL company personnel.
  // - Team View (For Everyone Else): PM, PIC, Admin, or any other role ONLY see their own attendance data
  //   AND the data of their direct team members (personnel who report directly to them, or who share the exact same supervisor).
  const visibleTeamMembers = useMemo(
    () => getTeamDashboardPersonnel(currentUser, staffList),
    [currentUser, staffList]
  );

  const filteredMembers = useMemo(() => {
    return visibleTeamMembers.filter((member) => {
      if (selectedDivision !== 'ALL') {
        const memDiv = (member.division || '').toLowerCase().trim();
        const memDivLabel = (member.divisionLabel || '').toLowerCase().trim();
        const selDiv = selectedDivision.toLowerCase().trim();
        if (memDiv !== selDiv && memDivLabel !== selDiv) {
          return false;
        }
      }
      if (modeFilter !== 'ALL' && member.workMode !== modeFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        member.name.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q) ||
        member.divisionLabel.toLowerCase().includes(q) ||
        member.supervisor.toLowerCase().includes(q)
      );
    });
  }, [visibleTeamMembers, selectedDivision, modeFilter, searchQuery]);

  const todayIsoKey = useMemo(() => toJakartaDateKey(new Date()), []);

  const periodRangeArg = useMemo(
    () =>
      effectivePeriod.startDate && effectivePeriod.endDate
        ? {
            startDate: effectivePeriod.startDate,
            endDate: effectivePeriod.endDate,
          }
        : undefined,
    [effectivePeriod.startDate, effectivePeriod.endDate]
  );

  // Period-filtered attendance logs strictly scoped to selected payroll cycle / custom date range
  const periodFilteredAttendanceLogs = useMemo(
    () =>
      periodRangeArg
        ? filterAttendanceLogsByDateRange(
            attendanceLogs,
            periodRangeArg.startDate,
            periodRangeArg.endDate
          )
        : attendanceLogs,
    [attendanceLogs, periodRangeArg]
  );

  // Dynamically computed attendance logs (Regular Hours vs Overtime >= 20:00) strictly scoped to currently visible filtered rows & selected period
  const exportableLogs = useMemo(
    () =>
      buildTeamDashboardExportLogs(
        currentUser,
        periodFilteredAttendanceLogs,
        staffList,
        'ALL_VISIBLE',
        todayIsoKey,
        filteredMembers,
        {
          startDate: periodRangeArg?.startDate,
          endDate: periodRangeArg?.endDate,
          synthesizeMissing: effectivePeriod.isCurrent,
        }
      ),
    [
      currentUser,
      periodFilteredAttendanceLogs,
      staffList,
      filteredMembers,
      todayIsoKey,
      periodRangeArg,
      effectivePeriod.isCurrent,
    ]
  );

  const exportTotals = useMemo(
    () => calculateAttendanceExportTotals(exportableLogs),
    [exportableLogs]
  );

  const exportRepresentativeProfile = useMemo<StaffMemberRecord>(() => {
    return {
      ...currentUser,
      name: isGlobalViewer
        ? `Global Seluruh Karyawan (${filteredMembers.length} Personel)`
        : `Tim ${currentUser.name} (${filteredMembers.length} Anggota)`,
    };
  }, [filteredMembers, currentUser, isGlobalViewer]);

  // Specific attendance logs for the member opened in detail overlay (scoped to selected period)
  const detailMemberLogs = useMemo(() => {
    if (!selectedDetailMember) return [];
    const targetEmailLower = (selectedDetailMember.email || '').trim().toLowerCase();
    const directLogs = periodFilteredAttendanceLogs.filter(
      (l) =>
        l.staffId === selectedDetailMember.staffId ||
        (Boolean(targetEmailLower) &&
          (l.email || '').trim().toLowerCase() === targetEmailLower)
    );
    const memberExportLogs = buildTeamDashboardExportLogs(
      currentUser,
      directLogs,
      staffList,
      selectedDetailMember.staffId,
      todayIsoKey,
      [selectedDetailMember],
      {
        startDate: periodRangeArg?.startDate,
        endDate: periodRangeArg?.endDate,
        synthesizeMissing: effectivePeriod.isCurrent,
      }
    );
    return syncAttendanceLogsWithLeave(
      memberExportLogs,
      leaveRecords,
      selectedDetailMember,
      calendarEvents,
      periodRangeArg
    );
  }, [
    selectedDetailMember,
    periodFilteredAttendanceLogs,
    currentUser,
    staffList,
    leaveRecords,
    calendarEvents,
    todayIsoKey,
    periodRangeArg,
    effectivePeriod.isCurrent,
  ]);

  const detailMemberTotals = useMemo(
    () => calculateAttendanceExportTotals(detailMemberLogs),
    [detailMemberLogs]
  );

  const wfoCount = useMemo(
    () => filteredMembers.filter((m) => m.workMode === 'WFO').length,
    [filteredMembers]
  );
  const wfeCount = useMemo(
    () => filteredMembers.filter((m) => m.workMode === 'WFE').length,
    [filteredMembers]
  );

  const surfaceCard = getGlassSurfaceClasses(isDark);
  const mutedText = isDark ? 'text-slate-300' : 'text-slate-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      data-testid="team-attendance-dashboard-tab"
      className="space-y-3.5 md:space-y-6"
    >
      {/* Top Header & Prominent Export Controls */}
      <div className={`p-3.5 sm:p-5 md:p-6 rounded-2xl ${surfaceCard}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 md:gap-4">
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-display tracking-tight break-words">
                Team Management
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-2 md:px-2.5 py-0.5 rounded-md text-[10px] md:text-[11px] font-mono font-semibold bg-[#00B4D8]/15 text-[#00B4D8] border border-[#00B4D8]/30">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>{effectivePeriod.label}</span>
                </span>
                {!effectivePeriod.isCurrent && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    {effectivePeriod.isCustom ? 'Kustom' : 'Riwayat'}
                  </span>
                )}
                {isLoadingPeriod && (
                  <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] font-mono text-slate-400">
                    <RefreshCw className="w-3 h-3 animate-spin text-[#00B4D8]" />
                    <span>Memuat...</span>
                  </span>
                )}
              </div>
            </div>

            {/* Mobile Collapsible Toggle for Period Selector & Export Buttons */}
            <button
              type="button"
              data-testid="mobile-team-controls-toggle"
              onClick={() => setIsMobileControlsOpen((prev) => !prev)}
              className={`md:hidden px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border flex items-center gap-1 shrink-0 cursor-pointer ${
                isMobileControlsOpen
                  ? 'bg-[#0277BD] text-white border-[#00B4D8]'
                  : isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              <span>Filter &amp; Export</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  isMobileControlsOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          {/* Prominent Download PDF & Download Excel Export Buttons */}
          <div
            className={`${
              isMobileControlsOpen ? 'grid' : 'hidden md:flex'
            } grid-cols-2 md:flex md:flex-wrap items-center gap-2 md:gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-700/30`}
          >
            <button
              type="button"
              disabled={isExporting || exportableLogs.length === 0}
              data-testid="team-dashboard-download-pdf-btn"
              onClick={() =>
                onDownloadTeamPdf(
                  exportRepresentativeProfile,
                  exportableLogs,
                  effectivePeriod.label,
                  periodRangeArg
                )
              }
              className="px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 transition-all flex items-center justify-center gap-1.5 md:gap-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              disabled={isExporting || exportableLogs.length === 0}
              data-testid="team-dashboard-download-excel-btn"
              onClick={() =>
                onDownloadTeamExcel(
                  exportRepresentativeProfile,
                  exportableLogs,
                  effectivePeriod.label,
                  periodRangeArg
                )
              }
              className="px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-1.5 md:gap-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
              <span>Download Excel</span>
            </button>
          </div>
        </div>

        {/* Payroll Cycle Period Selector (Management / Finance / HR / Supervisor) */}
        {canSelectPeriod && (
          <div
            data-testid="team-payroll-period-bar"
            className={`${
              isMobileControlsOpen ? 'flex' : 'hidden md:flex'
            } mt-3 md:mt-4 pt-3 md:pt-3.5 border-t border-slate-700/40 flex-col sm:flex-row sm:items-center gap-2 md:gap-2.5`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#00B4D8] shrink-0" />
              <label
                htmlFor="team-payroll-period-select"
                className="text-[11px] md:text-xs font-semibold text-[#00B4D8] whitespace-nowrap"
              >
                Periode Siklus Payroll:
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-1">
              <select
                id="team-payroll-period-select"
                data-testid="team-payroll-period-select"
                value={selectedPeriodId}
                onChange={(e) => handleChangePeriodId(e.target.value)}
                className={`w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {payrollCycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.label}
                    {cycle.isCurrent ? ' (Siklus Aktif)' : ''}
                  </option>
                ))}
                <option value="CUSTOM">Filter Tanggal Kustom...</option>
              </select>

              {selectedPeriodId === 'CUSTOM' && (
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
                  <input
                    type="date"
                    aria-label="Tanggal Mulai Kustom"
                    data-testid="team-custom-start-date"
                    value={customStartDate}
                    onChange={(e) => handleChangeCustomStart(e.target.value)}
                    className={`w-full sm:w-auto px-2.5 py-1.5 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="hidden sm:inline text-xs text-slate-400 font-mono">s/d</span>
                  <input
                    type="date"
                    aria-label="Tanggal Akhir Kustom"
                    data-testid="team-custom-end-date"
                    value={customEndDate}
                    onChange={(e) => handleChangeCustomEnd(e.target.value)}
                    className={`w-full sm:w-auto px-2.5 py-1.5 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dynamic KPI Strip (Compact 2x2 Grid on Mobile < 768px, 4-Column on Desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3 mt-3.5 md:mt-5 pt-3 md:pt-4 border-t border-slate-700/40">
          <div className="p-2.5 md:p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[10px] md:text-[11px] text-slate-400 truncate">Personel Tercakup</p>
              <p
                data-testid="team-dashboard-visible-count"
                className="text-base md:text-lg font-bold font-mono text-white mt-0.5 tabular-nums truncate"
              >
                {filteredMembers.length} Org
              </p>
              <p className="text-[10px] md:text-[11px] font-mono text-[#00B4D8] truncate">
                {wfoCount} WFO · {wfeCount} WFE
              </p>
            </div>
            <Users className="w-4 h-4 md:w-5 md:h-5 text-[#00B4D8] shrink-0" />
          </div>

          <div className="p-2.5 md:p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[10px] md:text-[11px] text-slate-400 truncate">
                Total Jam Kerja
              </p>
              <p
                data-testid="team-dashboard-regular-hours"
                className="text-base md:text-lg font-bold font-mono text-[#00B4D8] mt-0.5 tabular-nums truncate"
              >
                {exportTotals.totalRegularWorkingHours} Jam
              </p>
              <p className="text-[10px] font-mono text-slate-400 truncate">
                Reguler (&lt; 20:00)
              </p>
            </div>
            <Clock className="w-4 h-4 md:w-5 md:h-5 text-[#00B4D8] shrink-0" />
          </div>

          <div className="p-2.5 md:p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[10px] md:text-[11px] text-slate-400 truncate">
                Total Jam Lembur
              </p>
              <p
                data-testid="team-dashboard-overtime-hours"
                className="text-base md:text-lg font-bold font-mono text-emerald-400 mt-0.5 tabular-nums truncate"
              >
                {exportTotals.totalOvertimeHours} Jam
              </p>
              <p className="text-[10px] font-mono text-emerald-400 truncate">
                {formatIDR(exportTotals.totalOvertimePay)}
              </p>
            </div>
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 shrink-0" />
          </div>

          <div className="p-2.5 md:p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-[10px] md:text-[11px] text-slate-400 truncate">Keterlambatan Tim</p>
              <p
                data-testid="team-dashboard-late-minutes"
                className="text-base md:text-lg font-bold font-mono text-amber-400 mt-0.5 tabular-nums truncate"
              >
                {exportTotals.totalLateMinutes} Menit
              </p>
              <p className="text-[10px] font-mono text-slate-400 truncate">
                Tol. 10:05 WIB
              </p>
            </div>
            <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-amber-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* Filter Bar & Team Roster / Attendance Table */}
      <div className={`p-3.5 sm:p-5 md:p-6 rounded-2xl ${surfaceCard} space-y-3 md:space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <label
              htmlFor="team-division-selector"
              className="text-xs font-semibold text-[#00B4D8]"
            >
              Filter Divisi:
            </label>
            <select
              id="team-division-selector"
              data-testid="team-dashboard-division-select"
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <option value="ALL">Show All ({visibleTeamMembers.length} Personel)</option>
              {COMPANY_DIVISIONS.map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-950 text-xs font-mono">
              {(['ALL', 'WFO', 'WFE', 'OFFLINE'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setModeFilter(mode)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    modeFilter === mode
                      ? 'bg-[#00B4D8] text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              aria-label="Cari Anggota Tim"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, jabatan, atasan..."
              className={`pl-8 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>
        </div>

        {/* Team Member Attendance & Overtime Breakdown Table */}
        <div className="overflow-x-auto w-full rounded-xl border border-slate-800/80">
          <table
            data-testid="team-attendance-table"
            className="w-full text-left border-collapse text-xs min-w-[780px]"
          >
            <thead>
              <tr className="bg-slate-950/90 text-slate-300 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 font-semibold">Personel &amp; Jabatan</th>
                <th className="py-3 px-3 font-semibold">Supervisor</th>
                <th className="py-3 px-3 font-semibold">Status &amp; Ruangan</th>
                <th className="py-3 px-3 font-semibold">Check-In / Out</th>
                <th className="py-3 px-3 font-semibold text-right">
                  Jam Reguler
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  Lembur (≥ 20:00)
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  Terlambat (Bln)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMembers.map((member) => {
                const memberEmailLower = (member.email || '').trim().toLowerCase();
                const memberLogs = exportableLogs.filter(
                  (l) =>
                    l.staffId === member.staffId ||
                    (Boolean(memberEmailLower) &&
                      (l.email || '').trim().toLowerCase() === memberEmailLower)
                );
                const latestLog = memberLogs[0];
                const regHours = memberLogs.reduce(
                  (sum, l) =>
                    sum +
                    (typeof l.regularHours === 'number'
                      ? l.regularHours
                      : calculateRegularWorkingHours(l.checkInTime, l.checkOutTime)),
                  0
                );
                const otHours = memberLogs.reduce(
                  (sum, l) => sum + (Number(l.overtimeHours) || 0),
                  0
                );
                const otPay = memberLogs.reduce(
                  (sum, l) => sum + (Number(l.overtimePay) || 0),
                  0
                );
                const periodLateMinutes = memberLogs.reduce(
                  (sum, l) => sum + (Number(l.lateMinutes) || 0),
                  0
                );

                return (
                  <tr
                    key={member.staffId}
                    data-testid={`team-member-row-${member.staffId}`}
                    onClick={() => setSelectedDetailMember(member)}
                    className={`transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-slate-800/40' : 'hover:bg-sky-50/70'
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs font-mono shrink-0"
                          style={{ backgroundColor: member.avatarColor }}
                        >
                          {member.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold truncate hover:text-[#00B4D8] transition-colors">
                            {member.name}
                          </p>
                          <p className="text-[11px] text-[#00B4D8] truncate">
                            {member.role} · {member.divisionLabel}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 break-words">
                      <span className="font-medium">{member.supervisor}</span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            member.workMode === 'WFO'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : member.workMode === 'WFE'
                              ? 'bg-[#00B4D8]/20 text-[#00B4D8] border border-[#00B4D8]/40'
                              : 'bg-slate-700/40 text-slate-400'
                          }`}
                        >
                          {member.workMode}
                        </span>
                        <span className="text-[11px] text-slate-400 inline-flex items-center gap-1 truncate max-w-[160px]">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {formatRoomDisplayName(member.roomName)}
                          </span>
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono tabular-nums">
                      {latestLog ? (
                        <div>
                          <span className="text-emerald-400 font-semibold">
                            {latestLog.checkInTime}
                          </span>
                          <span className="text-slate-500 mx-1">→</span>
                          <span className="text-slate-300">
                            {latestLog.checkOutTime || '-'} WIB
                          </span>
                          <p className="text-[10px] text-slate-400">
                            {memberLogs.length} entri · {latestLog.date}
                          </p>
                        </div>
                      ) : effectivePeriod.isCurrent ? (
                        <>
                          <span className="text-emerald-400 font-semibold">
                            {member.checkInTime}
                          </span>
                          <span className="text-slate-500 mx-1">→</span>
                          <span className="text-slate-300">-</span>
                        </>
                      ) : (
                        <span className="text-slate-500 text-[11px]">
                          0 entri periode ini
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-[#00B4D8]">
                      {Math.round(regHours * 10) / 10} Jam
                    </td>

                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      <span
                        className={
                          otHours > 0
                            ? 'text-emerald-400 font-bold'
                            : 'text-slate-400'
                        }
                      >
                        {Math.round(otHours * 10) / 10} Jam
                      </span>
                      {otPay > 0 && (
                        <p className="text-[10px] text-emerald-400">
                          {formatIDR(otPay)}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      <span
                        className={
                          periodLateMinutes > 0
                            ? 'text-amber-400 font-bold'
                            : 'text-emerald-400'
                        }
                      >
                        {periodLateMinutes} mnt
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Personnel Detail Overlay Modal */}
      <AnimatePresence>
        {selectedDetailMember && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="personnel-detail-overlay-title"
            data-testid="personnel-detail-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl border shadow-2xl my-4 flex flex-col ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Modal Header */}
              <div
                className={`p-5 sm:p-6 border-b flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 ${
                  isDark ? 'bg-slate-950/90 backdrop-blur-md border-slate-800' : 'bg-slate-50/90 backdrop-blur-md border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base font-mono shrink-0 shadow-md"
                    style={{ backgroundColor: selectedDetailMember.avatarColor }}
                  >
                    {selectedDetailMember.initials}
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="personnel-detail-overlay-title"
                      className="text-base sm:text-lg font-bold font-display truncate"
                    >
                      {selectedDetailMember.name}
                    </h2>
                    <p className="text-xs text-[#00B4D8] font-medium truncate">
                      {selectedDetailMember.role} · {selectedDetailMember.divisionLabel} · Supervisor: {selectedDetailMember.supervisor}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isExporting}
                    data-testid="personnel-detail-download-pdf-btn"
                    onClick={() =>
                      onDownloadTeamPdf(
                        selectedDetailMember,
                        detailMemberLogs,
                        effectivePeriod.label,
                        periodRangeArg
                      )
                    }
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    disabled={isExporting}
                    data-testid="personnel-detail-download-excel-btn"
                    onClick={() =>
                      onDownloadTeamExcel(
                        selectedDetailMember,
                        detailMemberLogs,
                        effectivePeriod.label,
                        periodRangeArg
                      )
                    }
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Download Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDetailMember(null)}
                    aria-label="Tutup Detail Personel"
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Metrics & Detailed Logs */}
              <div className="p-5 sm:p-6 space-y-5">
                {/* 4 Metrics Strip for this specific user */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
                  <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-[11px] text-slate-400">Status Kehadiran</p>
                    <p className="text-base font-bold font-mono mt-0.5 text-[#00B4D8]">
                      {selectedDetailMember.workMode}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatRoomDisplayName(selectedDetailMember.roomName)}
                    </p>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-[11px] text-slate-400">Total Jam Reguler</p>
                    <p className="text-base font-bold font-mono mt-0.5 text-emerald-400">
                      {detailMemberTotals.totalRegularWorkingHours} Jam
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Siklus: {effectivePeriod.label}
                    </p>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-[11px] text-slate-400">Total Jam Lembur (≥ 20:00)</p>
                    <p className="text-base font-bold font-mono mt-0.5 text-amber-400">
                      {detailMemberTotals.totalOvertimeHours} Jam
                    </p>
                    <p className="text-[10px] text-emerald-400 mt-0.5">{formatIDR(detailMemberTotals.totalOvertimePay)}</p>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-[11px] text-slate-400">Akumulasi Terlambat</p>
                    <p className="text-base font-bold font-mono mt-0.5 text-rose-400">
                      {detailMemberTotals.totalLateMinutes} Menit
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Toleransi 10:05 WIB</p>
                  </div>
                </div>

                {/* Detailed Attendance Records Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#00B4D8] uppercase tracking-wider font-mono">
                      Riwayat Rekap Absensi ({detailMemberLogs.length} Entri)
                    </h3>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                    <table className="w-full text-left border-collapse text-xs min-w-[620px]">
                      <thead>
                        <tr className="bg-slate-950 text-slate-300 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                          <th className="py-2.5 px-3 font-semibold">Tanggal</th>
                          <th className="py-2.5 px-3 font-semibold">Mode</th>
                          <th className="py-2.5 px-3 font-semibold">Check-In / Out</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Jam Reguler</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Lembur (≥ 20:00)</th>
                          <th className="py-2.5 px-3 font-semibold">Catatan / Jobdesk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {detailMemberLogs.length > 0 ? (
                          detailMemberLogs.map((log) => (
                            <tr key={log.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                              <td className="py-2.5 px-3 font-mono">{log.date}</td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                    log.mode === 'WFO'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-[#00B4D8]/20 text-[#00B4D8]'
                                  }`}
                                >
                                  {log.mode}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums">
                                <span className="text-emerald-400 font-semibold">{log.checkInTime}</span>
                                <span className="text-slate-500 mx-1">→</span>
                                <span className="text-slate-300">{log.checkOutTime || '-'}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#00B4D8]">
                                {log.regularHours ?? calculateRegularWorkingHours(log.checkInTime, log.checkOutTime)} Jam
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                <span className={Number(log.overtimeHours) > 0 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                                  {log.overtimeHours || 0} Jam
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-300 text-[11px] max-w-[200px] truncate" title={log.overtimeNote || log.task_description || '-'}>
                                {log.overtimeNote || log.task_description || '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-400">
                              Belum ada data absensi tercatat untuk periode ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
