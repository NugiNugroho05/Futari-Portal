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
} from 'lucide-react';
import {
  StaffMemberRecord,
  AttendanceRecord,
  LeaveRecordItem,
  CalendarEventItem,
  canViewAllAttendance,
  getTeamDashboardPersonnel,
  buildTeamDashboardExportLogs,
  calculateAttendanceExportTotals,
  calculateRegularWorkingHours,
  formatIDR,
  getGlassSurfaceClasses,
  COMPANY_DIVISIONS,
  syncAttendanceLogsWithLeave,
} from '../utils/futariLogic';

interface TeamAttendanceDashboardTabProps {
  currentUser: StaffMemberRecord;
  staffList: StaffMemberRecord[];
  attendanceLogs: AttendanceRecord[];
  payrollCycleLabel: string;
  onDownloadTeamPdf: (
    targetEmployee: StaffMemberRecord,
    logsToExport: AttendanceRecord[]
  ) => void;
  onDownloadTeamExcel: (
    targetEmployee: StaffMemberRecord,
    logsToExport: AttendanceRecord[]
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

  // Dynamically computed attendance logs (Regular Hours vs Overtime >= 20:00) strictly scoped to currently visible filtered rows on screen
  const exportableLogs = useMemo(
    () =>
      buildTeamDashboardExportLogs(
        currentUser,
        attendanceLogs,
        staffList,
        'ALL_VISIBLE',
        '2026-10-20',
        filteredMembers
      ),
    [currentUser, attendanceLogs, staffList, filteredMembers]
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

  // Specific attendance logs for the member opened in detail overlay
  const detailMemberLogs = useMemo(() => {
    if (!selectedDetailMember) return [];
    const directLogs = attendanceLogs.filter(
      (l) => l.staffId === selectedDetailMember.staffId
    );
    const memberExportLogs = buildTeamDashboardExportLogs(
      currentUser,
      directLogs,
      staffList,
      selectedDetailMember.staffId,
      '2026-10-20',
      [selectedDetailMember]
    );
    return syncAttendanceLogsWithLeave(
      memberExportLogs,
      leaveRecords,
      selectedDetailMember,
      calendarEvents
    );
  }, [selectedDetailMember, attendanceLogs, currentUser, staffList, leaveRecords, calendarEvents]);

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
      className="space-y-6"
    >
      {/* Top Header & Prominent Export Controls */}
      <div className={`p-5 sm:p-6 rounded-2xl ${surfaceCard}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight break-words">
              Team Management
            </h1>
          </div>

          {/* Prominent Download PDF & Download Excel Export Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={isExporting || exportableLogs.length === 0}
              data-testid="team-dashboard-download-pdf-btn"
              onClick={() =>
                onDownloadTeamPdf(exportRepresentativeProfile, exportableLogs)
              }
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              <FileDown className="w-4 h-4 shrink-0" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              disabled={isExporting || exportableLogs.length === 0}
              data-testid="team-dashboard-download-excel-btn"
              onClick={() =>
                onDownloadTeamExcel(exportRepresentativeProfile, exportableLogs)
              }
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>Download Excel</span>
            </button>
          </div>
        </div>

        {/* Dynamic KPI Strip (Regular Hours vs Overtime >= 20:00 & Live Team Status) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-700/40">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400">Personel Tercakup (RBAC)</p>
              <p
                data-testid="team-dashboard-visible-count"
                className="text-lg font-bold font-mono text-white mt-0.5 tabular-nums"
              >
                {filteredMembers.length} Personel
              </p>
              <p className="text-[11px] font-mono text-[#00B4D8]">
                {wfoCount} WFO · {wfeCount} WFE
              </p>
            </div>
            <Users className="w-5 h-5 text-[#00B4D8]" />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400">
                1. Total Jam Kerja (Regular Hours)
              </p>
              <p
                data-testid="team-dashboard-regular-hours"
                className="text-lg font-bold font-mono text-[#00B4D8] mt-0.5 tabular-nums"
              >
                {exportTotals.totalRegularWorkingHours} Jam
              </p>
              <p className="text-[10px] font-mono text-slate-400">
                Akumulasi Reguler (&lt; 20:00 WIB)
              </p>
            </div>
            <Clock className="w-5 h-5 text-[#00B4D8]" />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400">
                2. Total Jam Lembur (Overtime ≥ 20:00)
              </p>
              <p
                data-testid="team-dashboard-overtime-hours"
                className="text-lg font-bold font-mono text-emerald-400 mt-0.5 tabular-nums"
              >
                {exportTotals.totalOvertimeHours} Jam
              </p>
              <p className="text-[10px] font-mono text-emerald-400">
                Kompensasi: {formatIDR(exportTotals.totalOvertimePay)}
              </p>
            </div>
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400">Total Keterlambatan Tim</p>
              <p
                data-testid="team-dashboard-late-minutes"
                className="text-lg font-bold font-mono text-amber-400 mt-0.5 tabular-nums"
              >
                {exportTotals.totalLateMinutes} Menit
              </p>
              <p className="text-[10px] font-mono text-slate-400">
                Toleransi Check-In 10:05 WIB
              </p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Filter Bar & Team Roster / Attendance Table */}
      <div className={`p-4 sm:p-6 rounded-2xl ${surfaceCard} space-y-4`}>
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
                const memberLogs = exportableLogs.filter(
                  (l) => l.staffId === member.staffId
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
                          <span className="truncate">{member.roomName}</span>
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono tabular-nums">
                      <span className="text-emerald-400 font-semibold">
                        {latestLog?.checkInTime || member.checkInTime}
                      </span>
                      <span className="text-slate-500 mx-1">→</span>
                      <span className="text-slate-300">
                        {latestLog?.checkOutTime || '19:00'} WIB
                      </span>
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
                          member.lateMinutesMonth > 0
                            ? 'text-amber-400 font-bold'
                            : 'text-emerald-400'
                        }
                      >
                        {member.lateMinutesMonth} mnt
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
                    onClick={() => onDownloadTeamPdf(selectedDetailMember, detailMemberLogs)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    disabled={isExporting}
                    data-testid="personnel-detail-download-excel-btn"
                    onClick={() => onDownloadTeamExcel(selectedDetailMember, detailMemberLogs)}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-[11px] text-slate-400">Status Kehadiran</p>
                    <p className="text-base font-bold font-mono mt-0.5 text-[#00B4D8]">
                      {selectedDetailMember.workMode}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{selectedDetailMember.roomName}</p>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-[11px] text-slate-400">Total Jam Reguler</p>
                    <p className="text-base font-bold font-mono mt-0.5 text-emerald-400">
                      {detailMemberTotals.totalRegularWorkingHours} Jam
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Siklus: {payrollCycleLabel}</p>
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
