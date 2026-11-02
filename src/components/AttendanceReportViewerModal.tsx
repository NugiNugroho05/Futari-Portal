import React from 'react';
import {
  X,
  FileDown,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  CloudUpload,
} from 'lucide-react';
import {
  StaffMemberRecord,
  AttendanceRecord,
  formatIDR,
  OVERTIME_RATE_PER_HOUR,
  calculateRegularWorkingHours,
  calculateAttendanceExportTotals,
  getAttendanceJobDescription,
} from '../utils/futariLogic';

interface AttendanceReportViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: StaffMemberRecord;
  periodLabel: string;
  logs: AttendanceRecord[];
  isDark: boolean;
  onDownloadHtmlPdfFile: () => void;
  onDownloadExcelFile?: () => void;
  onSyncToGoogleDocs: () => void;
  isExporting?: boolean;
}

export const AttendanceReportViewerModal: React.FC<AttendanceReportViewerModalProps> = ({
  isOpen,
  onClose,
  employee,
  periodLabel,
  logs,
  isDark,
  onDownloadHtmlPdfFile,
  onDownloadExcelFile,
  onSyncToGoogleDocs,
  isExporting = false,
}) => {
  if (!isOpen) return null;

  const exportTotals = calculateAttendanceExportTotals(logs);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="structured-pdf-report-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div
        className={`w-full max-w-5xl max-h-[80vh] overflow-y-auto rounded-2xl border shadow-2xl my-4 p-0 ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Action Bar (Hidden during @media print) */}
        <div
          className={`no-print px-4 sm:px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0277BD] to-[#00B4D8] flex items-center justify-center text-white shrink-0">
              <FileDown className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="structured-pdf-report-title"
                className="text-sm font-bold font-display"
              >
                Document Viewer — Laporan Absensi &amp; Jam Kerja ({employee.name})
              </h2>
              <p className="text-xs text-[#00B4D8]">
                Format Finance (Mba Erlita) · Total Jam Kerja Reguler &amp; Total Jam Lembur (≥ 20:00)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onDownloadHtmlPdfFile}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 flex items-center gap-1.5 shadow-sm"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download PDF (.PDF)</span>
            </button>

            {onDownloadExcelFile && (
              <button
                type="button"
                onClick={onDownloadExcelFile}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Download Excel (.XLS)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                isDark
                  ? 'border-[#00B4D8] text-[#00B4D8] hover:bg-[#00B4D8]/15'
                  : 'border-[#0277BD] text-[#0277BD] hover:bg-[#0277BD]/10'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={onSyncToGoogleDocs}
              className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 ${
                isDark
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>Sync Google Docs</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup Pratinjau Laporan PDF"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-3 sm:p-6 bg-slate-950/30">
          <div
            id="futari-printable-attendance-report"
            data-testid="structured-pdf-document"
            className="bg-white text-slate-900 rounded-xl border border-slate-300 shadow-lg p-4 sm:p-8 mx-auto max-w-4xl"
          >
            {/* Document Formal Header with Top-Left Logo */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b-2 border-[#0277BD]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
                <img
                  src="logoFUTARI-1_5.png"
                  alt="Futari"
                  className="h-8 sm:h-11 object-contain self-start"
                />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#0277BD] uppercase">
                    PT FUTARI MARKETING SERVICES &amp; EVENT MANAGEMENT
                  </p>
                  <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 mt-0.5">
                    LAPORAN ABSENSI &amp; REKAP JAM KERJA (FINANCE)
                  </h1>
                  <p className="text-xs text-slate-600">
                    HQ: Jl. Nusa Indah No.33, RT.14/RW.5, Cipete Sel., Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12410
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right text-xs space-y-0.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 text-[#0277BD] font-bold border border-sky-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  TERVERIFIKASI FINANCE FUTARI
                </span>
                <p className="text-slate-500 font-mono mt-1">
                  Dicetak: {new Date().toLocaleDateString('id-ID')}
                </p>
              </div>
            </div>

            {/* Employee Details Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between sm:justify-start sm:gap-3">
                  <span className="text-slate-500 w-36 shrink-0">Nama Karyawan:</span>
                  <span className="font-bold text-slate-900">{employee.name}</span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-3">
                  <span className="text-slate-500 w-36 shrink-0">Jabatan (Role):</span>
                  <span className="font-semibold text-slate-800">{employee.role}</span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-3">
                  <span className="text-slate-500 w-36 shrink-0">Divisi:</span>
                  <span className="font-semibold text-slate-800">
                    {employee.divisionLabel}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between sm:justify-start sm:gap-3">
                  <span className="text-slate-500 w-36 shrink-0">Atasan Langsung:</span>
                  <span className="font-semibold text-slate-800">
                    {employee.supervisor}
                  </span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-3">
                  <span className="text-slate-500 w-36 shrink-0">Lokasi Cabang:</span>
                  <span className="font-semibold text-slate-800">
                    {employee.branch === 'JKT' ? 'Jakarta (JKT)' : 'Bandung'}
                  </span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-3">
                  <span className="text-slate-500 w-36 shrink-0">Periode Siklus:</span>
                  <span className="font-bold font-mono text-[#0277BD]">
                    {periodLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Mba Erlita Finance Summary Strip: 1. Total Jam Kerja & 2. Total Jam Lembur */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div
                data-testid="pdf-total-regular-hours-box"
                className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between"
              >
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#0277BD]">
                    1. Total Jam Kerja (Regular Working Hours)
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Akumulasi jam kerja reguler s/d pukul 20:00 WIB
                  </p>
                </div>
                <span className="text-lg font-extrabold font-mono text-[#0277BD]">
                  {exportTotals.totalRegularWorkingHours} Jam
                </span>
              </div>

              <div
                data-testid="pdf-total-overtime-hours-box"
                className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between"
              >
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    2. Total Jam Lembur (Overtime Hours ≥ 20:00)
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Dihitung ketat khusus jam kerja lewat pukul 20:00 WIB
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold font-mono text-emerald-700 block">
                    {exportTotals.totalOvertimeHours} Jam
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-emerald-600">
                    {formatIDR(exportTotals.totalOvertimePay)}
                  </span>
                </div>
              </div>
            </div>

            {/* Structured Attendance & Daily Task Description Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-[#0277BD] text-white">
                    <th className="py-2.5 px-2.5 border border-slate-300 font-semibold">
                      Date
                    </th>
                    <th className="py-2.5 px-2.5 border border-slate-300 font-semibold">
                      Status (WFO/WFE)
                    </th>
                    <th className="py-2.5 px-2.5 border border-slate-300 font-semibold text-right">
                      In
                    </th>
                    <th className="py-2.5 px-2.5 border border-slate-300 font-semibold text-right">
                      Out
                    </th>
                    <th className="py-2.5 px-2.5 border border-slate-300 font-semibold text-right">
                      Jam Kerja (Reguler)
                    </th>
                    <th className="py-2.5 px-2.5 border border-slate-300 font-semibold text-right">
                      Jam Lembur (≥20:00)
                    </th>
                    <th className="py-2.5 px-2.5 border border-slate-300 font-semibold">
                      Deskripsi Pekerjaan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-6 px-4 text-center text-slate-500 italic"
                      >
                        Belum ada data absensi tercatat pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const regHours =
                        typeof log.regularHours === 'number'
                          ? log.regularHours
                          : calculateRegularWorkingHours(
                              log.checkInTime,
                              log.checkOutTime
                            );
                      return (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-2.5 border border-slate-200 font-mono whitespace-nowrap">
                            {log.date}
                          </td>
                          <td className="py-2.5 px-2.5 border border-slate-200 font-semibold">
                            <span
                              className={
                                String(log.mode).toLowerCase().includes('cuti')
                                  ? 'text-amber-700'
                                  : log.mode === 'WFO'
                                  ? 'text-emerald-700'
                                  : 'text-[#0277BD]'
                              }
                            >
                              {String(log.mode).toLowerCase().includes('cuti')
                                ? 'Cuti (Leave)'
                                : log.isHybridTransition
                                ? `HYBRID (WFO → WFE ${log.wfeTransitionTime || ''})`
                                : log.mode}
                            </span>
                            <span className="block text-[10px] font-normal text-slate-500">
                              {log.staffName}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 border border-slate-200 text-right font-mono">
                            {log.checkInTime}
                          </td>
                          <td className="py-2.5 px-2.5 border border-slate-200 text-right font-mono">
                            {log.checkOutTime || '-'}
                          </td>
                          <td className="py-2.5 px-2.5 border border-slate-200 text-right font-mono font-bold text-[#0277BD]">
                            {regHours} jam
                          </td>
                          <td className="py-2.5 px-2.5 border border-slate-200 text-right font-mono font-semibold text-emerald-700">
                            {log.overtimeHours} jam ({formatIDR(log.overtimePay)})
                          </td>
                          <td className="py-2.5 px-2.5 border border-slate-200 text-slate-800">
                            <p className="font-medium whitespace-pre-line">
                              {getAttendanceJobDescription(log)}
                            </p>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <td colSpan={4} className="py-2.5 px-2.5 border border-slate-300">
                      TOTAL REKAPITULASI FINANCE ({logs.length} Hari Kerja · Telat:{' '}
                      {exportTotals.totalLateMinutes} mnt)
                    </td>
                    <td className="py-2.5 px-2.5 border border-slate-300 text-right font-mono text-[#0277BD]">
                      {exportTotals.totalRegularWorkingHours} jam
                    </td>
                    <td className="py-2.5 px-2.5 border border-slate-300 text-right font-mono text-emerald-700">
                      {exportTotals.totalOvertimeHours} jam (
                      {formatIDR(exportTotals.totalOvertimePay)})
                    </td>
                    <td className="py-2.5 px-2.5 border border-slate-300 text-[11px] font-normal text-slate-600">
                      Tarif Lembur ≥ 20:00: {formatIDR(OVERTIME_RATE_PER_HOUR)}/jam
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Signature Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600 gap-4">
              <div>
                <p className="font-semibold text-slate-800">
                  Catatan Kebijakan HR &amp; Finance Futari (Mba Erlita):
                </p>
                <p>
                  1. Total Jam Kerja (Regular Working Hours): {exportTotals.totalRegularWorkingHours} Jam.
                </p>
                <p>
                  2. Total Jam Lembur (Overtime Hours ≥ 20:00 WIB): {exportTotals.totalOvertimeHours} Jam ({formatIDR(exportTotals.totalOvertimePay)}).
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-slate-500">Disetujui oleh Atasan Langsung:</p>
                <p className="font-bold text-slate-900 mt-4 underline">
                  {employee.supervisor}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
