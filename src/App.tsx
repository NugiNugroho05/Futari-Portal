/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun,
  Moon,
  Building2,
  Clock,
  Wallet,
  Camera,
  MapPin,
  FileDown,
  FileSpreadsheet,
  Sparkles,
  LogOut,
  Lock,
  Mail,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  Layers,
  Receipt,
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  Calendar as CalendarIcon,
  User as UserIcon,
  Users,
  Printer,
  Shield,
  X,
  FileText,
  Car,
  CheckSquare,
  Menu,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';
import {
  INITIAL_FUTARI_STAFF,
  INITIAL_EVENT_BUDGETS,
  INITIAL_PETTY_CASH_EVENTS,
  INITIAL_PETTY_CASH_EXPENSES,
  INITIAL_ATTENDANCE_LOGS,
  INITIAL_CHAT_MESSAGES,
  INITIAL_LEAVE_RECORDS,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_DAILY_CHECKLISTS,
  INITIAL_COMPANY_SOPS,
  INITIAL_FLEET_VEHICLES,
  INITIAL_WORK_TASKS,
  StaffMemberRecord,
  DivisionType,
  AttendanceRecord,
  PettyCashRecord,
  EventBudgetRecord,
  ChatMessageItem,
  LeaveRecordItem,
  CalendarEventItem,
  DailyChecklistRecord,
  CompanySopItem,
  FleetVehicleItem,
  FleetVehicleStatus,
  WorkTaskItem,
  calculateLateMinutes,
  calculateOvertime,
  getActivePayrollCycle,
  calculatePettyCashSummary,
  formatIDR,
  OVERTIME_RATE_PER_HOUR,
  canViewAllPettyCash,
  filterVisibleEventsForUser,
  filterVisiblePettyCashExpenses,
  canViewAllAttendance as checkCanViewAllAttendance,
  canViewOtherStaffAttendance,
  canUserViewStaffAttendance,
  getAccessibleAttendancePersonnel,
  isDirectReportOf,
  filterAttendanceLogsForUser,
  filterActiveWfoPersonnel,
  groupActiveWfoByRoom,
  FUTARI_HQ_ADDRESS,
  DEVELOPER_SUPERADMIN_EMAIL,
  DEVELOPER_SUPERADMIN_PASSWORD,
  isDeveloperSuperadmin,
  authenticateStaffCredentials,
  updateStaffRoleAndDivision,
  toggleStaffSuspensionStatus,
  deleteStaffMember,
  registerNewGoogleWorkspaceAccount,
  NewWorkspaceAccountInput,
  toggleDailyChecklistItem,
  addDailyChecklistItem,
  editDailyChecklistItem,
  deleteDailyChecklistItem,
  updateOwnProfileSelfService,
  SelfServiceProfileUpdateInput,
  superadminUpdateAnyProfile,
  SuperadminProfileUpdateInput,
  mapFirebaseUserToStaffProfile,
  PITI_PERSONA_SYSTEM_INSTRUCTION,
  calculateRegularWorkingHours,
  calculateAttendanceExportTotals,
  applyHybridWfoToWfeTransition,
  transitionStaffWfoToWfe,
  applyHybridWfeToWfoTransition,
  transitionStaffWfeToWfo,
  addCompanySop,
  updateCompanySop,
  deleteCompanySop,
  addFleetVehicle,
  updateFleetVehicle,
  deleteFleetVehicle,
  addWorkTask,
  toggleWorkTaskCompletion,
  updateWorkTask,
  SupabaseTaskRow,
  mapSupabaseTaskRowToWorkTask,
  canCreateOrAssignTasks,
  dueDateInputToIso,
  toLocalDateKey,
  getAttendanceJobDescription,
  mapSupabaseAttendanceRowToRecord,
  SPLASH_DURATION_MS,
  getGlassSurfaceClasses,
  buildSplashWelcomeConfig,
  canAccessTeamAttendanceTab,
  canEditOrDeleteVehicleBooking,
  VehicleBookingRow,
  mapVehicleBookingRowToCalendarEvent,
  PcEventRow,
  PcTransactionRow,
  hasGlobalRoleAccess,
  hasGlobalPettyCashAccess,
  canUserAccessPcEvent,
  filterAccessiblePcEvents,
  mapPcEventRowToEventBudgetRecord,
  mapPcTransactionRowToPettyCashRecord,
  DEFAULT_UNAUTHENTICATED_STAFF,
  SupabasePersonnelRow,
  mapSupabasePersonnelToStaffRecord,
  mapSupabasePersonnelListToStaffList,
  SupabaseAttendanceRow,
  isAttendanceRowActiveForToday,
  applyActiveAttendanceToStaffList,
  formatRealTimeHHMM,
  syncAttendanceLogsWithLeave,
} from './utils/futariLogic';
import { supabase } from './supabaseClient';
import {
  getActiveSessionEmail,
  tryGetActiveSessionUser,
} from './services/sessionAuth';
import {
  exportMonthlyAttendanceReportPDF,
  exportMonthlyAttendanceReportExcel,
  exportPettyCashExcelWithImages,
  createGoogleCalendarEvent,
} from './services/workspaceApi';
import { VirtualOffice3D } from './components/VirtualOffice3D';
import { PhotoWatermarkModal } from './components/PhotoWatermarkModal';
import { AttendanceReportViewerModal } from './components/AttendanceReportViewerModal';
import { CoworkerChatTab } from './components/CoworkerChatTab';
import { LeaveCalendarTab } from './components/LeaveCalendarTab';
import { ProfileTab } from './components/ProfileTab';
import { UserManagementTab } from './components/UserManagementTab';
import { SopManagementTab } from './components/SopManagementTab';
import { FleetManagementTab } from './components/FleetManagementTab';
import { TasksManagementTab } from './components/TasksManagementTab';
import { TeamAttendanceDashboardTab } from './components/TeamAttendanceDashboardTab';

type NavTab =
  | 'home'
  | 'attendance'
  | 'team_attendance'
  | 'pettycash'
  | 'sop'
  | 'fleet'
  | 'tasks'
  | 'chat'
  | 'leave'
  | 'profile'
  | 'user_management';

export { PITI_PERSONA_SYSTEM_INSTRUCTION };

function createReceiptThumbnailDataUrl(
  merchant: string,
  amount: number,
  date: string
): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 220, 140);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 212, 132);

  ctx.fillStyle = '#0277BD';
  ctx.fillRect(4, 4, 212, 26);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('STRUK RESMI · PITI VISION OCR', 12, 20);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(merchant.slice(0, 26), 12, 48);

  ctx.fillStyle = '#475569';
  ctx.font = '10px monospace';
  ctx.fillText(`TGL: ${date}`, 12, 68);
  ctx.fillText(`STATUS: VERIFIED BY PITI`, 12, 84);

  ctx.fillStyle = '#0277BD';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`TOTAL: IDR ${amount.toLocaleString('id-ID')}`, 12, 114);

  return canvas.toDataURL('image/png');
}

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('autostart') === '1';
    }
    return false;
  });
  const [isSplashing, setIsSplashing] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('splash') === '1';
    }
    return false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const splashTimerRef = useRef<number | null>(null);

  const triggerSplashTransition = () => {
    if (splashTimerRef.current) {
      window.clearTimeout(splashTimerRef.current);
    }
    setIsSplashing(true);
    splashTimerRef.current = window.setTimeout(() => {
      setIsSplashing(false);
      splashTimerRef.current = null;
    }, SPLASH_DURATION_MS);
  };

  useEffect(() => {
    if (isSplashing && !splashTimerRef.current) {
      splashTimerRef.current = window.setTimeout(() => {
        setIsSplashing(false);
        splashTimerRef.current = null;
      }, SPLASH_DURATION_MS);
    }
    return () => {
      if (splashTimerRef.current) {
        window.clearTimeout(splashTimerRef.current);
      }
    };
  }, []);

  // Personnel State loaded from Supabase `personnel` table (no hardcoded mock users)
  const [staffList, setStaffList] = useState<StaffMemberRecord[]>([]);
  const personnel = staffList;
  const [currentUserProfile, setCurrentUserProfile] =
    useState<StaffMemberRecord | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [userDivision, setUserDivision] = useState<DivisionType>(
    'Design_Talent_Production'
  );
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedOfficeStaffId, setSelectedOfficeStaffId] = useState<string | null>(
    null
  );

  // Login Form State (Empty by default — no hardcoded mock credentials)
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);

  // Navigation Tab
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  // Real-Time Live Clock updated every minute via setInterval
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  const liveClockHHMM = useMemo(
    () => formatRealTimeHHMM(currentTime),
    [currentTime]
  );

  // Attendance & Strict 20:00 Overtime State
  const payrollCycle = useMemo(
    () => getActivePayrollCycle(currentTime),
    [currentTime]
  );
  const [selectedWorkMode, setSelectedWorkMode] = useState<'WFO' | 'WFE'>('WFO');
  const [checkInInputTime, setCheckInInputTime] = useState<string>(() =>
    formatRealTimeHHMM(new Date())
  );
  const [checkOutInputTime, setCheckOutInputTime] = useState<string>(() =>
    formatRealTimeHHMM(new Date())
  );
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string>('');
  const [capturedWatermark, setCapturedWatermark] = useState<string>(
    FUTARI_HQ_ADDRESS
  );
  const [capturedMapsLinks, setCapturedMapsLinks] = useState<
    { title: string; uri: string }[]
  >([
    {
      title: 'Futari HQ Jakarta — Jl. Nusa Indah No.33, Cipete Selatan',
      uri: 'https://www.google.com/maps/search/?api=1&query=Jl.+Nusa+Indah+No.33,+RT.14/RW.5,+Cipete+Sel.,+Kec.+Cilandak,+Kota+Jakarta+Selatan,+Daerah+Khusus+Ibukota+Jakarta+12410',
    },
  ]);

  // Mandatory Daily Description Modal ("Deskripsi Pekerjaan Hari Ini")
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState<boolean>(false);
  const [overtimeNoteInput, setOvertimeNoteInput] = useState<string>('');
  const [overtimeNoteError, setOvertimeNoteError] = useState<string>('');
  const [pendingCheckOutLogId, setPendingCheckOutLogId] = useState<string | null>(
    null
  );

  // WIPE ALL TRANSACTIONAL MOCK DATA (BLANK SLATE FOR FIELD TEST):
  // Initial states for `attendanceRecords` (`attendanceLogs`), `pettyCashEvents` (`eventsList` & `pettyCashList`),
  // `fleetVehicles`, `sops`, and `tasks` are all initialized to completely empty arrays: `[]`.
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>(
    INITIAL_ATTENDANCE_LOGS
  );
  const attendanceRecords = attendanceLogs;
  // Selector for Executive/Finance/Digital to inspect a specific employee's attendance recap & PDF
  const [selectedAttendanceTargetId, setSelectedAttendanceTargetId] =
    useState<string>(INITIAL_FUTARI_STAFF[0]?.staffId || '1');

  // Hybrid Attendance Transition Time Input (WFO -> WFE) & Uploaded Check-In Photo Preview (URL.createObjectURL)
  const [wfeTransitionInputTime, setWfeTransitionInputTime] =
    useState<string>('14:30');
  const [uploadedCheckInFile, setUploadedCheckInFile] =
    useState<File | null>(null);
  const [uploadedCheckInObjectUrl, setUploadedCheckInObjectUrl] =
    useState<string>('');
  const [uploadedCheckInFileName, setUploadedCheckInFileName] =
    useState<string>('');
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] =
    useState<boolean>(false);
  const [checkInError, setCheckInError] = useState<string>('');
  const [checkInSuccessData, setCheckInSuccessData] = useState<{
    email: string;
    mode: 'WFO' | 'WFE';
    checkInTimeIso: string;
    checkInTimeWib: string;
    photoUrl: string;
  } | null>(null);
  const checkInFileInputRef = useRef<HTMLInputElement | null>(null);
  const checkInUploadInputRef = useRef<HTMLInputElement | null>(null);
  const receiptFileInputRef = useRef<HTMLInputElement | null>(null);

  // Petty Cash Master-Detail (`pc_events` & `pc_transactions`) State with `authorized_personnel` emails & strict RBAC
  const [eventsList, setEventsList] = useState<EventBudgetRecord[]>(
    INITIAL_PETTY_CASH_EVENTS
  );
  const pettyCashEvents = eventsList;
  const [selectedEventId, setSelectedEventId] = useState<string>(
    INITIAL_PETTY_CASH_EVENTS[0]?.eventId || ''
  );
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);
  const [budgetEventNameInput, setBudgetEventNameInput] = useState<string>('');
  const [budgetInvolvedStaffIds, setBudgetInvolvedStaffIds] = useState<string[]>([]);
  const [budgetAuthorizedEmails, setBudgetAuthorizedEmails] = useState<string[]>([]);
  const [newBudgetAmount, setNewBudgetAmount] = useState<string>('35000000');
  const [budgetModalError, setBudgetModalError] = useState<string>('');
  const [isSubmittingPcEvent, setIsSubmittingPcEvent] = useState<boolean>(false);
  const [isCompletingPcEvent, setIsCompletingPcEvent] = useState<boolean>(false);

  // Scan Struk / Input Transaksi Form Fields (`pc_transactions`)
  const [expenseEventNameInput, setExpenseEventNameInput] = useState<string>('');
  const [expenseInvolvedStaffIds, setExpenseInvolvedStaffIds] = useState<string[]>([]);
  const [expenseMerchant, setExpenseMerchant] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<string>(
    'Consumption & Crew Meals'
  );
  const [expenseReceiptFile, setExpenseReceiptFile] = useState<File | null>(null);
  const [expenseReceiptLabel, setExpenseReceiptLabel] = useState<string>('');
  const [expenseReceiptDataUrl, setExpenseReceiptDataUrl] = useState<string>('');
  const [expenseFormError, setExpenseFormError] = useState<string>('');
  const [isScanningOcr, setIsScanningOcr] = useState<boolean>(false);
  const [isSubmittingPcTransaction, setIsSubmittingPcTransaction] =
    useState<boolean>(false);

  // Receipt Detail Modal State (renders real URL.createObjectURL(file) preview)
  const [selectedReceiptDetail, setSelectedReceiptDetail] =
    useState<PettyCashRecord | null>(null);

  // Petty Cash Transactions List
  const [pettyCashList, setPettyCashList] = useState<PettyCashRecord[]>(
    INITIAL_PETTY_CASH_EXPENSES
  );

  // 1. NEW SOP MANAGEMENT STATE (`sops` containing Title, Content, and Date)
  const [sops, setSops] = useState<CompanySopItem[]>(INITIAL_COMPANY_SOPS);

  // 2. FLEET MANAGEMENT STATE (`fleetVehicles` containing Model, License Plate, Status)
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicleItem[]>(
    INITIAL_FLEET_VEHICLES
  );

  // 4. ADVANCED TASK CHECKLIST STATE (`tasks` synced with Calendar on Deadline Date)
  const [tasks, setTasks] = useState<WorkTaskItem[]>(INITIAL_WORK_TASKS);

  // Co-Worker Chat Room State (Google Chat Skill)
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>(
    INITIAL_CHAT_MESSAGES
  );

  // Leave Calendar & Multi-Type Operations Calendar State (Cuti, Event Kantor, Booking Mobil Operasional)
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecordItem[]>(
    INITIAL_LEAVE_RECORDS
  );
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>(
    INITIAL_CALENDAR_EVENTS
  );
  const [dailyChecklists, setDailyChecklists] = useState<DailyChecklistRecord[]>(
    INITIAL_DAILY_CHECKLISTS
  );

  // 3D Virtual Office Dynamic Spawn, Walk-In (Entrance Door) & Walk-Out (Exit Door) Realtime Presence State
  const [isPresent, setIsPresent] = useState<boolean>(false);
  const [activeAttendanceByEmail, setActiveAttendanceByEmail] = useState<
    Record<string, SupabaseAttendanceRow>
  >({});
  const [newlyAddedStaffId, setNewlyAddedStaffId] = useState<string | null>(null);
  const [walkInStaffId, setWalkInStaffId] = useState<string | null>(null);
  const [walkOutStaffId, setWalkOutStaffId] = useState<string | null>(null);

  // Structured PDF Report Viewer Modal State
  const [isReportViewerOpen, setIsReportViewerOpen] = useState<boolean>(false);

  // Modern Floating Toast Notification System
  interface ToastNotificationItem {
    id: string;
    type?: 'success' | 'info' | 'error' | 'warning';
    title: string;
    message: string;
    cloudUrl?: string;
  }
  const [toasts, setToasts] = useState<ToastNotificationItem[]>([]);
  const showToast = (toast: Omit<ToastNotificationItem, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newToast: ToastNotificationItem = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };
  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Backwards-compatible bridge for existing exportStatusBanner references:
  // Automatically routes notifications to the floating toast system without shifting the page layout.
  const [exportStatusBanner, _setRawExportStatusBanner] = useState<{
    title: string;
    message: string;
    cloudUrl?: string;
  } | null>(null);
  const setExportStatusBanner = (
    banner: { title: string; message: string; cloudUrl?: string } | null
  ) => {
    _setRawExportStatusBanner(banner);
    if (banner) {
      showToast({
        type: 'success',
        title: banner.title,
        message: banner.message,
        cloudUrl: banner.cloudUrl,
      });
    }
  };
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Strictly locked to the authenticated Supabase user session (cannot switch to other accounts)
  const currentUser = useMemo<StaffMemberRecord>(() => {
    if (currentUserProfile) {
      const matchedFromList = staffList.find(
        (s) =>
          s.staffId === currentUserProfile.staffId ||
          s.email.toLowerCase() === currentUserProfile.email.toLowerCase()
      );
      const baseUser = matchedFromList || currentUserProfile;
      return {
        ...baseUser,
        role: userRole || baseUser.role,
        division: userDivision || baseUser.division,
      };
    }
    return DEFAULT_UNAUTHENTICATED_STAFF;
  }, [staffList, currentUserProfile, userRole, userDivision]);

  // Strict Developer Superadmin Check: true ONLY for nuginugroho2005@gmail.com with accessLevel === 'developer'
  const isDeveloperUser = useMemo(
    () => isDeveloperSuperadmin(currentUser),
    [currentUser]
  );

  // "Tim & Absensi" (Manajemen Tim & Absensi) Tab Visibility Check:
  // Visible and accessible to ALL active personnel (with dynamic Global vs Team RBAC inside the tab)
  const canAccessTeamDashboard = useMemo(
    () => canAccessTeamAttendanceTab(currentUser),
    [currentUser]
  );

  // If currentUser changes to a non-developer while on 'user_management', immediately redirect to 'home'
  useEffect(() => {
    if (!isDeveloperUser && activeTab === 'user_management') {
      setActiveTab('home');
    }
  }, [isDeveloperUser, activeTab]);

  // Fetch Master (`pc_events`) and Detail (`pc_transactions`) from Supabase
  const fetchPettyCashMasterDetailFromSupabase = async () => {
    try {
      const { data: eventRows, error: eventErr } = await supabase
        .from('pc_events')
        .select(
          'id, event_name, created_by, authorized_personnel, is_completed, approved_budget'
        );

      let mappedEvents: EventBudgetRecord[] = [];
      if (!eventErr && Array.isArray(eventRows)) {
        mappedEvents = (eventRows as PcEventRow[]).map((row) =>
          mapPcEventRowToEventBudgetRecord(
            row,
            staffList,
            Number(row.approved_budget) || 0
          )
        );
        setEventsList(mappedEvents);
      }

      const { data: txRows, error: txErr } = await supabase
        .from('pc_transactions')
        .select(
          'id, event_id, submitted_by, merchant, receipt_date, category, amount, receipt_url'
        );

      if (!txErr && Array.isArray(txRows)) {
        const mappedTxs = (txRows as PcTransactionRow[]).map((row) => {
          const parentEv = mappedEvents.find(
            (ev) => ev.eventId === String(row.event_id)
          );
          return mapPcTransactionRowToPettyCashRecord(row, parentEv);
        });
        setPettyCashList(mappedTxs);
      }
    } catch {
      // Preserve current state if offline or tables are empty
    }
  };

  // Fetch active bookings from Supabase `vehicle_bookings` table (email, vehicle, start_time, end_time, purpose)
  const fetchVehicleBookingsFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_bookings')
        .select('*')
        .order('start_time', { ascending: true });

      if (!error && Array.isArray(data)) {
        const mappedBookings = (data as VehicleBookingRow[]).map((row, idx) =>
          mapVehicleBookingRowToCalendarEvent(row, staffList, idx)
        );
        setCalendarEvents((prev) => {
          const nonVehicleEvents = prev.filter(
            (ev) => ev.eventType !== 'Booking Mobil Operasional'
          );
          return [...mappedBookings, ...nonVehicleEvents];
        });
      }
    } catch {
      // Preserve current state if offline or table is empty
    }
  };

  // Fetch vehicles directly from Supabase `vehicles` table (id, name, plate_number, status)
  const fetchVehiclesFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('name', { ascending: true });

      if (!error && Array.isArray(data)) {
        const mappedVehicles: FleetVehicleItem[] = data.map((row: any) => ({
          id: String(row.id),
          model: row.name || 'Unit Operasional',
          licensePlate: row.plate_number || '-',
          status: (row.status as FleetVehicleStatus) || 'Tersedia',
          branch: 'JKT',
          notes: 'Unit armada operasional Futari',
        }));
        setFleetVehicles(mappedVehicles);
      }
    } catch {
      // Preserve current state if offline or table is empty
    }
  };

  // Fetch messages from Supabase `chat_messages` table (id, created_at, sender_email, message, is_announcement)
  const fetchChatMessagesFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        const mapped: ChatMessageItem[] = data.map((row: any) => {
          const senderEmail = (row.sender_email || '').trim().toLowerCase();
          const matchedStaff = staffList.find(
            (s) => s.email.toLowerCase() === senderEmail
          );
          const timeStr = row.created_at
            ? new Date(row.created_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              }) + ' WIB'
            : '-';

          return {
            id: String(row.id),
            staffId: matchedStaff?.staffId || `user_${row.id}`,
            senderName: matchedStaff?.name || senderEmail.split('@')[0] || 'User',
            senderRole: matchedStaff ? `${matchedStaff.role} · ${matchedStaff.divisionLabel}` : 'Team Member',
            branch: matchedStaff?.branch || 'JKT',
            initials: matchedStaff?.initials || senderEmail.slice(0, 2).toUpperCase(),
            avatarColor: matchedStaff?.avatarColor || '#00B4D8',
            channel: 'Futari General Chat',
            message: row.message || '',
            timestamp: timeStr,
            isAnnouncement: Boolean(row.is_announcement),
          };
        });
        setChatMessages(mapped);
      }
    } catch {
      // Preserve current state if offline
    }
  };
  // Fetch tasks dynamically from Supabase `tasks` table (plotted on Jobdesk & Calendar pages)
  const fetchTasksFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (!error && Array.isArray(data)) {
        const mapped = (data as SupabaseTaskRow[]).map((row) =>
          mapSupabaseTaskRowToWorkTask(row, staffList)
        );
        setTasks(mapped);
      }
    } catch {
      // Preserve current state if offline
    }
  };

  useEffect(() => {
    if (isAuthenticated || activeTab === 'pettycash') {
      fetchPettyCashMasterDetailFromSupabase();
    }
    if (
      isAuthenticated ||
      activeTab === 'fleet' ||
      activeTab === 'leave'
    ) {
      fetchVehicleBookingsFromSupabase();
      fetchVehiclesFromSupabase();
    }
    if (isAuthenticated || activeTab === 'tasks' || activeTab === 'leave') {
      fetchTasksFromSupabase();
    }
    if (isAuthenticated || activeTab === 'chat') {
      fetchChatMessagesFromSupabase();
    }
  }, [isAuthenticated, activeTab, staffList.length]);

  // Realtime subscription to `chat_messages` table in Supabase
  useEffect(() => {
    const chatChannel = supabase
      .channel('portal-chat-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          fetchChatMessagesFromSupabase();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [staffList]);

  // Realtime subscription to `tasks` table in Supabase (plotted on Jobdesk & Calendar)
  useEffect(() => {
    const tasksChannel = supabase
      .channel('portal-tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          fetchTasksFromSupabase();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
    };
  }, [staffList]);

  // Sync Attendance target employee & Petty Cash allowed event whenever currentUser or eventsList changes
  useEffect(() => {
    if (!currentUser) return;
    setSelectedAttendanceTargetId(currentUser.staffId);
    const allowedEvents = filterAccessiblePcEvents(currentUser, eventsList, staffList);
    if (allowedEvents.length > 0) {
      const stillAllowed = allowedEvents.some((e) => e.eventId === selectedEventId);
      const nextEvent = stillAllowed
        ? allowedEvents.find((e) => e.eventId === selectedEventId)!
        : allowedEvents[0];
      setSelectedEventId(nextEvent.eventId);
      setExpenseEventNameInput(nextEvent.event_name || nextEvent.eventName);
      setExpenseInvolvedStaffIds(nextEvent.involvedStaffIds);
    } else {
      setSelectedEventId('');
    }
  }, [currentUser, eventsList, staffList]);

  // Strict Petty Cash RBAC (`pc_events` & `pc_transactions`):
  // The 'Pilih Event' dropdown shows both active and completed events ONLY IF:
  // a) User role is `dev`, `finance`, or `executive` (Global Access).
  // b) OR, `user.email == created_by`.
  // c) OR, `user.email` exists in the `authorized_personnel` array.
  const hasFullPettyCashAccess = useMemo(
    () => hasGlobalPettyCashAccess(currentUser),
    [currentUser]
  );

  const visibleEventsList = useMemo(
    () => filterAccessiblePcEvents(currentUser, eventsList, staffList),
    [currentUser, eventsList, staffList]
  );

  const activeEventBudget = useMemo<EventBudgetRecord>(() => {
    const found =
      visibleEventsList.find((e) => e.eventId === selectedEventId) ||
      visibleEventsList[0];
    if (found) return found;
    return {
      id: 'evt_none',
      eventId: 'evt_none',
      eventName: 'Tidak Ada Event yang Ditugaskan',
      event_name: 'Tidak Ada Event yang Ditugaskan',
      created_by: '',
      authorized_personnel: [],
      is_completed: false,
      clientName: '-',
      approvedBudget: 0,
      location: '-',
      dateRange: '-',
      involvedPersonnelIds: [],
      involvedStaffIds: [],
      involvedPersonnelNames: [],
    };
  }, [visibleEventsList, selectedEventId]);

  const visiblePettyCashList = useMemo(() => {
    const allowedEventIds = new Set(visibleEventsList.map((e) => e.eventId));
    return pettyCashList.filter((tx) =>
      allowedEventIds.has(tx.event_id || tx.eventId)
    );
  }, [visibleEventsList, pettyCashList]);

  const activeEventExpenses = useMemo(
    () =>
      visiblePettyCashList.filter(
        (e) => (e.event_id || e.eventId) === activeEventBudget.eventId
      ),
    [visiblePettyCashList, activeEventBudget]
  );

  const pettyCashSummary = useMemo(
    () =>
      calculatePettyCashSummary(
        Number(
          activeEventBudget.approved_budget ?? activeEventBudget.approvedBudget
        ) || 0,
        activeEventExpenses
      ),
    [activeEventBudget, activeEventExpenses]
  );

  const isExecutiveUser = currentUser.division === 'Executive';

  // STRICT RBAC FOR ABSENSI GLOBAL ACCESS DROPDOWN:
  // Visible if the logged-in user's role is strictly Executive, Finance, or Digital (Dev).
  const canSeeGlobalAttendanceDropdown = useMemo(() => {
    return hasGlobalRoleAccess(currentUser);
  }, [currentUser]);

  const canViewAllAttendance = canSeeGlobalAttendanceDropdown;

  const canInspectOtherAttendance = useMemo(
    () => canViewOtherStaffAttendance(currentUser),
    [currentUser]
  );

  const accessibleAttendanceStaff = useMemo(
    () => getAccessibleAttendancePersonnel(currentUser, staffList),
    [currentUser, staffList]
  );

  // Target Employee for Attendance Recap & PDF/Excel Report (enforces strict RBAC)
  const targetAttendanceEmployee = useMemo(() => {
    if (!canSeeGlobalAttendanceDropdown) {
      return currentUser;
    }
    if (selectedAttendanceTargetId) {
      const candidate = staffList.find(
        (s) => s.staffId === selectedAttendanceTargetId
      );
      if (candidate) {
        return candidate;
      }
    }
    return currentUser;
  }, [canSeeGlobalAttendanceDropdown, selectedAttendanceTargetId, staffList, currentUser]);

  // Strictly Filtered Attendance Logs for the logged-in user (Global or Team RBAC enforced)
  const privateUserAttendanceLogs = useMemo(
    () =>
      filterAttendanceLogsForUser(
        currentUser,
        attendanceLogs,
        targetAttendanceEmployee.staffId,
        staffList
      ),
    [currentUser, attendanceLogs, targetAttendanceEmployee.staffId, staffList]
  );

  // Finance Export Totals (Mba Erlita's Request):
  // 1. Total Jam Kerja (Regular Working Hours)
  // 2. Total Jam Lembur (Overtime Hours - strictly calculated for hours worked past 20:00)
  const attendanceExportTotals = useMemo(
    () => calculateAttendanceExportTotals(privateUserAttendanceLogs),
    [privateUserAttendanceLogs]
  );

  // Active Checked-In Session for Current User (for Hybrid WFO <-> WFE transitions)
  const activeCurrentUserCheckIn = useMemo(
    () =>
      attendanceLogs.find(
        (l) => l.staffId === currentUser.staffId && l.status === 'checked_in'
      ) || null,
    [attendanceLogs, currentUser.staffId]
  );

  const isCurrentUserCheckedInWfo = Boolean(
    activeCurrentUserCheckIn && activeCurrentUserCheckIn.mode === 'WFO'
  );

  const isCheckInLocked = Boolean(
    activeCurrentUserCheckIn || checkInSuccessData
  );

  // Total accumulated late minutes for current user (plus company-wide total for CEO)
  const userMonthlyLateMinutes = useMemo(() => {
    return privateUserAttendanceLogs.reduce((acc, l) => acc + l.lateMinutes, 0);
  }, [privateUserAttendanceLogs]);

  const companyTotalLateMinutes = useMemo(() => {
    return staffList.reduce((acc, s) => acc + s.lateMinutesMonth, 0);
  }, [staffList]);

  const [isAuthSubmitting, setIsAuthSubmitting] = useState<boolean>(false);

  // Fetch user details from Supabase `personnel` table (columns: id, created_at, name, email, role, division)
  // and store role + division in app state so existing RBAC routing works properly.
  const fetchAndApplySupabasePersonnelProfile = async (
    email: string,
    authUserId?: string,
    displayNameFallback?: string | null
  ): Promise<StaffMemberRecord | null> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Query the logged-in user's record from the `personnel` table in Supabase
    const { data: userRow, error: userRowError } = await supabase
      .from('personnel')
      .select('id, created_at, name, email, role, division, avatar_url, supervisor_email, status')
      .ilike('email', cleanEmail)
      .maybeSingle();

    // 2. Also fetch the `personnel` directory from Supabase to populate `staffList`
    const { data: allRows } = await supabase
      .from('personnel')
      .select('id, created_at, name, email, role, division, avatar_url, supervisor_email, status')
      .order('created_at', { ascending: true });

    const mappedDirectory = Array.isArray(allRows)
      ? mapSupabasePersonnelListToStaffList(allRows as SupabasePersonnelRow[])
      : [];

    let resolvedStaff: StaffMemberRecord;

    if (userRow) {
      resolvedStaff = mapSupabasePersonnelToStaffRecord(
        userRow as SupabasePersonnelRow,
        0
      );
    } else {
      const fromDirectory = mappedDirectory.find(
        (s) => s.email.toLowerCase() === cleanEmail
      );
      if (fromDirectory) {
        resolvedStaff = fromDirectory;
      } else {
        resolvedStaff = mapSupabasePersonnelToStaffRecord(
          {
            id: authUserId || `sup_${Date.now()}`,
            email: cleanEmail,
            name: displayNameFallback || undefined,
            role:
              cleanEmail === DEVELOPER_SUPERADMIN_EMAIL
                ? 'Digital'
                : 'Unassigned',
            division: 'Design_Talent_Production',
          },
          mappedDirectory.length
        );
      }
    }

    if (resolvedStaff.isSuspended) {
      setLoginError(
        `Akun ${resolvedStaff.name} (${resolvedStaff.email}) sedang ditangguhkan / dinonaktifkan (Suspended). Hubungi Developer.`
      );
      return null;
    }

    // Store role and division in app state so existing RBAC routing works correctly
    const emailKey = resolvedStaff.email.trim().toLowerCase();
    const isCurrentlyCheckedIn = Boolean(
      activeAttendanceByEmail[emailKey] &&
        isAttendanceRowActiveForToday(activeAttendanceByEmail[emailKey])
    );
    setIsPresent(isCurrentlyCheckedIn);
    setUserRole(resolvedStaff.role);
    setUserDivision(resolvedStaff.division);
    setCurrentUserProfile(resolvedStaff);
    setCurrentUserId(resolvedStaff.staffId);
    setSelectedOfficeStaffId(isCurrentlyCheckedIn ? resolvedStaff.staffId : null);
    setSelectedAttendanceTargetId(resolvedStaff.staffId);

    setStaffList(() => {
      const existsInDir = mappedDirectory.some(
        (s) =>
          s.staffId === resolvedStaff.staffId ||
          s.email.toLowerCase() === resolvedStaff.email.toLowerCase()
      );
      if (existsInDir) {
        return mappedDirectory.map((s) =>
          s.email.toLowerCase() === resolvedStaff.email.toLowerCase()
            ? resolvedStaff
            : s
        );
      }
      return [resolvedStaff, ...mappedDirectory];
    });

    return resolvedStaff;
  };

  // Initialize Supabase Auth session listener & load personnel directory on mount
  useEffect(() => {
    let isMounted = true;

    const loadDirectoryAndBootstrapSession = async () => {
      try {
        const { data: allRows, error: dirError } = await supabase
          .from('personnel')
          .select('id, created_at, name, email, role, division, avatar_url, supervisor_email, status')
          .order('created_at', { ascending: true });

        if (!dirError && Array.isArray(allRows) && isMounted) {
          const mapped = mapSupabasePersonnelListToStaffList(
            allRows as SupabasePersonnelRow[]
          );
          setStaffList(mapped);
        }
      } catch {
        // Ignore directory fetch error on mount
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const activeUser = sessionData?.session?.user;
        if (activeUser?.email && isMounted) {
          const staff = await fetchAndApplySupabasePersonnelProfile(
            activeUser.email,
            activeUser.id,
            activeUser.user_metadata?.name || activeUser.user_metadata?.full_name
          );
          if (staff && isMounted) {
            setIsAuthenticated(true);
          }
        }
      } catch {
        // Ignore session bootstrap errors when unauthenticated
      }
    };

    loadDirectoryAndBootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT' || !session?.user) {
        setCurrentUserProfile(null);
        setUserRole('');
        setIsAuthenticated(false);
        setIsGoogleConnected(false);
        setCheckInSuccessData(null);
        setUploadedCheckInFile(null);
        setUploadedCheckInObjectUrl('');
        setUploadedCheckInFileName('');
        setCheckInError('');
        return;
      }
      if (
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
        session.user.email
      ) {
        try {
          const staff = await fetchAndApplySupabasePersonnelProfile(
            session.user.email,
            session.user.id,
            session.user.user_metadata?.name ||
              session.user.user_metadata?.full_name
          );
          if (staff && isMounted) {
            setIsAuthenticated(true);
          }
        } catch {
          // Handled in explicit login flow
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 10-Minute Inactivity Auto-Logout (Idle Detection: 600,000 ms)
  // Tracks global user activity: mousemove, keydown, scroll, and touchstart.
  // Resets timer on activity. If idle for 10 minutes, triggers sign-out, clears state, and returns to Login.
  useEffect(() => {
    if (!isAuthenticated) return;

    const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes (600,000 ms)
    let timeoutId: number | null = null;

    const handleAutoLogout = async () => {
      try {
        await supabase.auth.signOut();
      } catch {
        // Continue clearing local state regardless
      }
      setCurrentUserProfile(null);
      setUserRole('');
      setIsAuthenticated(false);
      setIsMobileMenuOpen(false);
      setLoginError('Sesi Anda telah berakhir karena tidak ada aktivitas selama 10 menit. Silakan login kembali.');
    };

    const resetTimer = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(handleAutoLogout, INACTIVITY_TIMEOUT_MS);
    };

    const activityEvents = ['mousemove', 'keydown', 'scroll', 'touchstart'] as const;

    // Attach passive global event listeners
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });

    // Initialize timer on mount or authentication
    resetTimer();

    // Clean up event listeners and timer to avoid memory leaks
    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
    };
  }, [isAuthenticated]);

  // 1. "Masuk (Login)" using Supabase Auth signInWithPassword + Fetching User Details from `personnel` Table
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPass = loginPassword.trim();

    if (!cleanEmail || !cleanPass) {
      setLoginError('Mohon isi Email dan Password terlebih dahulu.');
      return;
    }

    setIsAuthSubmitting(true);
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass,
        });

      if (authError || !authData.user) {
        setLoginError(
          authError?.message ||
            'Email atau password tidak valid pada Supabase Authentication.'
        );
        return;
      }

      const authenticatedEmail = authData.user.email || cleanEmail;
      const resolvedStaff = await fetchAndApplySupabasePersonnelProfile(
        authenticatedEmail,
        authData.user.id,
        authData.user.user_metadata?.name ||
          authData.user.user_metadata?.full_name
      );

      if (resolvedStaff) {
        setIsAuthenticated(true);
        triggerSplashTransition();
      }
    } catch (err: any) {
      setLoginError(
        err?.message || 'Gagal autentikasi dengan Supabase Auth.'
      );
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  // 2. "Daftar Akun Baru (Register)" using Supabase Auth signUp + `personnel` Table Sync
  const handleEmailRegister = async () => {
    setLoginError('');
    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPass = loginPassword.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLoginError('Masukkan alamat email yang valid untuk mendaftar akun baru.');
      return;
    }
    if (cleanPass.length < 6) {
      setLoginError(
        'Password minimal 6 karakter sesuai standar keamanan Supabase Authentication.'
      );
      return;
    }

    setIsAuthSubmitting(true);
    try {
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPass,
        });

      if (signUpError) {
        setLoginError(signUpError.message);
        return;
      }

      if (signUpData.user) {
        // Check if user already exists in `personnel`, otherwise insert default record
        const { data: existingRow } = await supabase
          .from('personnel')
          .select('id, created_at, name, email, role, division')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (!existingRow) {
          const derivedName = cleanEmail
            .split('@')[0]
            .replace(/[._-]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

          await supabase.from('personnel').insert([
            {
              name: derivedName || 'Personel Baru Futari',
              email: cleanEmail,
              role:
                cleanEmail === DEVELOPER_SUPERADMIN_EMAIL
                  ? 'Digital'
                  : 'Unassigned',
              division: 'Design_Talent_Production',
            },
          ]);
        }

        const resolvedStaff = await fetchAndApplySupabasePersonnelProfile(
          cleanEmail,
          signUpData.user.id,
          signUpData.user.user_metadata?.name
        );

        if (resolvedStaff) {
          setIsAuthenticated(true);
          triggerSplashTransition();
        }
      }
    } catch (err: any) {
      setLoginError(
        err?.message || 'Gagal mendaftarkan akun baru di Supabase.'
      );
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleDeveloperChangeRole = async (targetStaffId: string, newRole: string) => {
    if (!isDeveloperUser) return;
    const target = staffList.find((s) => s.staffId === targetStaffId);
    if (!target) return;

    setStaffList((prev) => {
      const updated = updateStaffRoleAndDivision(prev, targetStaffId, {
        role: newRole,
      });
      const t = updated.find((s) => s.staffId === targetStaffId);
      if (t && t.staffId === currentUserProfile?.staffId) {
        setUserRole(t.role);
        setCurrentUserProfile(t);
      }
      return updated;
    });

    try {
      await supabase
        .from('personnel')
        .update({ role: newRole })
        .eq('email', target.email);
      await refreshPersonnelDirectory();
    } catch (err) {
      console.warn('[Developer change role error]:', err);
    }
  };

  const handleDeveloperChangeDivision = async (
    targetStaffId: string,
    newDivision: DivisionType
  ) => {
    if (!isDeveloperUser) return;
    const target = staffList.find((s) => s.staffId === targetStaffId);
    if (!target) return;

    setStaffList((prev) => {
      const updated = updateStaffRoleAndDivision(prev, targetStaffId, {
        division: newDivision,
      });
      const t = updated.find((s) => s.staffId === targetStaffId);
      if (t && t.staffId === currentUserProfile?.staffId) {
        setUserDivision(t.division);
        setCurrentUserProfile(t);
      }
      return updated;
    });

    try {
      await supabase
        .from('personnel')
        .update({ division: newDivision })
        .eq('email', target.email);
      await refreshPersonnelDirectory();
    } catch (err) {
      console.warn('[Developer change division error]:', err);
    }
  };

  const handleDeveloperToggleSuspend = async (targetStaffId: string) => {
    if (!isDeveloperUser) return;
    const target = staffList.find((s) => s.staffId === targetStaffId);
    if (!target) return;

    const nextSuspended = !Boolean(target.isSuspended);
    const nextStatus = nextSuspended ? 'suspended' : 'active';

    // 1. Update in Supabase personnel table
    try {
      let query = supabase.from('personnel').update({ status: nextStatus });
      if (target.id && !String(target.id).startsWith('sup_') && !String(target.id).startsWith('usr_')) {
        query = query.eq('id', target.id);
      } else if (target.email) {
        query = query.ilike('email', target.email);
      }
      await query;
    } catch (err) {
      console.warn('[Supabase toggle suspend error]:', err);
    }

    // 2. Attempt Supabase Auth Admin ban/unban if admin API is available
    try {
      if ((supabase.auth as any).admin && target.id) {
        await (supabase.auth as any).admin.updateUserById(target.id, {
          ban_duration: nextSuspended ? '876000h' : 'none',
        });
      }
    } catch {
      // Ignored if client lacks service role key
    }

    // 3. Update local state
    setStaffList((prev) => toggleStaffSuspensionStatus(prev, targetStaffId));
    showToast({
      type: 'info',
      title: nextSuspended ? 'Akun Ditangguhkan' : 'Akun Diaktifkan Kembali',
      message: `Status akun ${target.name} (${target.email}) telah diubah menjadi ${nextStatus.toUpperCase()}.`,
    });
  };

  const handleDeveloperDeleteUser = async (targetStaffId: string) => {
    if (!isDeveloperUser) return;
    const target = staffList.find((s) => s.staffId === targetStaffId);
    if (!target) return;

    // 1. Delete from Supabase personnel table
    try {
      let query = supabase.from('personnel').delete();
      if (target.id && !String(target.id).startsWith('sup_') && !String(target.id).startsWith('usr_')) {
        query = query.eq('id', target.id);
      } else if (target.email) {
        query = query.ilike('email', target.email);
      }
      await query;
    } catch (err) {
      console.warn('[Supabase delete user error]:', err);
    }

    // 2. Attempt Supabase Auth Admin delete if admin API is available
    try {
      if ((supabase.auth as any).admin && target.id) {
        await (supabase.auth as any).admin.deleteUser(target.id);
      }
    } catch {
      // Ignored if client lacks service role key
    }

    // 3. Clean up local state
    setStaffList((prev) => deleteStaffMember(prev, targetStaffId));
    if (selectedOfficeStaffId === targetStaffId) {
      setSelectedOfficeStaffId(null);
    }
    if (selectedAttendanceTargetId === targetStaffId) {
      setSelectedAttendanceTargetId(currentUser.staffId);
    }
    showToast({
      type: 'info',
      title: 'User Dihapus',
      message: `Akun ${target.name} (${target.email}) telah dihapus dari sistem.`,
    });
  };

  const handleDeveloperRegisterWorkspaceAccount = async (
    input: NewWorkspaceAccountInput & { rawDivision?: string }
  ) => {
    if (!isDeveloperUser) {
      throw new Error('Akses ditolak: Hanya role dev yang dapat menambahkan personel.');
    }

    const cleanName = input.name.trim();
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanRole = input.role.trim();
    const cleanDivision = (input.rawDivision || input.division).trim();

    // Technical Note: ONLY insert into the `personnel` table.
    // Do NOT trigger `supabase.auth.signUp` here to prevent client-side session replacement.
    const { data: insertedRow, error: insertError } = await supabase
      .from('personnel')
      .insert([
        {
          name: cleanName,
          email: cleanEmail,
          role: cleanRole,
          division: cleanDivision,
        },
      ])
      .select('id, created_at, name, email, role, division')
      .single();

    if (insertError) {
      throw new Error(insertError.message || 'Gagal menyimpan data ke tabel personnel.');
    }

    setStaffList((prev) => {
      const { updatedList, createdStaff } = registerNewGoogleWorkspaceAccount(
        prev,
        {
          ...input,
          name: insertedRow?.name || cleanName,
          email: insertedRow?.email || cleanEmail,
          role: insertedRow?.role || cleanRole,
        }
      );
      setNewlyAddedStaffId(createdStaff.staffId);
      setSelectedOfficeStaffId(createdStaff.staffId);
      setExportStatusBanner({
        title: `Welcome New Personnel — ${createdStaff.name}`,
        message: `Data personel (${createdStaff.email}, role: ${createdStaff.role}, division: ${cleanDivision}) berhasil disimpan ke tabel personnel Supabase.`,
      });
      return updatedList;
    });

    try {
      const { data: allRows } = await supabase
        .from('personnel')
        .select('id, created_at, name, email, role, division, avatar_url, supervisor_email, status');
      if (allRows && Array.isArray(allRows)) {
        const mapped = mapSupabasePersonnelListToStaffList(allRows as SupabasePersonnelRow[]);
        setStaffList(mapped);
      }
    } catch {
      // Keep optimistic list
    }
  };

  const handleSelfServiceUpdateOwnProfile = async (
    updates: SelfServiceProfileUpdateInput
  ) => {
    // 1. Resolve active target and updated staff record
    let updatedTarget: StaffMemberRecord | undefined;
    setStaffList((prev) => {
      const updated = updateOwnProfileSelfService(
        prev,
        currentUser.staffId,
        updates
      );
      updatedTarget = updated.find((s) => s.staffId === currentUser.staffId);
      if (updatedTarget) {
        setCurrentUserProfile(updatedTarget);
      }
      return updated;
    });

    // 2. Persist changes to Supabase `personnel` table based on active user's session email/ID
    try {
      const activeUser = await tryGetActiveSessionUser();
      const targetEmail = activeUser?.email || currentUser.email;

      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
      if (updates.avatar_url !== undefined) dbUpdates.avatar_url = updates.avatar_url;
      else if (updates.photoUrl !== undefined) dbUpdates.avatar_url = updates.photoUrl;

      if (updates.supervisor_email !== undefined) {
        dbUpdates.supervisor_email = updates.supervisor_email;
      } else if (updates.supervisor !== undefined) {
        const supTrim = updates.supervisor.trim();
        if (
          !supTrim ||
          supTrim.toLowerCase().includes('board of founders') ||
          supTrim.toLowerCase().includes('top executive')
        ) {
          dbUpdates.supervisor_email = null;
        } else {
          const matchedSup = staffList.find((s) => {
            const formatted = `${s.name} (${s.role})`;
            return (
              s.email.toLowerCase() === supTrim.toLowerCase() ||
              s.name.toLowerCase() === supTrim.toLowerCase() ||
              formatted.toLowerCase() === supTrim.toLowerCase() ||
              supTrim.toLowerCase().startsWith(`${s.name.toLowerCase()} (`)
            );
          });
          dbUpdates.supervisor_email = matchedSup ? matchedSup.email.toLowerCase() : null;
        }
      }

      if (Object.keys(dbUpdates).length > 0 && targetEmail) {
        // Attempt update with all provided fields
        const { error: updateError } = await supabase
          .from('personnel')
          .update(dbUpdates)
          .ilike('email', targetEmail);

        // If the 'supervisor' column does not exist yet in Supabase schema cache (PGRST204 / 42703),
        // fallback gracefully by updating known columns (name, avatar_url)
        if (
          updateError &&
          (updateError.code === 'PGRST204' ||
            updateError.code === '42703' ||
            updateError.message?.toLowerCase().includes('supervisor')) &&
          dbUpdates.supervisor
        ) {
          const { supervisor: _, ...fallbackUpdates } = dbUpdates;
          if (Object.keys(fallbackUpdates).length > 0) {
            await supabase
              .from('personnel')
              .update(fallbackUpdates)
              .ilike('email', targetEmail);
          }
        }

        // Persist supervisor and name in Supabase Auth user_metadata
        try {
          const authUserUpdates: any = {
            data: {
              name: updates.name ? updates.name.trim() : undefined,
              full_name: updates.name ? updates.name.trim() : undefined,
              supervisor: updates.supervisor ? updates.supervisor.trim() : undefined,
            },
          };
          if (updates.password && updates.password.trim()) {
            authUserUpdates.password = updates.password.trim();
          }
          await supabase.auth.updateUser(authUserUpdates);
        } catch {
          // Ignore auth metadata update if offline
        }
      }

      // Re-fetch personnel directory to keep global state synchronized
      if (targetEmail) {
        await fetchAndApplySupabasePersonnelProfile(targetEmail);
      }
      await refreshPersonnelDirectory();
    } catch {
      // Local state is already updated optimistically
    }
  };

  // Global refresh function to fetch latest personnel from Supabase and synchronize staffList
  const refreshPersonnelDirectory = async () => {
    try {
      const { data: allRows, error: dirError } = await supabase
        .from('personnel')
        .select('id, created_at, name, email, role, division, avatar_url, supervisor_email, status')
        .order('created_at', { ascending: true });

      if (!dirError && Array.isArray(allRows)) {
        const mapped = mapSupabasePersonnelListToStaffList(
          allRows as SupabasePersonnelRow[]
        );
        setStaffList(mapped);
      }
    } catch {
      // Ignore refresh error
    }
  };

  const handleSuperadminEditFullProfile = async (
    targetStaffId: string,
    updates: SuperadminProfileUpdateInput
  ): Promise<boolean> => {
    if (!isDeveloperUser) return false;

    // Optimistically calculate the updated staff member
    const targetBefore = staffList.find((s) => s.staffId === targetStaffId);
    const updatedList = superadminUpdateAnyProfile(
      staffList,
      currentUser,
      targetStaffId,
      updates
    );
    const target = updatedList.find((s) => s.staffId === targetStaffId);

    const updatePayload: {
      name?: string;
      email?: string;
      role?: string;
      division?: string;
      supervisor_email?: string | null;
    } = {};

    if (updates.name !== undefined) updatePayload.name = updates.name.trim();
    if (updates.email !== undefined) updatePayload.email = updates.email.trim().toLowerCase();
    if (updates.role !== undefined) updatePayload.role = updates.role.trim();
    if (updates.division !== undefined) updatePayload.division = updates.division.trim();

    // Map supervisor / supervisor_email
    if (updates.supervisor_email !== undefined) {
      updatePayload.supervisor_email = updates.supervisor_email;
    } else if (updates.supervisor !== undefined) {
      const supTrim = updates.supervisor.trim();
      if (
        !supTrim ||
        supTrim.toLowerCase().includes('board of founders') ||
        supTrim.toLowerCase().includes('top executive')
      ) {
        updatePayload.supervisor_email = null;
      } else {
        // Find matching supervisor by name or label in staffList
        const matchedSup = staffList.find((s) => {
          if (s.staffId === targetStaffId) return false;
          const formatted = `${s.name} (${s.role})`;
          return (
            s.email.toLowerCase() === supTrim.toLowerCase() ||
            s.name.toLowerCase() === supTrim.toLowerCase() ||
            formatted.toLowerCase() === supTrim.toLowerCase() ||
            supTrim.toLowerCase().startsWith(`${s.name.toLowerCase()} (`)
          );
        });
        updatePayload.supervisor_email = matchedSup ? matchedSup.email.toLowerCase() : null;
      }
    }

    // Determine target email or id to query in Supabase
    const targetEmail = target?.email || targetBefore?.email;
    const targetId = target?.id || targetBefore?.id;

    let updateQuery = supabase.from('personnel').update(updatePayload);

    // If target has numeric ID from Supabase, match by ID; else match by email
    if (targetId && !String(targetId).startsWith('sup_') && !String(targetId).startsWith('usr_')) {
      updateQuery = updateQuery.eq('id', targetId);
    } else if (targetEmail) {
      updateQuery = updateQuery.ilike('email', targetEmail);
    }

    const { error: updateError } = await updateQuery;
    if (updateError) {
      console.error('Failed to update personnel in Supabase:', updateError);
      throw new Error(updateError.message || 'Gagal menyimpan data user ke Supabase.');
    }

    // 2. Persist Team Members Assignment (update supervisor_email in Supabase)
    if (targetEmail && updates.teamMemberIds !== undefined) {
      const selectedIds = new Set(updates.teamMemberIds);
      // For all personnel currently in staffList:
      for (const staff of staffList) {
        if (staff.staffId === targetStaffId) continue;
        const candidateSupEmail = (staff.supervisor_email || '').trim().toLowerCase();
        const wasDirectReport =
          candidateSupEmail && targetEmail
            ? candidateSupEmail === targetEmail.toLowerCase()
            : isDirectReportOf(staff, target || targetBefore!);
        const isSelected = selectedIds.has(staff.staffId);

        if (isSelected) {
          // Set supervisor_email = targetEmail
          try {
            let q = supabase.from('personnel').update({ supervisor_email: targetEmail.toLowerCase() });
            if (staff.id && !String(staff.id).startsWith('sup_') && !String(staff.id).startsWith('usr_')) {
              q = q.eq('id', staff.id);
            } else if (staff.email) {
              q = q.ilike('email', staff.email);
            }
            await q;
          } catch (e) {
            console.warn('[Supabase team assign error]:', e);
          }
        } else if (wasDirectReport && !isSelected) {
          // Deselected: clear supervisor_email = null
          try {
            let q = supabase.from('personnel').update({ supervisor_email: null });
            if (staff.id && !String(staff.id).startsWith('sup_') && !String(staff.id).startsWith('usr_')) {
              q = q.eq('id', staff.id);
            } else if (staff.email) {
              q = q.ilike('email', staff.email);
            }
            await q;
          } catch (e) {
            console.warn('[Supabase team unassign error]:', e);
          }
        }
      }
    }

    // 3. Admin Manual Password Override
    if (updates.password && updates.password.trim()) {
      const cleanNewPassword = updates.password.trim();
      try {
        if ((supabase.auth as any).admin && targetId) {
          await (supabase.auth as any).admin.updateUserById(targetId, {
            password: cleanNewPassword,
          });
        }
      } catch (adminPassErr) {
        console.warn('[Supabase admin updateUser password error]:', adminPassErr);
      }
    }

    // Update local state and current active user state if the updated user is the active user
    setStaffList(updatedList);
    if (target && target.staffId === currentUserProfile?.staffId) {
      setUserRole(target.role);
      setUserDivision(target.division);
      setCurrentUserProfile(target);
    }

    // Refresh personnel list directly from database to ensure 100% data parity
    await refreshPersonnelDirectory();
    return true;
  };

  // 3. "Masuk dengan Google (Sign in with Google)" using Supabase OAuth
  const handleGoogleWorkspaceLogin = async () => {
    setLoginError('');
    setIsAuthSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo:
            typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) {
        setLoginError(
          error.message || 'Gagal autentikasi Google OAuth via Supabase.'
        );
      }
    } catch (err: any) {
      setLoginError(
        err?.message || 'Gagal autentikasi Google OAuth via Supabase.'
      );
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  // 1. Functional HTML5 Camera / File Input for Attendance Check-In
  const handleAttendanceFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const exactNowTime = formatRealTimeHHMM(new Date());
    setCheckInInputTime(exactNowTime);
    setUploadedCheckInFile(file);
    const objectUrl = URL.createObjectURL(file);
    setUploadedCheckInObjectUrl(objectUrl);
    setUploadedCheckInFileName(file.name);
    setCapturedPhotoUrl(objectUrl);
    setCheckInError('');
  };

  // Attendance Check-In Handler: Uploads photo to `attendance_photos` bucket & inserts record into `attendance` table
  const handleConfirmPhotoCheckIn = async (captureData: {
    file?: File | null;
    photoDataUrl: string;
    locationWatermark: string;
    mapsLinks: { title: string; uri: string }[];
  }) => {
    if (isSubmittingCheckIn || isCheckInLocked) return;

    setCheckInError('');
    setIsSubmittingCheckIn(true);

    try {
      const now = new Date();
      const isoCheckInTime = now.toISOString();
      const exactCheckInTime = formatRealTimeHHMM(now);
      const exactDate = isoCheckInTime.slice(0, 10);
      setCheckInInputTime(exactCheckInTime);

      const userEmail = (currentUser.email || loginEmail || 'user')
        .trim()
        .toLowerCase();

      // Resolve file from HTML5 camera input or file upload picker (or convert canvas dataURL fallback to File)
      let fileToUpload: File | null =
        captureData.file ||
        uploadedCheckInFile ||
        checkInFileInputRef.current?.files?.[0] ||
        checkInUploadInputRef.current?.files?.[0] ||
        null;

      if (!fileToUpload && captureData.photoDataUrl) {
        const res = await fetch(captureData.photoDataUrl);
        const blob = await res.blob();
        fileToUpload = new File([blob], `${userEmail}-${now.getTime()}.jpg`, {
          type: blob.type || 'image/jpeg',
        });
      }

      if (!fileToUpload) {
        setCheckInError(
          'Silakan pilih atau ambil foto kehadiran terlebih dahulu pada input kamera sebelum melakukan Check-In.'
        );
        setIsSubmittingCheckIn(false);
        return;
      }

      const rawExt = fileToUpload.name?.split('.').pop()?.toLowerCase();
      const ext = rawExt && /^[a-z0-9]+$/.test(rawExt) ? rawExt : 'jpg';
      const uniqueFileName = `${userEmail}-${now.getTime()}.${ext}`;

      // 1. Upload photo to Supabase Storage bucket `attendance_photos`
      const { error: uploadError } = await supabase.storage
        .from('attendance_photos')
        .upload(uniqueFileName, fileToUpload, {
          cacheControl: '3600',
          upsert: true,
          contentType: fileToUpload.type || 'image/jpeg',
        });

      if (uploadError) {
        throw new Error(
          `Gagal mengunggah foto ke Supabase Storage (attendance_photos): ${uploadError.message}`
        );
      }

      // 2. Retrieve public URL of the uploaded photo
      const { data: publicUrlData } = supabase.storage
        .from('attendance_photos')
        .getPublicUrl(uniqueFileName);

      const publicPhotoUrl =
        publicUrlData?.publicUrl ||
        uploadedCheckInObjectUrl ||
        captureData.photoDataUrl;

      // 3. Insert attendance record into Supabase `attendance` table
      const { error: insertError } = await supabase.from('attendance').insert([
        {
          email: userEmail,
          mode: selectedWorkMode,
          check_in_time: isoCheckInTime,
          photo_url: publicPhotoUrl,
        },
      ]);

      if (insertError) {
        throw new Error(
          `Gagal menyimpan data Check-In ke tabel attendance: ${insertError.message}`
        );
      }

      setCapturedPhotoUrl(publicPhotoUrl);
      setCapturedWatermark(captureData.locationWatermark);
      setCapturedMapsLinks(captureData.mapsLinks);
      setIsPhotoModalOpen(false);

      setCheckInSuccessData({
        email: userEmail,
        mode: selectedWorkMode,
        checkInTimeIso: isoCheckInTime,
        checkInTimeWib: exactCheckInTime,
        photoUrl: publicPhotoUrl,
      });

      setActiveAttendanceByEmail((prev) => ({
        ...prev,
        [userEmail]: {
          email: userEmail,
          mode: selectedWorkMode,
          check_in_time: isoCheckInTime,
          clock_out_time: null,
          photo_url: publicPhotoUrl,
        },
      }));

      const lateMins = calculateLateMinutes(exactCheckInTime);
      setIsPresent(selectedWorkMode === 'WFO');
      setCurrentUserProfile((prev) =>
        prev
          ? {
              ...prev,
              workMode: selectedWorkMode,
              checkInTime: exactCheckInTime,
              lateMinutesMonth: prev.lateMinutesMonth + lateMins,
            }
          : prev
      );
      setStaffList((prev) =>
        prev.map((s) =>
          s.staffId === currentUser.staffId
            ? {
                ...s,
                workMode: selectedWorkMode,
                checkInTime: exactCheckInTime,
                lateMinutesMonth: s.lateMinutesMonth + lateMins,
              }
            : s
        )
      );

      if (selectedWorkMode === 'WFO') {
        setWalkOutStaffId(null);
        setWalkInStaffId(currentUser.staffId);
        setSelectedOfficeStaffId(currentUser.staffId);
      } else {
        setWalkInStaffId(null);
        setWalkOutStaffId(currentUser.staffId);
        if (selectedOfficeStaffId === currentUser.staffId) {
          setSelectedOfficeStaffId(null);
        }
      }

      const newCheckInRecord: AttendanceRecord = {
        id: `att_${now.getTime()}`,
        staffId: currentUser.staffId,
        staffName: currentUser.name,
        role: currentUser.role,
        branch: currentUser.branch,
        date: exactDate,
        mode: selectedWorkMode,
        initialMode: selectedWorkMode,
        isHybridTransition: false,
        checkInTime: exactCheckInTime,
        checkOutTime: '',
        regularHours: 0,
        lateMinutes: lateMins,
        overtimeHours: 0,
        overtimePay: 0,
        overtimeNote: `Checked-In (${selectedWorkMode}) pukul ${exactCheckInTime} WIB`,
        locationWatermark: captureData.locationWatermark,
        mapsUri: captureData.mapsLinks[0]?.uri,
        photoDataUrl: publicPhotoUrl || undefined,
        status: 'checked_in',
      };

      setAttendanceLogs((prev) => [
        newCheckInRecord,
        ...prev.filter(
          (l) => !(l.staffId === currentUser.staffId && l.status === 'checked_in')
        ),
      ]);
      setPendingCheckOutLogId(newCheckInRecord.id);

      setExportStatusBanner({
        title: `Check-In ${selectedWorkMode} Berhasil — ${currentUser.name}`,
        message:
          selectedWorkMode === 'WFO'
            ? `Data Check-In WFO pukul ${exactCheckInTime} WIB dan foto kehadiran telah tersimpan di Supabase. Avatar Anda kini tampil di 3D Virtual Office.`
            : `Data Check-In WFE pukul ${exactCheckInTime} WIB dan foto kehadiran telah tersimpan di Supabase. Avatar Anda disembunyikan dari 3D Virtual Office.`,
      });
    } catch (err: any) {
      setCheckInError(
        err?.message || 'Terjadi kesalahan saat memproses Check-In ke Supabase.'
      );
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  // Direct handler when clicking the final 'Check-In' button on the Attendance form
  const handleDirectCheckInButtonClick = async () => {
    if (isSubmittingCheckIn || isCheckInLocked) return;
    const fileFromInput =
      uploadedCheckInFile ||
      checkInFileInputRef.current?.files?.[0] ||
      checkInUploadInputRef.current?.files?.[0] ||
      null;
    if (!fileFromInput) {
      setCheckInError(
        'Silakan pilih atau ambil foto kehadiran terlebih dahulu melalui tombol Ambil Foto atau Upload Foto.'
      );
      return;
    }
    await handleConfirmPhotoCheckIn({
      file: fileFromInput,
      photoDataUrl: uploadedCheckInObjectUrl || capturedPhotoUrl,
      locationWatermark: capturedWatermark,
      mapsLinks: capturedMapsLinks,
    });
  };

  // 3. HYBRID ATTENDANCE SYSTEM (WFO -> WFE) + Automatic 3D Avatar Removal
  const handleTransitionWfoToWfe = async () => {
    const now = new Date();
    const transitionTime = formatRealTimeHHMM(now);
    const exactDate = now.toISOString().slice(0, 10);

    setIsPresent(false);
    setWalkInStaffId(null);
    setWalkOutStaffId(currentUser.staffId);
    if (selectedOfficeStaffId === currentUser.staffId) {
      setSelectedOfficeStaffId(null);
    }

    const { updatedStaff, updatedLogs, updatedRecord } = transitionStaffWfoToWfe(
      staffList,
      attendanceLogs,
      currentUser.staffId,
      transitionTime
    );

    setStaffList(updatedStaff);
    setCurrentUserProfile((prev) =>
      prev ? { ...prev, workMode: 'WFE' } : prev
    );
    setSelectedWorkMode('WFE');

    if (updatedRecord) {
      setAttendanceLogs(updatedLogs);
      setPendingCheckOutLogId(updatedRecord.id);
    } else {
      const effectiveCheckIn =
        currentUser.checkInTime && currentUser.checkInTime !== '-'
          ? currentUser.checkInTime
          : checkInInputTime || transitionTime;
      const fallbackHybridRecord: AttendanceRecord = {
        id: `att_${Date.now()}`,
        staffId: currentUser.staffId,
        staffName: currentUser.name,
        role: currentUser.role,
        branch: currentUser.branch,
        date: exactDate,
        mode: 'WFE',
        initialMode: 'WFO',
        isHybridTransition: true,
        wfeTransitionTime: transitionTime,
        checkInTime: effectiveCheckIn,
        checkOutTime: '',
        regularHours: 0,
        lateMinutes: calculateLateMinutes(effectiveCheckIn),
        overtimeHours: 0,
        overtimePay: 0,
        overtimeNote: `Checked-In (WFO) · Transisi Lokasi (Pindah WFE) pukul ${transitionTime} WIB`,
        locationWatermark: `${FUTARI_HQ_ADDRESS} → Transisi WFE (${transitionTime} WIB)`,
        status: 'checked_in',
      };
      setAttendanceLogs((prev) => [fallbackHybridRecord, ...prev]);
      setPendingCheckOutLogId(fallbackHybridRecord.id);
    }

    const userEmail = (currentUser.email || '').trim().toLowerCase();
    if (userEmail) {
      try {
        await supabase
          .from('attendance')
          .update({
            mode: 'WFE',
            is_hybrid_transition: true,
            wfe_transition_time: transitionTime,
          })
          .eq('email', userEmail)
          .is('clock_out_time', null);
      } catch {
        // Fallback to local state if network fails
      }
      setActiveAttendanceByEmail((prev) => {
        if (!prev[userEmail]) return prev;
        return {
          ...prev,
          [userEmail]: {
            ...prev[userEmail],
            mode: 'WFE',
            isHybridTransition: true,
            wfeTransitionTime: transitionTime,
          },
        };
      });
    }

    setExportStatusBanner({
      title: `Transisi Lokasi (Pindah WFE) Tercatat — ${transitionTime} WIB`,
      message: `Status ${currentUser.name} berubah dari WFO menjadi WFE pada pukul ${transitionTime} WIB. Avatar otomatis disembunyikan dari 3D Virtual Office.`,
    });
  };

  // 3b. HYBRID ATTENDANCE REVERSAL SYSTEM (WFE -> WFO) + Automatic 3D Avatar Spawning
  const handleTransitionWfeToWfo = async () => {
    const now = new Date();
    const transitionTime = formatRealTimeHHMM(now);
    const exactDate = now.toISOString().slice(0, 10);

    setIsPresent(true);
    setWalkInStaffId(currentUser.staffId);
    setWalkOutStaffId(null);
    setSelectedOfficeStaffId(currentUser.staffId);

    const { updatedStaff, updatedLogs, updatedRecord } = transitionStaffWfeToWfo(
      staffList,
      attendanceLogs,
      currentUser.staffId,
      transitionTime
    );

    setStaffList(updatedStaff);
    setCurrentUserProfile((prev) =>
      prev ? { ...prev, workMode: 'WFO' } : prev
    );
    setSelectedWorkMode('WFO');

    if (updatedRecord) {
      setAttendanceLogs(updatedLogs);
      setPendingCheckOutLogId(updatedRecord.id);
    } else {
      const effectiveCheckIn =
        currentUser.checkInTime && currentUser.checkInTime !== '-'
          ? currentUser.checkInTime
          : checkInInputTime || transitionTime;
      const fallbackHybridRecord: AttendanceRecord = {
        id: `att_${Date.now()}`,
        staffId: currentUser.staffId,
        staffName: currentUser.name,
        role: currentUser.role,
        branch: currentUser.branch,
        date: exactDate,
        mode: 'WFO',
        initialMode: 'WFE',
        isHybridTransition: true,
        wfeTransitionTime: transitionTime,
        checkInTime: effectiveCheckIn,
        checkOutTime: '',
        regularHours: 0,
        lateMinutes: calculateLateMinutes(effectiveCheckIn),
        overtimeHours: 0,
        overtimePay: 0,
        overtimeNote: `Checked-In (WFE) · Transisi Lokasi (Pindah WFO) pukul ${transitionTime} WIB`,
        locationWatermark: `Event Venue → Transisi WFO (${transitionTime} WIB): ${FUTARI_HQ_ADDRESS}`,
        status: 'checked_in',
      };
      setAttendanceLogs((prev) => [fallbackHybridRecord, ...prev]);
      setPendingCheckOutLogId(fallbackHybridRecord.id);
    }

    const userEmail = (currentUser.email || '').trim().toLowerCase();
    if (userEmail) {
      try {
        await supabase
          .from('attendance')
          .update({
            mode: 'WFO',
            is_hybrid_transition: true,
            wfe_transition_time: transitionTime,
          })
          .eq('email', userEmail)
          .is('clock_out_time', null);
      } catch {
        // Fallback to local state if network fails
      }
      setActiveAttendanceByEmail((prev) => {
        if (!prev[userEmail]) return prev;
        return {
          ...prev,
          [userEmail]: {
            ...prev[userEmail],
            mode: 'WFO',
            isHybridTransition: true,
            wfeTransitionTime: transitionTime,
          },
        };
      });
    }

    setExportStatusBanner({
      title: `Transisi Lokasi (Pindah WFO) Tercatat — ${transitionTime} WIB`,
      message: `Status ${currentUser.name} berubah dari WFE menjadi WFO pada pukul ${transitionTime} WIB. Avatar otomatis dimunculkan kembali di 3D Virtual Office.`,
    });
  };

  // Trigger Clock-Out: automatically captures real-time system timestamp (new Date()) and opens Mandatory "Deskripsi Pekerjaan Hari Ini" modal
  const handleEvaluateClockOutRule = () => {
    const exactClockOutTime = formatRealTimeHHMM(new Date());
    setCheckOutInputTime(exactClockOutTime);
    setPendingCheckOutLogId(activeCurrentUserCheckIn?.id || null);
    setOvertimeNoteInput('');
    setOvertimeNoteError('');
    setIsOvertimeModalOpen(true);
  };

  const handleSaveMandatoryOvertimeNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = overtimeNoteInput.trim();
    if (trimmed.length < 5) {
      setOvertimeNoteError(
        'Wajib diisi! Anda tidak dapat Clock-Out tanpa mengisi Deskripsi Pekerjaan Hari Ini (minimal 5 karakter).'
      );
      return;
    }

    const now = new Date();
    const exactClockOutTime = formatRealTimeHHMM(now);
    const exactDate = now.toISOString().slice(0, 10);
    setCheckOutInputTime(exactClockOutTime);

    const effectiveCheckIn =
      activeCurrentUserCheckIn?.checkInTime ||
      checkInInputTime ||
      exactClockOutTime;
    const lateMins = calculateLateMinutes(effectiveCheckIn);
    const overtimeCalc = calculateOvertime(exactClockOutTime);
    const regHours = calculateRegularWorkingHours(
      effectiveCheckIn,
      exactClockOutTime
    );

    const newLog: AttendanceRecord = {
      id:
        pendingCheckOutLogId ||
        activeCurrentUserCheckIn?.id ||
        `att_${Date.now()}`,
      staffId: currentUser.staffId,
      staffName: currentUser.name,
      role: currentUser.role,
      branch: currentUser.branch,
      date: activeCurrentUserCheckIn?.date || exactDate,
      mode: activeCurrentUserCheckIn?.mode || selectedWorkMode,
      initialMode: activeCurrentUserCheckIn?.initialMode || selectedWorkMode,
      isHybridTransition: activeCurrentUserCheckIn?.isHybridTransition || false,
      wfeTransitionTime: activeCurrentUserCheckIn?.wfeTransitionTime,
      checkInTime: effectiveCheckIn,
      checkOutTime: exactClockOutTime,
      regularHours: regHours,
      lateMinutes: lateMins,
      overtimeHours: overtimeCalc.overtimeHours,
      overtimePay: overtimeCalc.overtimePay,
      overtimeNote: trimmed, // Mandatory Daily Description strictly attached
      locationWatermark:
        activeCurrentUserCheckIn?.locationWatermark || capturedWatermark,
      mapsUri: capturedMapsLinks[0]?.uri,
      photoDataUrl:
        activeCurrentUserCheckIn?.photoDataUrl ||
        capturedPhotoUrl ||
        undefined,
      status: 'completed',
    };

    setAttendanceLogs((prev) => [
      newLog,
      ...prev.filter(
        (l) =>
          l.id !== newLog.id &&
          !(l.staffId === currentUser.staffId && l.status === 'checked_in')
      ),
    ]);

    // Update `clock_out_time` and `task_description` on today's active attendance record in Supabase
    // so Supabase Realtime broadcasts the UPDATE (Clock-Out) event to despawn the 3D avatar
    const userEmail = (currentUser.email || '').trim().toLowerCase();
    if (userEmail) {
      try {
        await supabase
          .from('attendance')
          .update({
            clock_out_time: now.toISOString(),
            task_description: trimmed,
          })
          .eq('email', userEmail)
          .is('clock_out_time', null);
      } catch {
        // Fallback to local state removal if offline
      }
      setActiveAttendanceByEmail((prev) => {
        if (!(userEmail in prev)) return prev;
        const next = { ...prev };
        delete next[userEmail];
        return next;
      });
    }

    // Checked-out / offline: automatically remove and hide user's avatar from the 3D Virtual Office
    setCheckInSuccessData(null);
    setIsPresent(false);
    setWalkInStaffId(null);
    setWalkOutStaffId(currentUser.staffId);
    if (selectedOfficeStaffId === currentUser.staffId) {
      setSelectedOfficeStaffId(null);
    }
    setCurrentUserProfile((prev) =>
      prev ? { ...prev, workMode: 'OFFLINE', checkInTime: '-' } : prev
    );
    setStaffList((prev) =>
      prev.map((s) =>
        s.staffId === currentUser.staffId
          ? { ...s, workMode: 'OFFLINE', checkInTime: '-' }
          : s
      )
    );

    setIsOvertimeModalOpen(false);
    setPendingCheckOutLogId(null);
  };

  // Toggle helper for multi-selecting "Personel Terlibat / PIC" from the personnel database
  const toggleStaffSelection = (
    staffId: string,
    currentSelection: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (currentSelection.includes(staffId)) {
      if (currentSelection.length > 1) {
        setter(currentSelection.filter((id) => id !== staffId));
      }
    } else {
      setter([...currentSelection, staffId]);
    }
  };

  // Toggle helper for multi-selecting `authorized_personnel` emails in Master Event creation
  const toggleAuthorizedEmailSelection = (emailRaw: string) => {
    const cleanEmail = emailRaw.trim().toLowerCase();
    if (!cleanEmail) return;
    setBudgetAuthorizedEmails((prev) => {
      if (prev.includes(cleanEmail)) {
        return prev.filter((em) => em !== cleanEmail);
      }
      return [...prev, cleanEmail];
    });
    const matchedStaff = staffList.find(
      (s) => (s.email || '').trim().toLowerCase() === cleanEmail
    );
    if (matchedStaff) {
      setBudgetInvolvedStaffIds((prev) =>
        prev.includes(matchedStaff.staffId)
          ? prev.filter((id) => id !== matchedStaff.staffId)
          : [...prev, matchedStaff.staffId]
      );
    }
  };

  // 1. MASTER EVENT CREATION (`pc_events` table: event_name, created_by, authorized_personnel, is_completed, approved_budget)
  const handleSaveApprovedBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetModalError('');
    const cleanEventName = budgetEventNameInput.trim();
    const parsedBudget = Number(String(newBudgetAmount).replace(/[^0-9]/g, ''));

    if (!cleanEventName) {
      setBudgetModalError('Nama Event (event_name) wajib diisi.');
      return;
    }
    if (!parsedBudget || parsedBudget <= 0) {
      setBudgetModalError(
        'Total Dana Approval (IDR) wajib diisi dan harus lebih besar dari 0.'
      );
      return;
    }

    // Resolve emails from both `budgetAuthorizedEmails` and `budgetInvolvedStaffIds`
    const emailsFromStaffIds = budgetInvolvedStaffIds
      .map((id) => {
        const s = staffList.find((m) => m.staffId === id);
        return s?.email ? s.email.trim().toLowerCase() : '';
      })
      .filter(Boolean);

    const creatorEmail = (currentUser.email || '').trim().toLowerCase();
    const combinedAuthorizedEmails = Array.from(
      new Set(
        [...budgetAuthorizedEmails, ...emailsFromStaffIds, creatorEmail].filter(
          Boolean
        )
      )
    );

    if (combinedAuthorizedEmails.length === 0) {
      setBudgetModalError(
        'Pilih minimal 1 personel untuk ditambahkan ke authorized_personnel.'
      );
      return;
    }

    setIsSubmittingPcEvent(true);
    try {
      let createdId = `evt_${Date.now()}`;
      let createdRow: PcEventRow = {
        id: createdId,
        event_name: cleanEventName,
        created_by: creatorEmail,
        authorized_personnel: combinedAuthorizedEmails,
        is_completed: false,
        approved_budget: parsedBudget,
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('pc_events')
        .insert([
          {
            event_name: cleanEventName,
            created_by: creatorEmail,
            authorized_personnel: combinedAuthorizedEmails,
            is_completed: false,
            approved_budget: parsedBudget,
          },
        ])
        .select(
          'id, event_name, created_by, authorized_personnel, is_completed, approved_budget'
        )
        .single();

      if (!insertError && insertedData) {
        createdRow = insertedData as PcEventRow;
        createdId = String(createdRow.id);
      }

      const mappedEvent = mapPcEventRowToEventBudgetRecord(
        createdRow,
        staffList,
        parsedBudget
      );

      setEventsList((prev) => [mappedEvent, ...prev]);
      setSelectedEventId(createdId);
      setExpenseEventNameInput(cleanEventName);
      setExpenseInvolvedStaffIds(mappedEvent.involvedStaffIds);
      setIsBudgetModalOpen(false);
      setExportStatusBanner({
        title: `Event Baru Dibuat — ${cleanEventName}`,
        message: `Event "${cleanEventName}" dengan Total Dana Approval ${formatIDR(
          parsedBudget
        )} berhasil disimpan ke tabel pc_events (${combinedAuthorizedEmails.length} personel di authorized_personnel).`,
      });
    } catch (err: any) {
      setBudgetModalError(
        err?.message || 'Gagal menyimpan event baru ke Supabase pc_events.'
      );
    } finally {
      setIsSubmittingPcEvent(false);
    }
  };

  // 2. COMPLETE EVENT WORKFLOW (`Tandai Event Selesai` -> updates `is_completed` to `true` in `pc_events`)
  const handleMarkEventCompleted = async () => {
    if (
      !activeEventBudget ||
      activeEventBudget.eventId === 'evt_none' ||
      activeEventBudget.is_completed ||
      isCompletingPcEvent
    ) {
      return;
    }

    const targetEventId = activeEventBudget.id || activeEventBudget.eventId;
    setIsCompletingPcEvent(true);
    try {
      await supabase
        .from('pc_events')
        .update({ is_completed: true })
        .eq('id', targetEventId);

      setEventsList((prev) =>
        prev.map((ev) =>
          ev.eventId === targetEventId || ev.id === targetEventId
            ? {
                ...ev,
                is_completed: true,
                clientName: 'Selesai (Closed)',
              }
            : ev
        )
      );

      setExportStatusBanner({
        title: `Event Selesai & Dikunci — ${
          activeEventBudget.event_name || activeEventBudget.eventName
        }`,
        message: `Status is_completed pada pc_events telah diperbarui menjadi true. Form input struk baru kini dikunci, namun tombol Download Laporan Petty Cash (Excel) tetap tersedia.`,
      });
    } finally {
      setIsCompletingPcEvent(false);
    }
  };

  // 3. Functional HTML5 Camera / File Input for Petty Cash Receipt Scan
  const handlePettyCashReceiptFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setExpenseReceiptFile(file);
    setExpenseReceiptDataUrl(objectUrl);
    setExpenseReceiptLabel(file.name);
    setExpenseFormError('');

    const defaultEventName =
      activeEventBudget.eventId !== 'evt_none'
        ? activeEventBudget.event_name || activeEventBudget.eventName
        : expenseEventNameInput.trim() || 'Event Operasional Futari';
    if (!expenseEventNameInput.trim()) {
      setExpenseEventNameInput(defaultEventName);
    }
    const defaultMerchant =
      expenseMerchant.trim() ||
      file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ') ||
      'Merchant Struk Operasional';
    if (!expenseMerchant.trim()) {
      setExpenseMerchant(defaultMerchant);
    }
    const numericAmount =
      Number(expenseAmount.replace(/[^0-9]/g, '')) || 250000;
    if (!expenseAmount.trim()) {
      setExpenseAmount(String(numericAmount));
    }

    setSelectedReceiptDetail({
      id: `preview_${Date.now()}`,
      eventId: activeEventBudget.eventId,
      event_id: activeEventBudget.eventId,
      eventName: defaultEventName,
      involvedPersonnelIds:
        expenseInvolvedStaffIds.length > 0
          ? expenseInvolvedStaffIds
          : [currentUser.staffId],
      involvedStaffIds:
        expenseInvolvedStaffIds.length > 0
          ? expenseInvolvedStaffIds
          : [currentUser.staffId],
      involvedPersonnelNames: [
        `${currentUser.name} (${currentUser.role})`,
      ],
      merchant: defaultMerchant,
      date: expenseDate,
      receipt_date: expenseDate,
      amount: numericAmount,
      category: expenseCategory,
      receiptLabel: file.name,
      receiptDataUrl: objectUrl,
      receipt_url: objectUrl,
      submittedBy: currentUser.email || currentUser.name,
      submitted_by: currentUser.email || currentUser.name,
      submittedByStaffId: currentUser.staffId,
    });
  };

  const handleMintaPitiScanStruk = async () => {
    setIsScanningOcr(true);
    setExpenseFormError('');
    try {
      const res = await fetch('/api/gemini/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleHint: `Event: ${expenseEventNameInput || activeEventBudget.eventName}`,
        }),
      });
      const data = await res.json();
      const merchant = data.merchant || 'Kopi Kenangan - Kemang Raya';
      const date = data.date || new Date().toISOString().slice(0, 10);
      const amount = Number(data.amount) || 285000;
      const category = data.category || 'Consumption & Crew Meals';

      setExpenseMerchant(merchant);
      setExpenseDate(date);
      setExpenseAmount(String(amount));
      setExpenseCategory(category);
      if (!expenseReceiptDataUrl) {
        const thumbUrl = createReceiptThumbnailDataUrl(merchant, amount, date);
        setExpenseReceiptLabel(
          `STRUK_${merchant
            .replace(/[^a-zA-Z0-9]/g, '_')
            .toUpperCase()
            .slice(0, 18)}_${date}.PNG`
        );
        setExpenseReceiptDataUrl(thumbUrl);
      }
    } catch {
      const todayIso = new Date().toISOString().slice(0, 10);
      setExpenseMerchant('Kopi Kenangan - Kemang Raya');
      setExpenseDate(todayIso);
      setExpenseAmount('285000');
      setExpenseCategory('Consumption & Crew Meals');
      if (!expenseReceiptDataUrl) {
        const thumbUrl = createReceiptThumbnailDataUrl(
          'Kopi Kenangan - Kemang Raya',
          285000,
          todayIso
        );
        setExpenseReceiptLabel('STRUK_KOPI_KENANGAN.PNG');
        setExpenseReceiptDataUrl(thumbUrl);
      }
    } finally {
      setIsScanningOcr(false);
    }
  };

  // 4. DETAIL TRANSACTION SUBMISSION (`pc_transactions` table: event_id, submitted_by, merchant, receipt_date, category, amount, receipt_url)
  const handleAddPettyCashExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseFormError('');

    if (activeEventBudget.eventId === 'evt_none') {
      setExpenseFormError(
        'Silakan pilih atau buat Event terlebih dahulu sebelum mengunggah struk transaksi.'
      );
      return;
    }

    // Strict Locking: If `is_completed === true`, block any new transaction submission
    if (activeEventBudget.is_completed) {
      setExpenseFormError(
        'Event ini telah ditandai selesai (is_completed = true). Penambahan struk baru dikunci.'
      );
      return;
    }

    const cleanMerchant = expenseMerchant.trim();
    const numericAmount = Number(expenseAmount.replace(/[^0-9]/g, ''));

    if (!cleanMerchant) {
      setExpenseFormError('Nama Merchant wajib diisi.');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setExpenseFormError('Nominal pengeluaran harus lebih besar dari IDR 0.');
      return;
    }

    setIsSubmittingPcTransaction(true);
    try {
      const targetEventId = activeEventBudget.id || activeEventBudget.eventId;
      const submitterEmail = (currentUser.email || currentUser.name).trim();

      // Upload receipt file to Supabase Storage if available, otherwise use data/object URL
      let finalReceiptUrl =
        expenseReceiptDataUrl ||
        createReceiptThumbnailDataUrl(cleanMerchant, numericAmount, expenseDate);

      const fileToUpload =
        expenseReceiptFile || receiptFileInputRef.current?.files?.[0] || null;
      if (fileToUpload) {
        const ext = (fileToUpload.name.split('.').pop() || 'jpg').toLowerCase();
        const safeEmail = submitterEmail.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `petty_cash/${safeEmail}-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('attendance_photos')
          .upload(storagePath, fileToUpload, {
            cacheControl: '3600',
            upsert: true,
          });
        if (!uploadErr) {
          const { data: pubData } = supabase.storage
            .from('attendance_photos')
            .getPublicUrl(storagePath);
          if (pubData?.publicUrl) {
            finalReceiptUrl = pubData.publicUrl;
          }
        }
      }

      let createdTxId = `pc_${Date.now()}`;
      const txPayload = {
        event_id: targetEventId,
        submitted_by: submitterEmail,
        merchant: cleanMerchant,
        receipt_date: expenseDate,
        category: expenseCategory,
        amount: numericAmount,
        receipt_url: finalReceiptUrl,
      };

      const { data: insertedTx, error: txError } = await supabase
        .from('pc_transactions')
        .insert([txPayload])
        .select(
          'id, event_id, submitted_by, merchant, receipt_date, category, amount, receipt_url'
        )
        .single();

      if (!txError && insertedTx) {
        createdTxId = String((insertedTx as PcTransactionRow).id);
      }

      const newRecord = mapPcTransactionRowToPettyCashRecord(
        {
          id: createdTxId,
          ...txPayload,
        },
        activeEventBudget
      );

      setPettyCashList((prev) => [newRecord, ...prev]);
      setExpenseMerchant('');
      setExpenseAmount('');
      setExpenseReceiptFile(null);
      setExpenseReceiptLabel('');
      setExpenseReceiptDataUrl('');
      if (receiptFileInputRef.current) {
        receiptFileInputRef.current.value = '';
      }
    } catch (err: any) {
      setExpenseFormError(
        err?.message || 'Gagal menyimpan transaksi ke tabel pc_transactions.'
      );
    } finally {
      setIsSubmittingPcTransaction(false);
    }
  };

  const handleDownloadAttendancePDF = async () => {
    setIsReportViewerOpen(true);
  };

  const handleDownloadAttendanceExcel = async () => {
    setIsExporting(true);
    try {
      const syncedLogs = syncAttendanceLogsWithLeave(
        privateUserAttendanceLogs,
        leaveRecords,
        targetAttendanceEmployee,
        calendarEvents
      );
      const result = await exportMonthlyAttendanceReportExcel(
        payrollCycle.label,
        targetAttendanceEmployee,
        syncedLogs,
        isGoogleConnected
      );
      setExportStatusBanner({
        title: result.title,
        message: result.summaryMessage,
        cloudUrl: result.cloudUrl,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmStructuredPdfDownload = async (syncToDocs: boolean) => {
    setIsExporting(true);
    try {
      const syncedLogs = syncAttendanceLogsWithLeave(
        privateUserAttendanceLogs,
        leaveRecords,
        targetAttendanceEmployee,
        calendarEvents
      );
      const result = await exportMonthlyAttendanceReportPDF(
        payrollCycle.label,
        targetAttendanceEmployee,
        syncedLogs,
        syncToDocs && isGoogleConnected
      );
      setExportStatusBanner({
        title: result.title,
        message: result.summaryMessage,
        cloudUrl: result.cloudUrl,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTeamDashboardPDF = async (
    targetEmployee: StaffMemberRecord,
    logsToExport: AttendanceRecord[]
  ) => {
    setIsExporting(true);
    try {
      const syncedLogs = syncAttendanceLogsWithLeave(
        logsToExport,
        leaveRecords,
        targetEmployee,
        calendarEvents
      );
      const result = await exportMonthlyAttendanceReportPDF(
        payrollCycle.label,
        targetEmployee,
        syncedLogs,
        isGoogleConnected
      );
      setExportStatusBanner({
        title: result.title,
        message: result.summaryMessage,
        cloudUrl: result.cloudUrl,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTeamDashboardExcel = async (
    targetEmployee: StaffMemberRecord,
    logsToExport: AttendanceRecord[]
  ) => {
    setIsExporting(true);
    try {
      const syncedLogs = syncAttendanceLogsWithLeave(
        logsToExport,
        leaveRecords,
        targetEmployee,
        calendarEvents
      );
      const result = await exportMonthlyAttendanceReportExcel(
        payrollCycle.label,
        targetEmployee,
        syncedLogs,
        isGoogleConnected
      );
      setExportStatusBanner({
        title: result.title,
        message: result.summaryMessage,
        cloudUrl: result.cloudUrl,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendChatMessage = async (
    channel: ChatMessageItem['channel'],
    messageText: string,
    isAnnouncement: boolean
  ) => {
    const nowTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const activeUser = await tryGetActiveSessionUser();
    const senderEmail = (activeUser?.email || currentUser.email || '').trim().toLowerCase();

    const newMsg: ChatMessageItem = {
      id: `msg_${Date.now()}`,
      staffId: currentUser.staffId,
      senderName: currentUser.name,
      senderRole: `${currentUser.role} · ${currentUser.divisionLabel}`,
      branch: currentUser.branch,
      initials: currentUser.initials,
      avatarColor: currentUser.avatarColor,
      channel,
      message: messageText,
      timestamp: `${nowTime} WIB`,
      isAnnouncement,
    };
    // Optimistic UI update
    setChatMessages((prev) => [...prev, newMsg]);

    // Insert into Supabase `chat_messages` table (id, created_at, sender_email, message, is_announcement)
    try {
      if (senderEmail) {
        await supabase.from('chat_messages').insert([
          {
            sender_email: senderEmail,
            message: messageText,
            is_announcement: isAnnouncement,
          },
        ]);
        await fetchChatMessagesFromSupabase();
      }
    } catch {
      // Keep optimistic message
    }
  };



  const handleSubmitLeaveRequest = (
    newLeave: Omit<LeaveRecordItem, 'id' | 'badgeLabel' | 'status'> | LeaveRecordItem
  ) => {
    const firstName = newLeave.staffName.split(' ')[0];
    const created: LeaveRecordItem = {
      ...newLeave,
      id: 'id' in newLeave && newLeave.id ? newLeave.id : `lv_${Date.now()}`,
      status: 'Approved',
      badgeLabel:
        'badgeLabel' in newLeave && newLeave.badgeLabel
          ? newLeave.badgeLabel
          : `${firstName} - ${newLeave.leaveType}`,
    };
    setLeaveRecords((prev) => [created, ...prev]);
  };

  const handleAddCalendarEvent = async (newEvent: CalendarEventItem) => {
    if (newEvent.eventType === 'Booking Mobil Operasional') {
      const bookingEmail = (
        newEvent.email ||
        currentUser.email ||
        loginEmail ||
        ''
      )
        .trim()
        .toLowerCase();
      const bookingVehicle = (
        newEvent.vehicle ||
        newEvent.vehicleName ||
        newEvent.title ||
        'Unit Operasional Futari'
      ).trim();
      const bookingPurpose = (
        newEvent.purpose ||
        newEvent.title ||
        'Operasional Kendaraan Futari'
      ).trim();
      const startTimeIso =
        newEvent.start_time ||
        new Date(`${newEvent.startDate}T09:00:00`).toISOString();
      const endTimeIso =
        newEvent.end_time ||
        new Date(
          `${newEvent.endDate || newEvent.startDate}T17:00:00`
        ).toISOString();

      let createdEvent: CalendarEventItem = {
        ...newEvent,
        email: bookingEmail,
        vehicle: bookingVehicle,
        vehicleName: bookingVehicle,
        start_time: startTimeIso,
        end_time: endTimeIso,
        purpose: bookingPurpose,
        title: bookingPurpose,
      };

      const { data: insertedRow, error: insertError } = await supabase
        .from('vehicle_bookings')
        .insert([
          {
            email: bookingEmail,
            vehicle: bookingVehicle,
            start_time: startTimeIso,
            end_time: endTimeIso,
            purpose: bookingPurpose,
          },
        ])
        .select('*')
        .single();

      if (insertError) {
        throw new Error(
          `Gagal menyimpan booking ke tabel vehicle_bookings: ${insertError.message}`
        );
      }

      if (insertedRow) {
        createdEvent = mapVehicleBookingRowToCalendarEvent(
          insertedRow as VehicleBookingRow,
          staffList,
          0
        );
      }

      setCalendarEvents((prev) => [createdEvent, ...prev]);
      await fetchVehicleBookingsFromSupabase();

      // Automatically update the booked vehicle's status to 'Digunakan' in Supabase `vehicles` table
      try {
        // Find matching vehicle by plate or name substring
        const targetVeh = fleetVehicles.find(
          (v) =>
            v.licensePlate &&
            bookingVehicle.toLowerCase().includes(v.licensePlate.toLowerCase())
        ) || fleetVehicles.find(
          (v) =>
            v.model &&
            bookingVehicle.toLowerCase().includes(v.model.toLowerCase())
        );

        if (targetVeh) {
          await supabase
            .from('vehicles')
            .update({ status: 'Digunakan' })
            .eq('id', targetVeh.id);
        } else {
          await supabase
            .from('vehicles')
            .update({ status: 'Digunakan' })
            .ilike('name', `%${bookingVehicle}%`);
        }
        await fetchVehiclesFromSupabase();
      } catch {
        // Non-blocking sync
      }

      setExportStatusBanner({
        title: `Booking Kendaraan Tersimpan — ${bookingVehicle}`,
        message: `Jadwal "${bookingPurpose}" (${bookingVehicle}) oleh ${bookingEmail} telah disimpan ke tabel vehicle_bookings.`,
      });
      return;
    }

    setCalendarEvents((prev) => [newEvent, ...prev]);
    setExportStatusBanner({
      title: `Jadwal Kalender Ditambahkan (${newEvent.eventType || 'Event Kantor'})`,
      message: `${newEvent.title} pada ${newEvent.startDate} berhasil dijadwalkan.`,
    });
  };

  const handleUpdateVehicleBooking = async (
    bookingId: string,
    updates: Partial<CalendarEventItem>
  ) => {
    // Strict RBAC guard: only 'dev' or 'executive' can modify existing bookings
    if (!canEditOrDeleteVehicleBooking(currentUser)) {
      return;
    }

    const existingBooking = calendarEvents.find((ev) => ev.id === bookingId);
    const updatedVehicle = (
      updates.vehicle ??
      updates.vehicleName ??
      existingBooking?.vehicle ??
      existingBooking?.vehicleName ??
      ''
    ).trim();
    const updatedPurpose = (
      updates.purpose ??
      updates.title ??
      existingBooking?.purpose ??
      existingBooking?.title ??
      ''
    ).trim();
    const updatedStartTime =
      updates.start_time ||
      (updates.startDate
        ? new Date(`${updates.startDate}T09:00:00`).toISOString()
        : existingBooking?.start_time || new Date().toISOString());
    const updatedEndTime =
      updates.end_time ||
      (updates.endDate
        ? new Date(`${updates.endDate}T17:00:00`).toISOString()
        : existingBooking?.end_time || new Date().toISOString());

    const dbPayload = {
      vehicle: updatedVehicle,
      start_time: updatedStartTime,
      end_time: updatedEndTime,
      purpose: updatedPurpose,
    };

    try {
      const hasRealDbId =
        bookingId &&
        !bookingId.startsWith('car_') &&
        !bookingId.startsWith('vb_') &&
        !bookingId.startsWith('cal_');

      if (hasRealDbId) {
        const { error } = await supabase
          .from('vehicle_bookings')
          .update(dbPayload)
          .eq('id', bookingId);
        if (error && existingBooking?.email && existingBooking?.start_time) {
          await supabase
            .from('vehicle_bookings')
            .update(dbPayload)
            .eq('email', existingBooking.email)
            .eq('start_time', existingBooking.start_time);
        }
      } else if (existingBooking?.email && existingBooking?.start_time) {
        await supabase
          .from('vehicle_bookings')
          .update(dbPayload)
          .eq('email', existingBooking.email)
          .eq('start_time', existingBooking.start_time);
      }
    } catch (err) {
      console.warn('[Supabase Vehicle Booking Update Error]:', err);
    }

    setCalendarEvents((prev) =>
      prev.map((ev) =>
        ev.id === bookingId
          ? {
              ...ev,
              ...updates,
              vehicle: updatedVehicle,
              vehicleName: updatedVehicle,
              purpose: updatedPurpose,
              title: updatedPurpose,
              start_time: updatedStartTime,
              end_time: updatedEndTime,
            }
          : ev
      )
    );
    await fetchVehicleBookingsFromSupabase();

    setExportStatusBanner({
      title: 'Jadwal Booking Diperbarui',
      message: `Jadwal pemakaian kendaraan (${updatedVehicle}) berhasil diperbarui di tabel vehicle_bookings oleh ${currentUser.name}.`,
    });
  };

  const handleDeleteVehicleBooking = async (bookingId: string) => {
    // Strict RBAC guard: only 'dev' or 'executive' can delete/cancel existing bookings
    if (!canEditOrDeleteVehicleBooking(currentUser)) {
      return;
    }

    const targetBooking = calendarEvents.find((ev) => ev.id === bookingId);
    const remainingBookings = calendarEvents.filter((ev) => ev.id !== bookingId);
    setCalendarEvents(remainingBookings);

    // Free up the vehicle status if no other active booking remains for that vehicle
    const targetVehicleLabel =
      targetBooking?.vehicle || targetBooking?.vehicleName;
    if (targetVehicleLabel) {
      const stillHasActiveBooking = remainingBookings.some(
        (ev) =>
          ev.eventType === 'Booking Mobil Operasional' &&
          (ev.vehicle === targetVehicleLabel ||
            ev.vehicleName === targetVehicleLabel)
      );

      if (!stillHasActiveBooking) {
        setFleetVehicles((prev) =>
          prev.map((v) => {
            const isMatchedVehicle =
              targetVehicleLabel.includes(v.licensePlate) ||
              targetVehicleLabel.includes(v.model);
            if (isMatchedVehicle && v.status === 'Digunakan') {
              return { ...v, status: 'Tersedia' };
            }
            return v;
          })
        );
      }
    }

    try {
      const hasRealDbId =
        bookingId &&
        !bookingId.startsWith('car_') &&
        !bookingId.startsWith('vb_') &&
        !bookingId.startsWith('cal_');

      if (hasRealDbId) {
        const { error } = await supabase
          .from('vehicle_bookings')
          .delete()
          .eq('id', bookingId);
        if (error && targetBooking?.email && targetBooking?.start_time) {
          await supabase
            .from('vehicle_bookings')
            .delete()
            .eq('email', targetBooking.email)
            .eq('start_time', targetBooking.start_time);
        }
      } else if (targetBooking?.email && targetBooking?.start_time) {
        await supabase
          .from('vehicle_bookings')
          .delete()
          .eq('email', targetBooking.email)
          .eq('start_time', targetBooking.start_time);
      }
    } catch (err) {
      console.warn('[Supabase Vehicle Booking Delete Error]:', err);
    }

    await fetchVehicleBookingsFromSupabase();

    setExportStatusBanner({
      title: 'Booking Kendaraan Dibatalkan',
      message: `${
        targetBooking?.vehicle ||
        targetBooking?.vehicleName ||
        targetBooking?.title ||
        'Jadwal kendaraan'
      } telah dihapus dari tabel vehicle_bookings dan unit kembali tersedia.`,
    });
  };

  const handleToggleChecklistItem = (
    dateStr: string,
    ownerStaffId: string,
    itemId: string
  ) => {
    setDailyChecklists((prev) =>
      toggleDailyChecklistItem(
        prev,
        dateStr,
        ownerStaffId,
        currentUser.staffId,
        itemId
      )
    );
  };

  const handleAddChecklistItem = (
    dateStr: string,
    ownerStaffId: string,
    text: string
  ) => {
    const nowLabel = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setDailyChecklists((prev) =>
      addDailyChecklistItem(
        prev,
        dateStr,
        ownerStaffId,
        currentUser.staffId,
        text,
        `${nowLabel} WIB`
      )
    );
  };

  const handleEditChecklistItem = (
    dateStr: string,
    ownerStaffId: string,
    itemId: string,
    newText: string
  ) => {
    setDailyChecklists((prev) =>
      editDailyChecklistItem(
        prev,
        dateStr,
        ownerStaffId,
        currentUser.staffId,
        itemId,
        newText
      )
    );
  };

  const handleDeleteChecklistItem = (
    dateStr: string,
    ownerStaffId: string,
    itemId: string
  ) => {
    setDailyChecklists((prev) =>
      deleteDailyChecklistItem(
        prev,
        dateStr,
        ownerStaffId,
        currentUser.staffId,
        itemId
      )
    );
  };

  const handleSyncLeaveToGoogleCalendar = async (leave: LeaveRecordItem) => {
    const res = await createGoogleCalendarEvent(
      `[Futari Cuti] ${leave.badgeLabel}`,
      leave.reason,
      leave.startDate
    );
    setExportStatusBanner({
      title: 'Google Calendar Leave Sync',
      message: res.message,
      cloudUrl: res.url,
    });
  };

  const handleDownloadPettyCashExcel = async () => {
    setIsExporting(true);
    try {
      const result = await exportPettyCashExcelWithImages(
        activeEventBudget,
        activeEventExpenses,
        isGoogleConnected
      );
      setExportStatusBanner({
        title: result.title,
        message: result.summaryMessage,
        cloudUrl: result.cloudUrl,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // SOP Management Handlers (Executive & Digital RBAC)
  const handleAddCompanySop = (input: {
    title: string;
    content: string;
    date: string;
    category?: string;
  }) => {
    setSops((prev) => addCompanySop(prev, currentUser, input));
    setExportStatusBanner({
      title: `SOP Baru Ditambahkan — ${input.title}`,
      message: `Dokumen SOP "${input.title}" (${input.date}) berhasil dipublikasikan oleh ${currentUser.name}.`,
    });
  };

  const handleUpdateCompanySop = (
    sopId: string,
    updates: {
      title: string;
      content: string;
      date: string;
      category?: string;
    }
  ) => {
    setSops((prev) => updateCompanySop(prev, currentUser, sopId, updates));
  };

  const handleDeleteCompanySop = (sopId: string) => {
    setSops((prev) => deleteCompanySop(prev, currentUser, sopId));
  };

  // Fleet Management Handlers (Full CRUD for all logged-in users synced to Supabase `vehicles`)
  const handleAddFleetVehicle = async (input: {
    model: string;
    licensePlate: string;
    status: FleetVehicleStatus;
    branch?: 'JKT' | 'Bandung';
    notes?: string;
  }) => {
    // 1. Optimistic local update
    const tempId = `veh_${Date.now()}`;
    const newVehItem: FleetVehicleItem = {
      id: tempId,
      model: input.model.trim(),
      licensePlate: input.licensePlate.trim().toUpperCase(),
      status: input.status,
      branch: input.branch || 'JKT',
      notes: input.notes?.trim() || 'Unit operasional Futari',
    };
    setFleetVehicles((prev) => [newVehItem, ...prev]);

    // 2. Persist to Supabase `vehicles` table (name, plate_number, status)
    try {
      await supabase.from('vehicles').insert([
        {
          name: input.model.trim(),
          plate_number: input.licensePlate.trim().toUpperCase(),
          status: input.status || 'Tersedia',
        },
      ]);
      await fetchVehiclesFromSupabase();
    } catch {
      // Keep optimistic update
    }

    setExportStatusBanner({
      title: `Armada Baru Ditambahkan — ${input.model} ${input.licensePlate}`,
      message: `Unit "${input.model} ${input.licensePlate}" berhasil disimpan ke tabel vehicles dan siap dibooking.`,
    });
  };

  const handleUpdateFleetVehicle = async (
    vehicleId: string,
    updates: {
      model?: string;
      licensePlate?: string;
      status?: FleetVehicleStatus;
      branch?: 'JKT' | 'Bandung';
      notes?: string;
    }
  ) => {
    // 1. Optimistic local update
    setFleetVehicles((prev) =>
      prev.map((v) =>
        v.id === vehicleId
          ? {
              ...v,
              model: updates.model !== undefined ? updates.model.trim() || v.model : v.model,
              licensePlate:
                updates.licensePlate !== undefined
                  ? updates.licensePlate.trim().toUpperCase() || v.licensePlate
                  : v.licensePlate,
              status: updates.status || v.status,
              branch: updates.branch || v.branch,
              notes: updates.notes !== undefined ? updates.notes : v.notes,
            }
          : v
      )
    );

    // 2. Persist to Supabase `vehicles` table
    try {
      const dbPayload: Record<string, any> = {};
      if (updates.model) dbPayload.name = updates.model.trim();
      if (updates.licensePlate) dbPayload.plate_number = updates.licensePlate.trim().toUpperCase();
      if (updates.status) dbPayload.status = updates.status;

      if (Object.keys(dbPayload).length > 0) {
        await supabase.from('vehicles').update(dbPayload).eq('id', vehicleId);
        await fetchVehiclesFromSupabase();
      }
    } catch {
      // Keep optimistic update
    }
  };

  const handleDeleteFleetVehicle = async (vehicleId: string) => {
    // 1. Optimistic local update
    setFleetVehicles((prev) => prev.filter((v) => v.id !== vehicleId));

    // 2. Persist to Supabase `vehicles` table
    try {
      await supabase.from('vehicles').delete().eq('id', vehicleId);
      await fetchVehiclesFromSupabase();
    } catch {
      // Keep optimistic delete
    }
  };

  // Task & Pekerjaan Handlers (Synced with Calendar on Deadline Date & Supabase tasks table)
  const handleAddWorkTask = async (input: {
    title?: string;
    assigned_to?: string;
    description?: string;
    due_date?: string;
    taskName?: string;
    assigneeId?: string;
    startDate?: string;
    deadlineDate?: string;
    notes?: string;
  }) => {
    const cleanTitle = (input.title || input.taskName || '').trim();
    if (!cleanTitle) return;

    // Resolve assigned user's email
    let assignedEmail = (input.assigned_to || '').trim().toLowerCase();
    if (!assignedEmail && input.assigneeId) {
      const assignee =
        staffList.find(
          (s) =>
            s.staffId === input.assigneeId ||
            s.email.toLowerCase() === input.assigneeId!.toLowerCase()
        ) || currentUser;
      assignedEmail = (assignee.email || input.assigneeId).trim().toLowerCase();
    }
    if (!assignedEmail) {
      assignedEmail = (currentUser.email || '').trim().toLowerCase();
    }

    const rawDue = input.due_date || input.deadlineDate || toLocalDateKey(new Date());
    const dueIso = dueDateInputToIso(rawDue);
    const desc = input.description !== undefined ? input.description : (input.notes || '');

    try {
      const { data: inserted, error } = await supabase
        .from('tasks')
        .insert([
          {
            assigned_to: assignedEmail,
            title: cleanTitle,
            description: desc,
            status: 'Pending',
            due_date: dueIso,
            is_completed: false,
          },
        ])
        .select('*')
        .single();

      if (!error && inserted) {
        const mapped = mapSupabaseTaskRowToWorkTask(inserted as SupabaseTaskRow, staffList);
        setTasks((prev) => [mapped, ...prev]);
      } else {
        await fetchTasksFromSupabase();
      }
    } catch {
      await fetchTasksFromSupabase();
    }

    setExportStatusBanner({
      title: `Pekerjaan Berhasil Dibuat & Disinkronkan ke Kalender`,
      message: `Pekerjaan "${cleanTitle}" untuk ${assignedEmail} otomatis tampil di Kalender pada tanggal Tenggat ${rawDue}.`,
    });
  };

  const handleToggleWorkTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const nextCompleted = !task.completed;
    const realTimeIso = new Date().toISOString();
    const nowTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Optimistically update local state
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: nextCompleted,
              is_completed: nextCompleted,
              completed_at: nextCompleted ? realTimeIso : null,
              status: nextCompleted ? 'Done' : 'Pending',
              updatedAt: `${nowTime} WIB`,
            }
          : t
      )
    );

    // Sync to Supabase `tasks` table
    try {
      await supabase
        .from('tasks')
        .update({
          is_completed: nextCompleted,
          completed_at: nextCompleted ? realTimeIso : null,
          status: nextCompleted ? 'Done' : 'Pending',
        })
        .eq('id', taskId);
    } catch (err) {
      console.warn('[Supabase tasks update error]:', err);
    }
  };

  const handleUpdateWorkTask = async (
    taskId: string,
    updates: {
      title?: string;
      assigned_to?: string;
      description?: string;
      due_date?: string;
      taskName?: string;
      assigneeId?: string;
      startDate?: string;
      deadlineDate?: string;
      notes?: string;
    }
  ) => {
    const nowTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const cleanTitle = updates.title || updates.taskName;
    const cleanDesc = updates.description !== undefined ? updates.description : updates.notes;
    const cleanDue = updates.due_date || updates.deadlineDate;
    const cleanAssigned = updates.assigned_to || updates.assigneeId;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          title: cleanTitle ? cleanTitle.trim() : t.title,
          taskName: cleanTitle ? cleanTitle.trim() : t.taskName,
          description: cleanDesc !== undefined ? cleanDesc : t.description,
          notes: cleanDesc !== undefined ? cleanDesc : t.notes,
          deadlineDate: cleanDue || t.deadlineDate,
          due_date: cleanDue ? dueDateInputToIso(cleanDue) : t.due_date,
          assigned_to: cleanAssigned || t.assigned_to,
          updatedAt: `${nowTime} WIB`,
        };
      })
    );

    try {
      const dbUpdates: Record<string, any> = {};
      if (cleanTitle) dbUpdates.title = cleanTitle.trim();
      if (cleanDesc !== undefined) dbUpdates.description = cleanDesc;
      if (cleanDue) dbUpdates.due_date = dueDateInputToIso(cleanDue);
      if (cleanAssigned) {
        const found = staffList.find(
          (s) => s.staffId === cleanAssigned || s.email.toLowerCase() === cleanAssigned.toLowerCase()
        );
        dbUpdates.assigned_to = (found?.email || cleanAssigned).trim().toLowerCase();
      }

      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('tasks').update(dbUpdates).eq('id', taskId);
        await fetchTasksFromSupabase();
      }
    } catch (err) {
      console.warn('[Supabase tasks update error]:', err);
    }
  };

  const liveOvertimePreview = useMemo(
    () => calculateOvertime(checkOutInputTime),
    [checkOutInputTime]
  );
  const liveLatePreview = useMemo(
    () => calculateLateMinutes(checkInInputTime),
    [checkInInputTime]
  );

  // Automated 3D Virtual Office Presence: tied strictly to the Supabase `attendance` table
  // ONLY renders a 3D avatar if the user has a `check_in_time` AND `clock_out_time` is NULL for today.
  const effectiveOfficeStaffList = useMemo<StaffMemberRecord[]>(() => {
    const baseList =
      staffList.length > 0
        ? staffList
        : currentUserProfile
        ? [currentUserProfile]
        : [];
    return applyActiveAttendanceToStaffList(baseList, activeAttendanceByEmail);
  }, [staffList, currentUserProfile, activeAttendanceByEmail]);

  const wfoStaffList = useMemo(
    () => filterActiveWfoPersonnel(effectiveOfficeStaffList),
    [effectiveOfficeStaffList]
  );

  const virtualOfficeRooms = useMemo(
    () => groupActiveWfoByRoom(effectiveOfficeStaffList),
    [effectiveOfficeStaffList]
  );

  const themeBg = isDark
    ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100'
    : 'bg-gradient-to-br from-sky-50 via-slate-100 to-cyan-50/70 text-slate-900';
  const surfaceCard = getGlassSurfaceClasses(isDark);
  const mutedText = isDark ? 'text-slate-300' : 'text-slate-600';
  const splashConfig = buildSplashWelcomeConfig(currentUser);

  const customScrollbarStyles = `
    * {
      scrollbar-width: thin;
      scrollbar-color: #00B4D8 rgba(15, 23, 42, 0.14);
    }
    ::-webkit-scrollbar {
      width: 7px;
      height: 7px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.12);
      border-radius: 9999px;
    }
    ::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #00B4D8 0%, #0277BD 100%);
      border-radius: 9999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #00B4D8;
    }
  `;

  // ---------------------------------------------------------------------------
  // LOGIN SCREEN (SUPABASE AUTH EMAIL/PASSWORD FORM ONLY)
  // ---------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex flex-col justify-between ${themeBg}`}>
        <style data-testid="futari-custom-scrollbar-style">{customScrollbarStyles}</style>
        {/* Top Bar on Login — STRICT SINGLE LOGO PER THEME */}
        <header
          className={`flex items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b backdrop-blur-md ${
            isDark
              ? 'border-slate-700/50 bg-slate-900/60 shadow-2xl'
              : 'border-white/40 bg-white/70 shadow-lg'
          }`}
        >
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="logoFUTARI-1_5.png"
              alt="Futari"
              className="h-8 object-contain"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label="Toggle Dark or Light Theme"
              className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[#00B4D8]" />
              ) : (
                <Moon className="w-4 h-4 text-[#0277BD]" />
              )}
              <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>
        </header>

        {/* Centered Login Container — Strictly Email/Password Form Only */}
        <main className="flex-1 w-full mx-auto px-4 sm:px-6 py-8 flex items-center justify-center">
          <div
            className={`w-full max-w-md p-6 sm:p-8 rounded-2xl border ${surfaceCard}`}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0277BD] to-[#00B4D8] flex items-center justify-center text-white shadow-sm shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight font-display">
                  Login Futari Portal
                </h1>
                <p className={`text-xs ${mutedText}`}>
                  Supabase Authentication &amp; Role-Based Operations
                </p>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email-input"
                  className="block text-xs font-medium mb-1.5"
                >
                  Email Karyawan Futari
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#00B4D8] absolute left-3 top-2.5" />
                  <input
                    id="login-email-input"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginError('');
                      setLoginEmail(e.target.value);
                    }}
                    placeholder="nama@futari.co.id"
                    className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password-input"
                  className="block text-xs font-medium mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#00B4D8] absolute left-3 top-2.5" />
                  <input
                    id="login-password-input"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginError('');
                      setLoginPassword(e.target.value);
                    }}
                    placeholder="••••••••"
                    className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {loginError && (
                <p
                  data-testid="login-error-alert"
                  className="text-xs text-rose-400 font-medium"
                >
                  {loginError}
                </p>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isAuthSubmitting}
                  data-testid="supabase-login-btn"
                  className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {isAuthSubmitting ? 'Memproses...' : 'Masuk (Login)'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATED PORTAL SHELL (DESKTOP LEFT SIDEBAR + MOBILE BOTTOM NAV + SPLASH)
  // ---------------------------------------------------------------------------
  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${themeBg}`}>
      <style data-testid="futari-custom-scrollbar-style">{customScrollbarStyles}</style>

      {/* Full-Screen Splash Screen & Welcome Animation (2.2s duration on Login) */}
      <AnimatePresence>
        {isSplashing && (
          <motion.div
            key="futari-welcome-splash"
            data-testid="futari-splash-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 backdrop-blur-xl ${
              isDark
                ? 'bg-slate-950/90 text-slate-100'
                : 'bg-white/85 text-slate-900'
            }`}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className={`max-w-md w-full p-8 sm:p-10 rounded-3xl flex flex-col items-center text-center space-y-6 ${surfaceCard}`}
            >
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                  filter: [
                    'drop-shadow(0 0 8px rgba(0,180,216,0.35))',
                    'drop-shadow(0 0 22px rgba(0,180,216,0.75))',
                    'drop-shadow(0 0 8px rgba(0,180,216,0.35))',
                  ],
                }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="p-4 rounded-2xl bg-[#00B4D8]/10 border border-[#00B4D8]/30"
              >
                <img
                  src="logoFUTARI-1_5.png"
                  alt="Futari Logo"
                  data-testid="splash-logo"
                  className="h-14 sm:h-16 object-contain"
                />
              </motion.div>

              <div className="space-y-2">
                <p className="text-[11px] font-mono uppercase tracking-widest text-[#00B4D8] font-bold">
                  FUTARI ENTERPRISE OPERATIONS PORTAL
                </p>
                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.35 }}
                  data-testid="splash-greeting-text"
                  className="text-xl sm:text-2xl font-bold font-display tracking-tight"
                >
                  {splashConfig.greetingText}
                </motion.h1>
                <p className={`text-xs ${mutedText}`}>
                  {currentUser.role} · {currentUser.divisionLabel} ({currentUser.branch})
                </p>
              </div>

              <div className="w-48 h-1.5 rounded-full overflow-hidden bg-slate-700/30">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.0, ease: 'easeInOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-[#0277BD] to-[#00B4D8]"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Fixed Left Sidebar Navigation (Glassmorphism) */}
      <aside
        aria-label="Desktop Sidebar Navigation"
        data-testid="desktop-glass-sidebar"
        className={`no-print hidden md:flex md:w-64 lg:w-72 md:flex-col md:fixed md:inset-y-0 z-30 ${
          isDark
            ? 'bg-slate-900/60 backdrop-blur-md border-r border-slate-700/50 shadow-2xl text-slate-100'
            : 'bg-white/70 backdrop-blur-md border-r border-white/40 shadow-lg text-slate-900'
        }`}
      >
        {/* Sidebar Title Header (Single Logo lives in Top Header) */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between ${
            isDark ? 'border-slate-700/50' : 'border-white/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0277BD] to-[#00B4D8] flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-wide font-display">
                FUTARI PORTAL
              </p>
              <p className="text-[10px] text-[#00B4D8] font-mono">
                JKT HQ &amp; BDG HUB
              </p>
            </div>
          </div>
        </div>

        {/* Authenticated User Session Summary */}
        <div
          className={`p-4 border-b flex items-center gap-3 ${
            isDark
              ? 'border-slate-800 bg-slate-950/40'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          {currentUser.avatar_url || currentUser.photoUrl ? (
            <img
              src={currentUser.avatar_url || currentUser.photoUrl}
              alt={currentUser.name}
              data-testid="sidebar-avatar-img"
              className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-[#00B4D8]/40 shadow-sm"
            />
          ) : (
            <div
              data-testid="sidebar-avatar-fallback"
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm ring-2 ring-[#00B4D8]/30"
              style={{ backgroundColor: currentUser.avatarColor || '#0277BD' }}
            >
              {currentUser.initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold truncate">
              {currentUser.name}
            </p>
            <p className={`text-[11px] truncate ${mutedText}`}>
              {currentUser.role} ({currentUser.branch})
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* 1. Dashboard */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'home'
                ? 'bg-gradient-to-r from-[#0277BD] to-[#00B4D8] text-white shadow-sm'
                : isDark
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          {/* 2. Absensi */}
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-gradient-to-r from-[#0277BD] to-[#00B4D8] text-white shadow-sm'
                : isDark
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>Absensi</span>
          </button>

          {/* 3. Team Management */}
          <button
            type="button"
            data-testid="nav-team-attendance-btn"
            onClick={() => setActiveTab('team_attendance')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'team_attendance'
                ? 'bg-gradient-to-r from-[#0277BD] to-[#00B4D8] text-white shadow-sm'
                : isDark
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Team Management</span>
          </button>

          {/* 4. Petty Cash */}
          <button
            type="button"
            data-testid="nav-pettycash-btn"
            onClick={() => setActiveTab('pettycash')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'pettycash'
                ? 'bg-gradient-to-r from-[#0277BD] to-[#00B4D8] text-white shadow-sm'
                : isDark
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span>Petty Cash</span>
          </button>

          {/* 5. Booking Kendaraan */}
          <button
            type="button"
            data-testid="nav-fleet-btn"
            onClick={() => setActiveTab('fleet')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'fleet'
                ? 'bg-gradient-to-r from-[#0277BD] to-[#00B4D8] text-white shadow-sm'
                : isDark
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Car className="w-4 h-4 shrink-0" />
            <span>Booking Kendaraan</span>
          </button>

          {/* 6. Jobdesk */}
          <button
            type="button"
            data-testid="nav-tasks-btn"
            onClick={() => setActiveTab('tasks')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'tasks'
                ? 'bg-gradient-to-r from-[#0277BD] to-[#00B4D8] text-white shadow-sm'
                : isDark
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-4 h-4 shrink-0" />
            <span>Jobdesk</span>
          </button>

          {/* 7. Chat */}
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-[#0277BD] to-[#00B4D8] text-white shadow-sm'
                : isDark
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>Chat</span>
          </button>

          {/* 8. Calendar */}
          <button
            type="button"
            data-testid="nav-leave-calendar-btn"
            onClick={() => setActiveTab('leave')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'leave'
                ? 'bg-gradient-to-r from-[#0277BD] to-[#00B4D8] text-white shadow-sm'
                : isDark
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-4 h-4 shrink-0" />
            <span>Calendar</span>
          </button>

          {/* 9. SOP Perusahaan */}
          <button
            type="button"
            data-testid="nav-sop-btn"
            onClick={() => setActiveTab('sop')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'sop'
                ? 'bg-gradient-to-r from-[#0277BD] to-[#00B4D8] text-white shadow-sm'
                : isDark
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>SOP Perusahaan</span>
          </button>

          {/* 10. User Profile */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-[#0277BD] to-[#00B4D8] text-white shadow-sm'
                : isDark
                ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <UserIcon className="w-4 h-4 shrink-0" />
            <span>User Profile</span>
          </button>

          {/* 11. User Management (Dev-only) */}
          {isDeveloperUser && (
            <button
              type="button"
              data-testid="nav-user-management-btn"
              onClick={() => setActiveTab('user_management')}
              className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-colors whitespace-nowrap border ${
                activeTab === 'user_management'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 shrink-0" />
                <span>User Management</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] uppercase bg-slate-950 text-amber-400 border border-amber-500/40">
                DEV
              </span>
            </button>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div
          className={`p-4 border-t space-y-2 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              supabase.auth.signOut().catch(() => {});
              setCurrentUserProfile(null);
              setUserRole('Unassigned');
              setUserDivision('Design_Talent_Production');
              setIsAuthenticated(false);
            }}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              isDark
                ? 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sesi (Logout)</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 md:pl-64 lg:pl-72 flex flex-col min-h-screen pb-8 min-w-0">
        {/* Top Bar Contract — STRICT SINGLE LOGO PER THEME + GLASSMORPHISM */}
        <header
          data-testid="top-glass-navbar"
          className={`no-print sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 px-4 md:px-8 py-3 border-b ${
            isDark
              ? 'bg-slate-900/60 backdrop-blur-md border-slate-700/50 shadow-2xl'
              : 'bg-white/70 backdrop-blur-md border-white/40 shadow-lg'
          }`}
        >
          {/* Zone 1: Sleek Mobile Hamburger Menu Button + Single Unconditional Futari Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              data-testid="mobile-hamburger-menu-btn"
              aria-label="Open Mobile Navigation Drawer"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className={`md:hidden p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? 'border-slate-700/60 bg-slate-900/70 text-[#00B4D8] hover:bg-slate-800'
                  : 'border-slate-300/70 bg-white/80 text-[#0277BD] hover:bg-slate-100'
              }`}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <img
              src="logoFUTARI-1_5.png"
              alt="Futari"
              data-testid="header-logo"
              className="h-7 sm:h-8 object-contain"
            />
          </div>

          {/* Zone 2: User Name & Avatar Display */}
          <div className="flex items-center gap-2.5 min-w-0">
            {currentUser.avatar_url || currentUser.photoUrl ? (
              <img
                src={currentUser.avatar_url || currentUser.photoUrl}
                alt={currentUser.name}
                data-testid="header-avatar-img"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 ring-2 ring-[#00B4D8]/40 shadow-sm"
              />
            ) : (
              <div
                data-testid="header-avatar-fallback"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold text-white shrink-0 shadow-sm ring-2 ring-[#00B4D8]/30"
                style={{ backgroundColor: currentUser.avatarColor || '#0277BD' }}
              >
                {currentUser.initials}
              </div>
            )}
            <span className="text-xs sm:text-sm font-semibold text-[#00B4D8] truncate max-w-[180px] sm:max-w-[260px]">
              {currentUser.name}
            </span>
          </div>

          {/* Zone 3: Theme Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label="Toggle Dark or Light Mode"
              data-testid="theme-toggle-button"
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isDark
                  ? 'border-slate-700 bg-slate-900/80 text-[#00B4D8] hover:bg-slate-800'
                  : 'border-slate-300 bg-white/80 text-[#0277BD] hover:bg-slate-100'
              }`}
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          </div>
        </header>

        {/* Mobile Left Slide-In Navigation Drawer + Darkened Clickable Backdrop Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <div
              key="mobile-left-drawer-portal"
              className="no-print md:hidden fixed inset-0 z-50 flex"
            >
              {/* Darkened, clickable backdrop overlay behind the open drawer */}
              <motion.div
                key="mobile-drawer-backdrop"
                data-testid="mobile-drawer-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
                aria-label="Close Mobile Navigation Drawer Backdrop"
              />

              {/* Left Slide-In Navigation Drawer */}
              <motion.aside
                key="mobile-left-drawer"
                data-testid="mobile-left-drawer"
                aria-label="Mobile Left Navigation Drawer"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.28, ease: 'easeOut' }}
                className={`relative z-10 w-72 max-w-[82vw] h-full flex flex-col justify-between p-4 overflow-y-auto border-r ${
                  isDark
                    ? 'bg-slate-900/90 backdrop-blur-md border-slate-700/50 shadow-2xl text-slate-100'
                    : 'bg-white/90 backdrop-blur-md border-white/40 shadow-2xl text-slate-900'
                }`}
              >
                <div className="space-y-4">
                  {/* Drawer Header with Logo & Close Button */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/30">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src="logoFUTARI-1_5.png"
                        alt="Futari"
                        className="h-7 object-contain shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold font-display truncate">
                          FUTARI PORTAL
                        </p>
                        <p className="text-[10px] font-mono text-[#00B4D8] truncate">
                          {currentUser.name}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid="close-mobile-drawer-btn"
                      onClick={() => setIsMobileMenuOpen(false)}
                      aria-label="Tutup Menu Navigasi"
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isDark
                          ? 'border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                          : 'border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Active Role Info Card inside Drawer */}
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-3 ${
                      isDark
                        ? 'bg-slate-950/70 border-slate-800'
                        : 'bg-slate-50/90 border-slate-200'
                    }`}
                  >
                    {currentUser.avatar_url || currentUser.photoUrl ? (
                      <img
                        src={currentUser.avatar_url || currentUser.photoUrl}
                        alt={currentUser.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-[#00B4D8]/40 shadow-sm"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm ring-2 ring-[#00B4D8]/30"
                        style={{ backgroundColor: currentUser.avatarColor || '#0277BD' }}
                      >
                        {currentUser.initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-[#00B4D8] font-medium truncate">
                        {currentUser.role} ({currentUser.branch})
                      </p>
                    </div>
                  </div>

                  {/* Vertical Navigation Links inside Left Drawer */}
                  <nav className="space-y-1">
                    {(
                      [
                        { id: 'home' as NavTab, label: 'Dashboard', icon: Building2 },
                        { id: 'attendance' as NavTab, label: 'Absensi', icon: Clock },
                        { id: 'team_attendance' as NavTab, label: 'Team Management', icon: Users },
                        { id: 'pettycash' as NavTab, label: 'Petty Cash', icon: Wallet },
                        { id: 'fleet' as NavTab, label: 'Booking Kendaraan', icon: Car },
                        { id: 'tasks' as NavTab, label: 'Jobdesk', icon: CheckSquare },
                        { id: 'chat' as NavTab, label: 'Chat', icon: MessageSquare },
                        { id: 'leave' as NavTab, label: 'Calendar', icon: CalendarIcon },
                        { id: 'sop' as NavTab, label: 'SOP Perusahaan', icon: FileText },
                        { id: 'profile' as NavTab, label: 'User Profile', icon: UserIcon },
                      ]
                    ).map((item) => {
                      const IconComp = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-testid={`mobile-drawer-link-${item.id}`}
                          onClick={() => {
                            setActiveTab(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer ${
                            activeTab === item.id
                              ? 'bg-gradient-to-r from-[#0277BD] to-[#00B4D8] text-white shadow-md'
                              : isDark
                              ? 'text-slate-200 hover:bg-slate-800/70'
                              : 'text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <IconComp className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}

                    {isDeveloperUser && (
                      <button
                        type="button"
                        data-testid="mobile-drawer-link-user_management"
                        onClick={() => {
                          setActiveTab('user_management');
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border border-amber-500/40 bg-amber-500/15 text-amber-400 mt-2 cursor-pointer"
                      >
                        <Shield className="w-4 h-4 shrink-0" />
                        <span className="truncate">Developer User Management</span>
                      </button>
                    )}
                  </nav>
                </div>

                {/* Drawer Footer: Logout Button */}
                <div className="pt-4 mt-4 border-t border-slate-700/30">
                  <button
                    type="button"
                    onClick={() => {
                      supabase.auth.signOut().catch(() => {});
                      setCurrentUserProfile(null);
                      setUserRole('Unassigned');
                      setUserDivision('Design_Talent_Production');
                      setIsMobileMenuOpen(false);
                      setIsAuthenticated(false);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold border border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar Sesi (Logout)</span>
                  </button>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Modern Floating Toast Notification Container (High Z-Index, Smooth Slide-In, Zero Layout Shift) */}
        <div
          aria-live="polite"
          data-testid="floating-toast-container"
          className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
        >
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                role="status"
                data-testid={`floating-toast-${toast.id}`}
                className="pointer-events-auto p-4 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/20 bg-slate-900/90 text-white flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {toast.type === 'error' ? (
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                    ) : toast.type === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-[#00B4D8]" />
                    )}
                  </div>
                  <div className="min-w-0 break-words text-xs">
                    <p className="font-bold text-[#00B4D8] text-sm leading-tight">
                      {toast.title}
                    </p>
                    <p className="text-slate-300 mt-1 leading-relaxed">
                      {toast.message}
                    </p>
                    {toast.cloudUrl && (
                      <a
                        href={toast.cloudUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 font-semibold text-[#00B4D8] hover:underline"
                      >
                        <span>Buka Dokumen Google</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss Notification"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Main Viewport Content wrapped with Fluid Page Transitions (AnimatePresence + motion.div) and Responsive Padding (p-4 md:p-6) */}
        <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 md:p-6 lg:px-8 pb-12 space-y-6 min-w-0 text-sm md:text-base">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              data-testid={`tab-transition-${activeTab}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-6"
            >
          {/* =================================================================
              TAB 1: EXECUTIVE LIVE ATTENDANCE DASHBOARD & VIRTUAL OFFICE
             ================================================================= */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Executive Header & Key Metrics Strip */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#00B4D8]">
                    {isExecutiveUser
                      ? 'EXECUTIVE COMMAND CENTER · LIVE ATTENDANCE DASHBOARD'
                      : `FUTARI OPERATIONS PORTAL · ${currentUser.divisionLabel.toUpperCase()}`}
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-display mt-0.5">
                    {isExecutiveUser
                      ? `Live Attendance Dashboard — ${currentUser.name}`
                      : `Selamat Datang, ${currentUser.name} (${currentUser.role})`}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('attendance')}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Photo Check-In (WFO / WFE)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pettycash')}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold border whitespace-nowrap ${
                      isDark
                        ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                        : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    Kelola Petty Cash Event
                  </button>
                </div>
              </div>

              {/* 4-Column KPI Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-5 rounded-xl border ${surfaceCard}`}>
                  <p className={`text-xs ${mutedText}`}>
                    Active WFO (Virtual Office)
                  </p>
                  <p className="text-2xl font-bold font-mono tabular-nums mt-1 text-[#00B4D8]">
                    {wfoStaffList.length} / {staffList.length}
                  </p>
                  <p className={`text-[11px] mt-1 ${mutedText}`}>
                    Jakarta HQ &amp; Bandung Creative Hub
                  </p>
                </div>

                <div className={`p-5 rounded-xl border ${surfaceCard}`}>
                  <p className={`text-xs ${mutedText}`}>
                    Siklus Payroll Aktif (26–25)
                  </p>
                  <p className="text-base font-bold font-mono tabular-nums mt-2">
                    {payrollCycle.label}
                  </p>
                  <p className={`text-[11px] mt-1 ${mutedText}`}>
                    Jam Masuk 10:00 · Toleransi 10:05
                  </p>
                </div>

                <div className={`p-5 rounded-xl border ${surfaceCard}`}>
                  <p className={`text-xs ${mutedText}`}>
                    Total Accumulated Late Minutes
                  </p>
                  <p className="text-2xl font-bold font-mono tabular-nums mt-1 text-amber-500">
                    {isExecutiveUser
                      ? companyTotalLateMinutes
                      : userMonthlyLateMinutes}{' '}
                    Min
                  </p>
                  <p className={`text-[11px] mt-1 ${mutedText}`}>
                    {isExecutiveUser
                      ? `Akumulasi ${staffList.length} Personel Bulan Ini`
                      : `Rekap Privasi ${currentUser.name} Bulan Ini`}
                  </p>
                </div>

                <div className={`p-5 rounded-xl border ${surfaceCard}`}>
                  <p className={`text-xs ${mutedText}`}>
                    Saldo Petty Cash ({activeEventBudget.eventName.slice(0, 18)}…)
                  </p>
                  <p className="text-xl font-bold font-mono tabular-nums mt-1 text-emerald-500">
                    {formatIDR(pettyCashSummary.remainingBalance)}
                  </p>
                  <p className={`text-[11px] mt-1 ${mutedText}`}>
                    Dari Dana Approval {formatIDR(activeEventBudget.approvedBudget)}
                  </p>
                </div>
              </div>

              {/* Three.js 3D Executive Virtual Office Viewport */}
              <VirtualOffice3D
                staffList={effectiveOfficeStaffList}
                currentUserId={currentUser.staffId}
                selectedStaffId={selectedOfficeStaffId}
                onSelectStaff={(staffId) => setSelectedOfficeStaffId(staffId)}
                newlyAddedStaffId={newlyAddedStaffId}
                walkInStaffId={walkInStaffId}
                walkOutStaffId={walkOutStaffId}
                onWalkOutComplete={() => setWalkOutStaffId(null)}
                onActiveAttendanceChange={setActiveAttendanceByEmail}
                isDark={isDark}
              />

              {/* Executive Virtual Office Visual Room Grouping & Strict WFO-Only Avatar Grid */}
              <section
                aria-labelledby="virtual-office-grid-heading"
                data-testid="virtual-office-rooms-section"
                className={`p-6 rounded-xl border ${surfaceCard}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-slate-700/30">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Strict Visibility: WFO Checked-In Only ({wfoStaffList.length} Active)
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-[#00B4D8]/15 text-[#00B4D8]">
                        9 Rooms / Zones Layout
                      </span>
                    </div>
                    <h2
                      id="virtual-office-grid-heading"
                      className="text-lg font-bold font-display mt-1.5"
                    >
                      Virtual Office — 9 Room Grouping &amp; Active WFO Avatar Grid
                    </h2>
                    <p className={`text-xs ${mutedText}`}>
                      Hanya menampilkan personel yang aktif Check-In dengan status{' '}
                      <strong className="text-emerald-400">WFO</strong>. Personel WFE atau Offline disembunyikan sepenuhnya dari 3D Office &amp; Room Grid.
                    </p>
                  </div>
                </div>

                {/* 9-Room Grid Layout using Tailwind CSS Grid & Flexbox */}
                <div
                  data-testid="virtual-office-9-rooms-grid"
                  className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                >
                  {virtualOfficeRooms.map((room) => (
                    <div
                      key={room.roomName}
                      data-testid={`virtual-room-card-${room.roomName}`}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
                        isDark
                          ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        {/* Room Header */}
                        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-700/30">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: room.accentColor }}
                              />
                              <h3 className="text-sm font-bold font-display leading-snug">
                                {room.roomName}
                              </h3>
                            </div>
                            <p className={`text-[11px] mt-0.5 ${mutedText}`}>
                              {room.subtitle}
                            </p>
                          </div>

                          <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                            {room.activeWfoMembers.length} WFO
                          </span>
                        </div>

                        {/* Active WFO Personnel Avatars inside this Room (Strictly WFO ONLY) */}
                        {room.activeWfoMembers.length > 0 ? (
                          <div className="mt-3.5 flex flex-col gap-2">
                            {room.activeWfoMembers.map((member) => (
                              <button
                                key={member.staffId}
                                type="button"
                                data-testid={`wfo-avatar-${member.staffId}`}
                                data-work-mode={member.workMode}
                                onClick={() =>
                                  setSelectedOfficeStaffId((prev) =>
                                    prev === member.staffId ? null : member.staffId
                                  )
                                }
                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-colors ${
                                  selectedOfficeStaffId === member.staffId
                                    ? 'border-[#00B4D8] bg-[#00B4D8]/15'
                                    : isDark
                                    ? 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="relative shrink-0">
                                    <div
                                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm border-2 border-[#00B4D8]"
                                      style={{ backgroundColor: member.avatarColor }}
                                    >
                                      {member.initials}
                                    </div>
                                    <span
                                      aria-hidden="true"
                                      className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950 absolute -bottom-0.5 -right-0.5 shadow-[0_0_6px_#10b981]"
                                    />
                                  </div>

                                  <div className="min-w-0">
                                    <p className="text-xs font-bold leading-tight">
                                      {member.name}
                                    </p>
                                    <p className={`text-[11px] leading-tight mt-0.5 ${mutedText}`}>
                                      {member.role} · {member.branch}
                                    </p>
                                  </div>
                                </div>

                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono tabular-nums text-emerald-400 bg-emerald-500/10 font-semibold shrink-0">
                                  WFO · {member.checkInTime}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3.5 py-5 px-3 rounded-lg border border-dashed border-slate-700/50 text-center">
                            <p className={`text-xs ${mutedText}`}>
                              Tidak ada personel WFO aktif di ruangan ini
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* =================================================================
              TAB 2: ATTENDANCE (STRICT GLOBAL vs TEAM RBAC, MANDATORY DAILY DESCRIPTION & STRUCTURED PDF)
             ================================================================= */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div
                className={`no-print p-4 md:p-6 rounded-2xl border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 ${surfaceCard}`}
              >
                <div className="min-w-0 space-y-1">
                  <h1 className="text-lg md:text-2xl font-bold font-display break-words">
                    Absensi
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Strict RBAC for Absensi Global Access:
                      ONLY visible if the currently logged-in user's role strictly matches dev, finance, or executive.
                      Hidden entirely for all other roles (like Digital, Creative, etc). */}
                  {canSeeGlobalAttendanceDropdown && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                      <label
                        htmlFor="exec-attendance-employee-select"
                        className="text-xs font-semibold text-[#00B4D8] whitespace-nowrap"
                      >
                        Pilih Karyawan (Global Access):
                      </label>
                      <select
                        id="exec-attendance-employee-select"
                        data-testid="exec-attendance-employee-select"
                        value={targetAttendanceEmployee.staffId}
                        onChange={(e) =>
                          setSelectedAttendanceTargetId(e.target.value)
                        }
                        className={`w-full sm:w-auto max-w-full sm:max-w-[260px] truncate px-3 py-2 rounded-xl text-xs font-semibold border ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        {staffList.map((s) => (
                          <option key={s.staffId} value={s.staffId}>
                            {s.name} ({s.role} · Divisi {s.division} - {s.branch})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* MBA ERLITA'S REQUEST: Two Distinct Export Buttons ("Download PDF" & "Download Excel") */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleDownloadAttendancePDF}
                    data-testid="download-attendance-pdf-btn"
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 flex items-center gap-2 whitespace-nowrap shrink-0 shadow-md"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleDownloadAttendanceExcel}
                    data-testid="download-attendance-excel-btn"
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 shadow-md"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Download Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsReportViewerOpen(true);
                      setTimeout(() => window.print(), 150);
                    }}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 whitespace-nowrap ${
                      isDark
                        ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                        : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <Printer className="w-4 h-4 text-[#00B4D8]" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* =================================================================
                  MBA ERLITA FINANCE EXPORT TOTALS STRIP:
                  1. Total Jam Kerja (Regular Working Hours)
                  2. Total Jam Lembur (Overtime Hours - strictly >= 20:00)
                 ================================================================= */}
              <div
                data-testid="finance-attendance-totals-strip"
                className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                <div className={`p-4 md:p-6 rounded-xl border min-w-0 ${surfaceCard}`}>
                  <p className={`text-xs break-words ${mutedText}`}>
                    1. Total Jam Kerja (Regular Working Hours)
                  </p>
                  <p
                    data-testid="recap-total-regular-hours"
                    className="text-xl md:text-2xl font-bold font-mono tabular-nums mt-1 text-[#00B4D8]"
                  >
                    {attendanceExportTotals.totalRegularHours} Jam
                  </p>
                  <p className={`text-[11px] mt-1 break-words ${mutedText}`}>
                    Akumulasi jam kerja reguler ({targetAttendanceEmployee.name})
                  </p>
                </div>

                <div className={`p-4 md:p-6 rounded-xl border min-w-0 ${surfaceCard}`}>
                  <p className={`text-xs break-words ${mutedText}`}>
                    2. Total Jam Lembur (Overtime Hours ≥ 20:00)
                  </p>
                  <p
                    data-testid="recap-total-overtime-hours"
                    className="text-xl md:text-2xl font-bold font-mono tabular-nums mt-1 text-emerald-500"
                  >
                    {attendanceExportTotals.totalOvertimeHours} Jam
                  </p>
                  <p className={`text-[11px] mt-1 break-words ${mutedText}`}>
                    Kompensasi: {formatIDR(attendanceExportTotals.totalOvertimePay)} (IDR 7.000/jam)
                  </p>
                </div>

                <div className={`p-4 md:p-6 rounded-xl border min-w-0 ${surfaceCard}`}>
                  <p className={`text-xs break-words ${mutedText}`}>
                    Akumulasi Keterlambatan ({targetAttendanceEmployee.name})
                  </p>
                  <p
                    data-testid="accumulated-late-minutes"
                    className="text-xl md:text-2xl font-bold font-mono tabular-nums mt-1 text-amber-500"
                  >
                    {userMonthlyLateMinutes} Menit
                  </p>
                  <p className={`text-[11px] mt-1 break-words ${mutedText}`}>
                    Standar Masuk 10:00 WIB · Toleransi 10:05 WIB
                  </p>
                </div>

                <div className={`p-4 md:p-6 rounded-xl border min-w-0 ${surfaceCard}`}>
                  <p className={`text-xs break-words ${mutedText}`}>
                    Lokasi Terverifikasi
                  </p>
                  <p
                    data-testid="verified-hq-location-text"
                    className="text-base font-bold font-display mt-1 text-[#00B4D8] break-words whitespace-normal"
                  >
                    {activeCurrentUserCheckIn?.mode === 'WFO'
                      ? 'WFO - HQ'
                      : activeCurrentUserCheckIn?.mode === 'WFE'
                      ? 'WFE - Event Venue'
                      : selectedWorkMode === 'WFO'
                      ? 'WFO - HQ'
                      : 'WFE - Event Venue'}
                  </p>
                  <p className="text-[11px] font-mono text-emerald-400 mt-1">
                    {attendanceExportTotals.totalHybridDays} Hari Transisi Hybrid (WFO↔WFE)
                  </p>
                </div>
              </div>

              {/* Check-In, Hybrid WFO<->WFE & Clock-Out Workbench */}
              <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Check-In HTML5 Camera/File Input + Hybrid WFO<->WFE & Clock-Out Controls */}
                <div
                  className={`lg:col-span-6 p-4 md:p-6 rounded-xl border space-y-5 min-w-0 ${surfaceCard}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold font-display">
                      Check-In Form
                    </h2>
                    <span
                      data-testid="attendance-active-mode-badge"
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold ${
                        activeCurrentUserCheckIn
                          ? activeCurrentUserCheckIn.isHybridTransition
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            : activeCurrentUserCheckIn.mode === 'WFO'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-[#00B4D8]/15 text-[#00B4D8]'
                          : 'bg-[#00B4D8]/15 text-[#00B4D8]'
                      }`}
                    >
                      {activeCurrentUserCheckIn
                        ? activeCurrentUserCheckIn.isHybridTransition
                          ? `HYBRID WFO↔WFE (${activeCurrentUserCheckIn.wfeTransitionTime})`
                          : `CHECKED-IN: ${activeCurrentUserCheckIn.mode}`
                        : `MODE: ${selectedWorkMode}`}
                    </span>
                  </div>

                  {/* Mode Selection: WFO (Office) or WFE (Event) — Locked after Check-In */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="block text-xs font-medium">
                        Pilih Mode Kehadiran:
                      </span>
                      {isCheckInLocked && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                          <Lock className="w-3 h-3" />
                          <span>Terkunci (Sudah Check-In)</span>
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        data-testid="select-mode-wfo-btn"
                        disabled={isCheckInLocked || isSubmittingCheckIn}
                        onClick={() => setSelectedWorkMode('WFO')}
                        className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                          selectedWorkMode === 'WFO'
                            ? 'bg-[#0277BD] text-white border-[#00B4D8]'
                            : isDark
                            ? 'bg-slate-950 border-slate-800 text-slate-300'
                            : 'bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                      >
                        WFO (Office)
                      </button>
                      <button
                        type="button"
                        data-testid="select-mode-wfe-btn"
                        disabled={isCheckInLocked || isSubmittingCheckIn}
                        onClick={() => setSelectedWorkMode('WFE')}
                        className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                          selectedWorkMode === 'WFE'
                            ? 'bg-[#0277BD] text-white border-[#00B4D8]'
                            : isDark
                            ? 'bg-slate-950 border-slate-800 text-slate-300'
                            : 'bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                      >
                        WFE (Event)
                      </button>
                    </div>
                  </div>

                  {/* Read-Only Real-Time System Timestamp Info (Clean Structured Horizontal Layout) */}
                  <div
                    data-testid="realtime-attendance-timestamp-box"
                    className={`p-3.5 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-3 ${
                      isDark
                        ? 'bg-slate-950/90 border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <span className={`block text-[11px] font-medium ${mutedText}`}>
                        Waktu Saat Ini
                      </span>
                      <span className="text-xs font-bold font-mono text-[#00B4D8] mt-0.5 block">
                        {liveClockHHMM} WIB
                      </span>
                    </div>
                    <div>
                      <span className={`block text-[11px] font-medium ${mutedText}`}>
                        Jam Check-In
                      </span>
                      <span className="text-xs font-bold font-mono text-emerald-400 mt-0.5 block">
                        {activeCurrentUserCheckIn?.checkInTime
                          ? `${activeCurrentUserCheckIn.checkInTime} WIB`
                          : '-'}
                      </span>
                    </div>
                    <div>
                      <span className={`block text-[11px] font-medium ${mutedText}`}>
                        Jam Clock-Out
                      </span>
                      <span className="text-xs font-bold font-mono text-rose-400 mt-0.5 block">
                        {activeCurrentUserCheckIn?.checkOutTime
                          ? `${activeCurrentUserCheckIn.checkOutTime} WIB`
                          : '-'}
                      </span>
                    </div>
                  </div>

                  {/* 1. FUNCTIONAL HTML5 CAMERA & FILE UPLOAD FOR ATTENDANCE CHECK-IN (SPLIT BUTTONS) */}
                  <div
                    className={`p-3.5 rounded-xl border ${
                      isDark
                        ? 'bg-slate-950/90 border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                    } space-y-2.5 ${isCheckInLocked ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#00B4D8] flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Foto Kehadiran</span>
                      </span>
                      {uploadedCheckInFileName && (
                        <span className="text-[10px] font-mono text-emerald-400 truncate max-w-[160px]">
                          {uploadedCheckInFileName}
                        </span>
                      )}
                    </div>

                    {/* Hidden Native File Inputs */}
                    <input
                      ref={checkInFileInputRef}
                      id="attendance-camera-file-input"
                      data-testid="attendance-camera-file-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={isCheckInLocked || isSubmittingCheckIn}
                      onChange={handleAttendanceFileInputChange}
                      className="hidden"
                    />
                    <input
                      ref={checkInUploadInputRef}
                      id="attendance-upload-file-input"
                      data-testid="attendance-upload-file-input"
                      type="file"
                      accept="image/*"
                      disabled={isCheckInLocked || isSubmittingCheckIn}
                      onChange={handleAttendanceFileInputChange}
                      className="hidden"
                    />

                    {/* Distinct Split Buttons: Ambil Foto & Upload Foto */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        data-testid="take-photo-btn"
                        disabled={isCheckInLocked || isSubmittingCheckIn}
                        onClick={() => checkInFileInputRef.current?.click()}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-white hover:border-[#00B4D8] hover:bg-slate-800'
                            : 'bg-white border-slate-300 text-slate-800 hover:border-[#00B4D8] hover:bg-slate-50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Camera className="w-3.5 h-3.5 text-[#00B4D8]" />
                        <span>Ambil Foto</span>
                      </button>

                      <button
                        type="button"
                        data-testid="upload-photo-btn"
                        disabled={isCheckInLocked || isSubmittingCheckIn}
                        onClick={() => checkInUploadInputRef.current?.click()}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-white hover:border-[#00B4D8] hover:bg-slate-800'
                            : 'bg-white border-slate-300 text-slate-800 hover:border-[#00B4D8] hover:bg-slate-50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-[#00B4D8]" />
                        <span>Upload Foto</span>
                      </button>
                    </div>
                  </div>

                  {/* Error State Banner */}
                  {checkInError && (
                    <div
                      data-testid="checkin-error-banner"
                      className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 flex items-start gap-2.5 text-xs text-rose-300"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{checkInError}</span>
                    </div>
                  )}

                  {/* Success UI State Banner & Locked Form Indicator */}
                  {checkInSuccessData && (
                    <div
                      data-testid="checkin-success-banner"
                      className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>
                            Check-In {checkInSuccessData.mode} Berhasil Tercatat di Supabase
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                          <Lock className="w-3 h-3" />
                          <span>Form Terkunci</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Kehadiran <strong>{checkInSuccessData.email}</strong> ({checkInSuccessData.mode}) pada pukul{' '}
                        <strong className="font-mono text-emerald-300">
                          {checkInSuccessData.checkInTimeWib} WIB
                        </strong>{' '}
                        telah tersimpan. Form Check-In telah dikunci untuk mencegah absensi ganda (double-punching).
                      </p>
                    </div>
                  )}

                  {/* ===========================================================
                      3. HYBRID ATTENDANCE SYSTEM (WFO <-> WFE) & CHECK-IN ACTION BUTTONS
                     =========================================================== */}
                  {isCurrentUserCheckedInWfo ? (
                    <div
                      data-testid="hybrid-wfo-actions-container"
                      className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400">
                          Status Aktif: Checked-In WFO ({activeCurrentUserCheckIn?.checkInTime} WIB)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                          Hybrid Mode Ready
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Anda tercatat hadir <strong>WFO (Office)</strong>. Pilih{' '}
                        <strong>Transisi Lokasi (Pindah WFE)</strong> untuk mencatat waktu perpindahan ke lokasi event, atau pilih{' '}
                        <strong>Clock-Out (Pulang)</strong>.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          data-testid="transition-wfo-to-wfe-btn"
                          onClick={handleTransitionWfoToWfe}
                          className="py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-500 hover:opacity-95 flex items-center justify-center gap-2 shadow-md"
                        >
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span>Transisi Lokasi (Pindah WFE)</span>
                        </button>

                        <button
                          type="button"
                          data-testid="clock-out-btn"
                          onClick={handleEvaluateClockOutRule}
                          className="py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-95 flex items-center justify-center gap-2 shadow-md"
                        >
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>Clock-Out (Pulang)</span>
                        </button>
                      </div>
                    </div>
                  ) : activeCurrentUserCheckIn &&
                    activeCurrentUserCheckIn.mode === 'WFE' ? (
                    <div
                      data-testid="hybrid-wfe-active-container"
                      className="p-4 rounded-xl border border-[#00B4D8]/40 bg-[#00B4D8]/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#00B4D8]">
                          Status Aktif:{' '}
                          {activeCurrentUserCheckIn.isHybridTransition
                            ? `Hybrid WFO ↔ WFE (Transisi ${activeCurrentUserCheckIn.wfeTransitionTime} WIB)`
                            : `Checked-In WFE (${activeCurrentUserCheckIn.checkInTime} WIB)`}
                        </span>
                        <span
                          data-testid="wfe-transition-time-badge"
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300"
                        >
                          Status: WFE
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Anda tercatat hadir <strong>WFE (Event Venue)</strong>. Pilih{' '}
                        <strong>Transisi Lokasi (Pindah WFO)</strong> untuk kembali ke kantor HQ, atau pilih{' '}
                        <strong>Clock-Out (Pulang)</strong>.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          data-testid="transition-wfe-to-wfo-btn"
                          onClick={handleTransitionWfeToWfo}
                          className="py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 flex items-center justify-center gap-2 shadow-md"
                        >
                          <Building2 className="w-4 h-4 shrink-0" />
                          <span>Transisi Lokasi (Pindah WFO)</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleEvaluateClockOutRule}
                          data-testid="clock-out-btn"
                          className="py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-95 flex items-center justify-center gap-2 shadow-md"
                        >
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>Clock-Out (Pulang)</span>
                        </button>
                      </div>
                    </div>
                  ) : isCheckInLocked ? (
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-700 bg-slate-900/60 text-xs text-slate-300">
                      <span className="inline-flex items-center gap-2 font-semibold text-emerald-400">
                        <Lock className="w-4 h-4" />
                        <span>Check-In Sesi Hari Ini Telah Selesai &amp; Terkunci</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        data-testid="open-photo-checkin-modal-btn"
                        disabled={isSubmittingCheckIn || isCheckInLocked}
                        onClick={handleDirectCheckInButtonClick}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                      >
                        {isSubmittingCheckIn ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Mengunggah Foto &amp; Menyimpan Check-In...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4" />
                            <span>Check-In ({selectedWorkMode})</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleEvaluateClockOutRule}
                        disabled={isSubmittingCheckIn}
                        data-testid="clock-out-btn"
                        className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50 ${
                          isDark
                            ? 'border-[#00B4D8] text-[#00B4D8] hover:bg-[#00B4D8]/15'
                            : 'border-[#0277BD] text-[#0277BD] hover:bg-[#0277BD]/10'
                        }`}
                      >
                        Clock-Out (Pulang)
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Latest Captured / Uploaded Watermarked Photo Preview */}
                <div
                  className={`lg:col-span-6 p-4 md:p-6 rounded-xl border flex flex-col justify-between min-w-0 ${surfaceCard}`}
                >
                  <div>
                    <h2 className="text-base font-bold font-display break-words">
                      Foto Kehadiran
                    </h2>
                    <p className={`text-xs mt-1 break-words ${mutedText}`}>
                      Menampilkan foto kehadiran yang diunggah beserta cap waktu otomatis dan koordinat lokasi Google Maps.
                    </p>
                  </div>

                  {capturedPhotoUrl ? (
                    <div className="mt-4 space-y-3">
                      <img
                        src={capturedPhotoUrl}
                        alt="Watermarked Attendance Check-In"
                        data-testid="checkin-inline-preview-img"
                        referrerPolicy="no-referrer"
                        className="w-full h-52 object-cover rounded-xl border border-slate-700"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-mono text-[#00B4D8]">
                          Mode: {activeCurrentUserCheckIn?.mode || selectedWorkMode} · Jam:{' '}
                          {activeCurrentUserCheckIn?.checkInTime || checkInInputTime} WIB
                        </span>
                        {capturedMapsLinks.map((lnk, idx) => (
                          <a
                            key={idx}
                            href={lnk.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#00B4D8] hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{lnk.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`mt-4 h-52 rounded-xl border border-dashed flex flex-col items-center justify-center p-4 md:p-6 text-center ${
                        isDark
                          ? 'border-slate-800 bg-slate-950/50'
                          : 'border-slate-300 bg-slate-50'
                      }`}
                    >
                      <Camera className="w-8 h-8 text-[#00B4D8] mb-2" />
                      <p className="text-xs font-semibold">
                        Belum Ada Bukti Foto Check-In Hari Ini
                      </p>
                      <p className={`text-[11px] mt-1 max-w-sm break-words ${mutedText}`}>
                        Unggah foto kehadiran atau klik tombol <strong>Check-In</strong> untuk merekam kehadiran dengan waktu sistem real-time.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Strictly Filtered Monthly Timesheet Log Table with Regular Hours & Overtime Hours */}
              <section className={`no-print p-4 md:p-6 rounded-xl border min-w-0 ${surfaceCard}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold font-display break-words">
                      Tabel Rekap Absensi, Total Jam Kerja &amp; Jam Lembur —{' '}
                      {targetAttendanceEmployee.name}
                    </h2>
                    <p className={`text-xs break-words ${mutedText}`}>
                      Menampilkan {privateUserAttendanceLogs.length} baris absensi milik{' '}
                      <strong>{targetAttendanceEmployee.name}</strong> · Total Jam Kerja:{' '}
                      <strong className="font-mono text-[#00B4D8]">
                        {attendanceExportTotals.totalRegularHours} Jam
                      </strong>{' '}
                      · Total Jam Lembur (≥20:00):{' '}
                      <strong className="font-mono text-emerald-400">
                        {attendanceExportTotals.totalOvertimeHours} Jam
                      </strong>
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-[#00B4D8] shrink-0">
                    Tarif Lembur ≥ 20:00: {formatIDR(OVERTIME_RATE_PER_HOUR)}/jam
                  </span>
                </div>

                {privateUserAttendanceLogs.length === 0 ? (
                  <div
                    data-testid="attendance-empty-blank-slate"
                    className="my-4 p-6 md:p-8 rounded-xl border border-dashed border-slate-700/60 text-center space-y-2"
                  >
                    <Camera className="w-8 h-8 text-[#00B4D8] mx-auto opacity-80" />
                    <p className="text-sm font-bold font-display">
                      Belum Ada Riwayat Absensi Tercatat
                    </p>
                    <p className={`text-xs max-w-md mx-auto break-words ${mutedText}`}>
                      Silakan lakukan Check-In untuk memulai pencatatan jam kerja harian.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table
                      data-testid="private-attendance-table"
                      className="w-full text-left border-collapse text-xs md:text-sm min-w-[740px]"
                    >
                      <thead>
                        <tr
                          className={`border-b ${
                            isDark
                              ? 'border-slate-800 text-slate-400'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          <th className="py-2.5 px-3 font-semibold">Date</th>
                          <th className="py-2.5 px-3 font-semibold">
                            Status (WFO / Hybrid WFE)
                          </th>
                          <th className="py-2.5 px-3 font-semibold text-right">
                            In
                          </th>
                          <th className="py-2.5 px-3 font-semibold text-right">
                            Out
                          </th>
                          <th className="py-2.5 px-3 font-semibold text-right">
                            Jam Kerja (Reguler)
                          </th>
                          <th className="py-2.5 px-3 font-semibold text-right">
                            Jam Lembur (≥20:00)
                          </th>
                          <th className="py-2.5 px-3 font-semibold">
                            Deskripsi Pekerjaan &amp; Bukti Foto
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {privateUserAttendanceLogs.map((log) => {
                          const regHrs =
                            typeof log.regularHours === 'number' &&
                            log.regularHours > 0
                              ? log.regularHours
                              : calculateRegularWorkingHours(
                                  log.checkInTime,
                                  log.checkOutTime
                                );
                          return (
                            <tr key={log.id}>
                              <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                                {log.date}
                              </td>
                              <td className="py-2.5 px-3 font-semibold whitespace-normal break-words">
                                <span
                                  className={
                                    log.isHybridTransition
                                      ? 'text-purple-400'
                                      : 'text-[#00B4D8]'
                                  }
                                >
                                  {log.isHybridTransition
                                    ? `WFO → WFE (${log.wfeTransitionTime})`
                                    : log.mode}
                                </span>{' '}
                                · {log.staffName}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                {log.checkInTime}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                {log.checkOutTime || 'Active'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#00B4D8]">
                                {regHrs > 0 ? `${regHrs} Jam` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-500 whitespace-nowrap">
                                {log.overtimeHours} Jam ({formatIDR(log.overtimePay)})
                              </td>
                              <td className="py-2.5 px-3 whitespace-normal break-words max-w-xs">
                                <p className="font-medium break-words">
                                  {getAttendanceJobDescription(log)}
                                </p>
                                {log.photoDataUrl && (
                                  <img
                                    src={log.photoDataUrl}
                                    alt={`Check-In ${log.staffName}`}
                                    className="mt-1 w-14 h-10 object-cover rounded border border-slate-700"
                                  />
                                )}
                                <p className={`text-[11px] break-words ${mutedText}`}>
                                  {log.locationWatermark}
                                </p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr
                          className={`border-t-2 font-mono font-bold ${
                            isDark
                              ? 'border-slate-700 bg-slate-900/70'
                              : 'border-slate-300 bg-slate-100'
                          }`}
                        >
                          <td className="py-3 px-3" colSpan={4}>
                            TOTAL REKAP ({targetAttendanceEmployee.name})
                          </td>
                          <td className="py-3 px-3 text-right text-[#00B4D8]">
                            {attendanceExportTotals.totalRegularHours} Jam Kerja
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-400">
                            {attendanceExportTotals.totalOvertimeHours} Jam Lembur (
                            {formatIDR(attendanceExportTotals.totalOvertimePay)})
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-400">
                            Total Telat: {attendanceExportTotals.totalLateMinutes}m
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* =================================================================
              TAB 3: PETTY CASH MASTER-DETAIL (`pc_events` & `pc_transactions`)
              WITH STRICT RBAC, EVENT COMPLETION WORKFLOW & EXCELJS EMBEDDED RECEIPTS
             ================================================================= */}
          {activeTab === 'pettycash' && (
            <div className="space-y-6">
              {/* Top Petty Cash Header & Strict RBAC Badge */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[#00B4D8]">
                      PETTY CASH MASTER-DETAIL (pc_events &amp; pc_transactions) · STRICT RBAC · EXCELJS EMBEDDED IMAGES
                    </span>
                    <span
                      data-testid="petty-cash-privacy-badge"
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                        hasFullPettyCashAccess
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {hasFullPettyCashAccess
                        ? `Global Access (${currentUser.role} — dev / finance / executive): Melihat Semua ${visibleEventsList.length} Event`
                        : `Strict RBAC (${currentUser.email}): Hanya Event created_by / authorized_personnel (${visibleEventsList.length} Event)`}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold font-display mt-1">
                    Manajemen Petty Cash Event (Master-Detail) &amp; Laporan Excel
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Create Master Event (`pc_events`) Button */}
                  <button
                    type="button"
                    data-testid="open-input-dana-event-btn"
                    onClick={() => {
                      setBudgetEventNameInput('');
                      setBudgetInvolvedStaffIds(
                        currentUser.staffId ? [currentUser.staffId] : []
                      );
                      setBudgetAuthorizedEmails(
                        currentUser.email
                          ? [currentUser.email.trim().toLowerCase()]
                          : []
                      );
                      setNewBudgetAmount('35000000');
                      setBudgetModalError('');
                      setIsBudgetModalOpen(true);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold border flex items-center gap-2 whitespace-nowrap ${
                      isDark
                        ? 'border-[#00B4D8] text-[#00B4D8] bg-slate-900 hover:bg-slate-800'
                        : 'border-[#0277BD] text-[#0277BD] bg-white hover:bg-slate-100'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Buat Event Baru (Master pc_events)</span>
                  </button>

                  {/* "Download Laporan Petty Cash (Excel)" Button — ALWAYS accessible for authorized users whether event is active or completed */}
                  <button
                    type="button"
                    disabled={
                      isExporting || activeEventBudget.eventId === 'evt_none'
                    }
                    onClick={handleDownloadPettyCashExcel}
                    data-testid="download-petty-cash-excel-btn"
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shadow-md"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>
                      {isExporting
                        ? 'Generating Excel (.xlsx)...'
                        : 'Download Laporan Petty Cash (Excel)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* STRICT PETTY CASH FILTERING (RBAC):
                  Show empty RBAC state if no event matches (Global Access OR created_by == user.email OR authorized_personnel includes user.email) */}
              {visibleEventsList.length === 0 ? (
                <div
                  data-testid="petty-cash-no-assigned-events-rbac"
                  className="p-8 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-center space-y-3"
                >
                  <Lock className="w-8 h-8 text-amber-400 mx-auto" />
                  <h2 className="text-base font-bold font-display text-amber-300">
                    Belum Ada Event Petty Cash Sesuai Hak Akses Anda
                  </h2>
                  <p className={`text-xs max-w-xl mx-auto ${mutedText}`}>
                    Akun <strong>{currentUser.name}</strong> (
                    <code>{currentUser.email}</code> · Role:{' '}
                    <strong>{currentUser.role}</strong>) belum memiliki event di{' '}
                    <code>pc_events</code> sebagai <code>created_by</code> maupun
                    di dalam array <code>authorized_personnel</code>. Klik tombol{' '}
                    <strong>Buat Event Baru (Master pc_events)</strong> di atas
                    untuk membuat event baru dan memilih personel yang diotorisasi.
                  </p>
                </div>
              ) : (
                <>
                  {/* Master Event Selector (`Pilih Event`), Completion Button (`Tandai Event Selesai`) & Summary Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                    <div
                      className={`lg:col-span-6 p-5 rounded-xl border flex flex-col justify-between ${surfaceCard}`}
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label
                            htmlFor="active-event-select"
                            className="block text-xs font-semibold text-[#00B4D8]"
                          >
                            Pilih Event (Aktif &amp; Selesai — Sesuai RBAC):
                          </label>
                          <span
                            data-testid="pc-event-status-badge"
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              activeEventBudget.is_completed
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            }`}
                          >
                            {activeEventBudget.is_completed
                              ? '✓ EVENT SELESAI (COMPLETED / LOCKED)'
                              : '● EVENT AKTIF (OPEN FOR RECEIPTS)'}
                          </span>
                        </div>

                        <select
                          id="active-event-select"
                          data-testid="active-event-select"
                          value={activeEventBudget.eventId}
                          onChange={(e) => {
                            const evId = e.target.value;
                            setSelectedEventId(evId);
                            const found = visibleEventsList.find(
                              (ev) => ev.eventId === evId
                            );
                            if (found) {
                              setExpenseEventNameInput(
                                found.event_name || found.eventName
                              );
                              setExpenseInvolvedStaffIds(found.involvedStaffIds);
                            }
                          }}
                          className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${
                            isDark
                              ? 'bg-slate-950 border-slate-700 text-white'
                              : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        >
                          {visibleEventsList.map((ev) => (
                            <option key={ev.eventId} value={ev.eventId}>
                              [{ev.is_completed ? 'SELESAI' : 'AKTIF'}]{' '}
                              {ev.event_name || ev.eventName} (Dibuat:{' '}
                              {ev.created_by || 'PM/PIC'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div
                        className={`mt-3 pt-3 border-t border-slate-700/30 text-xs space-y-2 ${mutedText}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p>
                            <strong>Dibuat Oleh (created_by):</strong>{' '}
                            <code className="text-[#00B4D8]">
                              {activeEventBudget.created_by || currentUser.email}
                            </code>
                          </p>
                          {!activeEventBudget.is_completed ? (
                            <button
                              type="button"
                              disabled={isCompletingPcEvent}
                              onClick={handleMarkEventCompleted}
                              data-testid="mark-event-completed-btn"
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>
                                {isCompletingPcEvent
                                  ? 'Menyimpan...'
                                  : 'Tandai Event Selesai'}
                              </span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                              <Lock className="w-3.5 h-3.5" />
                              <span>is_completed = true (Terkunci)</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#00B4D8] break-words">
                          <strong>Authorized Personnel (JSONB Emails):</strong>{' '}
                          {activeEventBudget.authorized_personnel &&
                          activeEventBudget.authorized_personnel.length > 0
                            ? activeEventBudget.authorized_personnel.join(', ')
                            : activeEventBudget.involvedPersonnelNames.join(', ')}
                        </p>
                      </div>
                    </div>

                    {/* 3 Financial Metrics Summary Cards: Dana Approval, Total Pengeluaran, Sisa Saldo / Sisa Dana Dikembalikan ke Kantor */}
                    <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Card 1: Dana Approval (`approved_budget` from `pc_events`) */}
                      <div className={`p-5 rounded-xl border ${surfaceCard}`}>
                        <p className={`text-xs font-medium ${mutedText}`}>
                          Dana Approval
                        </p>
                        <p
                          data-testid="approved-budget-display"
                          className="text-lg font-bold font-mono tabular-nums mt-1 text-[#00B4D8]"
                        >
                          {formatIDR(pettyCashSummary.approvedBudget)}
                        </p>
                        <p className={`text-[11px] mt-1 ${mutedText}`}>
                          Plafon Awal (approved_budget)
                        </p>
                      </div>

                      {/* Card 2: Total Pengeluaran (Sum of `amount` from `pc_transactions`) */}
                      <div className={`p-5 rounded-xl border ${surfaceCard}`}>
                        <p className={`text-xs font-medium ${mutedText}`}>
                          Total Pengeluaran
                        </p>
                        <p
                          data-testid="total-spent-display"
                          className="text-lg font-bold font-mono tabular-nums mt-1 text-amber-500"
                        >
                          {formatIDR(pettyCashSummary.totalSpent)}
                        </p>
                        <p
                          className={`text-[11px] mt-1 font-mono tabular-nums ${mutedText}`}
                        >
                          {activeEventExpenses.length} Struk · Utilisasi{' '}
                          {pettyCashSummary.utilizationPercent}%
                        </p>
                      </div>

                      {/* Card 3: Sisa Saldo OR 'Sisa Dana Dikembalikan ke Kantor' (Refund to Office) when `is_completed === true` */}
                      <div
                        data-testid="remaining-balance-card"
                        className={`p-5 rounded-xl border transition-all ${
                          activeEventBudget.is_completed
                            ? 'bg-emerald-500/15 border-2 border-emerald-400 shadow-lg shadow-emerald-500/10'
                            : surfaceCard
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p
                            data-testid="remaining-balance-label"
                            className={`text-xs font-bold ${
                              activeEventBudget.is_completed
                                ? 'text-emerald-300'
                                : mutedText
                            }`}
                          >
                            {activeEventBudget.is_completed
                              ? 'Sisa Dana Dikembalikan ke Kantor'
                              : 'Sisa Saldo'}
                          </p>
                          {activeEventBudget.is_completed && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 shrink-0">
                              Refund
                            </span>
                          )}
                        </div>
                        <p
                          data-testid="remaining-balance-display"
                          className={`text-lg font-bold font-mono tabular-nums mt-1 ${
                            activeEventBudget.is_completed
                              ? 'text-emerald-300'
                              : pettyCashSummary.remainingBalance < 0
                              ? 'text-rose-400'
                              : 'text-emerald-500'
                          }`}
                        >
                          {formatIDR(pettyCashSummary.remainingBalance)}
                        </p>
                        <p
                          className={`text-[11px] mt-1 ${
                            activeEventBudget.is_completed
                              ? 'text-emerald-200/90 font-semibold'
                              : mutedText
                          }`}
                        >
                          {activeEventBudget.is_completed
                            ? 'Wajib Disetor PIC ke Finance (Refund to Office)'
                            : 'Dana Approval − Total Pengeluaran'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Detail Section: Left = Input Receipt Form (or Locked Card if is_completed === true), Right = Transactions Table */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {activeEventBudget.is_completed ? (
                      <div
                        data-testid="petty-cash-event-completed-locked"
                        className={`lg:col-span-5 p-6 rounded-xl border flex flex-col items-center justify-center text-center space-y-4 ${surfaceCard}`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <Lock className="w-6 h-6" />
                        </div>
                        <div className="space-y-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            EVENT COMPLETED · INPUT DIKUNCI
                          </span>
                          <h2 className="text-base font-bold font-display">
                            Event &ldquo;
                            {activeEventBudget.event_name ||
                              activeEventBudget.eventName}
                            &rdquo; Telah Selesai
                          </h2>
                          <p className={`text-xs max-w-sm mx-auto ${mutedText}`}>
                            Event ini telah ditandai selesai (
                            <code>is_completed = true</code>). Penambahan struk
                            Petty Cash baru telah dinonaktifkan sepenuhnya.
                          </p>
                        </div>

                        {/* Highlighted Refund Summary Box for Finance */}
                        <div className="w-full p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/40 text-left space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className={mutedText}>Dana Approval:</span>
                            <span className="font-mono font-semibold text-[#00B4D8]">
                              {formatIDR(pettyCashSummary.approvedBudget)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={mutedText}>Total Pengeluaran:</span>
                            <span className="font-mono font-semibold text-amber-400">
                              {formatIDR(pettyCashSummary.totalSpent)}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-emerald-500/30 flex items-center justify-between">
                            <span className="font-bold text-emerald-300">
                              Sisa Dana Dikembalikan ke Kantor:
                            </span>
                            <span className="font-mono text-sm font-bold text-emerald-300">
                              {formatIDR(pettyCashSummary.remainingBalance)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isExporting}
                          onClick={handleDownloadPettyCashExcel}
                          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 flex items-center gap-2 shadow-md"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>
                            Download Laporan Petty Cash (Excel + Foto Struk)
                          </span>
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={handleAddPettyCashExpense}
                        className={`lg:col-span-5 p-6 rounded-xl border space-y-4 ${surfaceCard}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h2 className="text-base font-bold font-display">
                              Input Struk Baru (Detail pc_transactions)
                            </h2>
                            <p className={`text-[11px] ${mutedText}`}>
                              Event Aktif:{' '}
                              <strong className="text-[#00B4D8]">
                                {activeEventBudget.event_name ||
                                  activeEventBudget.eventName}
                              </strong>
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={isScanningOcr}
                            onClick={handleMintaPitiScanStruk}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {isScanningOcr ? 'Scanning...' : 'Auto-Fill OCR'}
                            </span>
                          </button>
                        </div>

                        {/* HTML5 Camera & File Upload for `receipt_url` */}
                        <div
                          className={`p-3.5 rounded-xl border ${
                            isDark
                              ? 'bg-slate-950/90 border-slate-800'
                              : 'bg-slate-50 border-slate-200'
                          } space-y-2`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <label
                              htmlFor="petty-cash-receipt-file-input"
                              className="text-xs font-semibold text-[#00B4D8] flex items-center gap-1.5 cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Upload Foto Struk (receipt_url)</span>
                            </label>
                            {expenseReceiptLabel && (
                              <span className="text-[10px] font-mono text-emerald-400 truncate max-w-[140px]">
                                {expenseReceiptLabel}
                              </span>
                            )}
                          </div>
                          <input
                            ref={receiptFileInputRef}
                            id="petty-cash-receipt-file-input"
                            data-testid="petty-cash-receipt-file-input"
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePettyCashReceiptFileChange}
                            className="block w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0277BD] file:text-white hover:file:bg-[#00B4D8] cursor-pointer"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="pc-merchant-input"
                            className="block text-xs font-medium mb-1"
                          >
                            Nama Merchant (merchant)
                          </label>
                          <input
                            id="pc-merchant-input"
                            type="text"
                            value={expenseMerchant}
                            onChange={(e) => setExpenseMerchant(e.target.value)}
                            placeholder="Contoh: Kopi Kenangan - Kemang Raya"
                            className={`w-full px-3 py-2 rounded-lg text-xs border ${
                              isDark
                                ? 'bg-slate-950 border-slate-700 text-white'
                                : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label
                              htmlFor="pc-date-input"
                              className="block text-xs font-medium mb-1"
                            >
                              Tanggal Struk (receipt_date)
                            </label>
                            <input
                              id="pc-date-input"
                              type="date"
                              value={expenseDate}
                              onChange={(e) => setExpenseDate(e.target.value)}
                              className={`w-full px-3 py-2 rounded-lg text-xs font-mono border ${
                                isDark
                                  ? 'bg-slate-950 border-slate-700 text-white'
                                  : 'bg-slate-50 border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="pc-amount-input"
                              className="block text-xs font-medium mb-1"
                            >
                              Nominal IDR (amount)
                            </label>
                            <input
                              id="pc-amount-input"
                              type="number"
                              value={expenseAmount}
                              onChange={(e) => setExpenseAmount(e.target.value)}
                              placeholder="285000"
                              className={`w-full px-3 py-2 rounded-lg text-xs font-mono border ${
                                isDark
                                  ? 'bg-slate-950 border-slate-700 text-white'
                                  : 'bg-slate-50 border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="pc-category-select"
                            className="block text-xs font-medium mb-1"
                          >
                            Kategori Pengeluaran (category)
                          </label>
                          <select
                            id="pc-category-select"
                            value={expenseCategory}
                            onChange={(e) => setExpenseCategory(e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg text-xs border ${
                              isDark
                                ? 'bg-slate-950 border-slate-700 text-white'
                                : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                          >
                            <option value="Consumption & Crew Meals">
                              Consumption &amp; Crew Meals
                            </option>
                            <option value="Production & Stage Supplies">
                              Production &amp; Stage Supplies
                            </option>
                            <option value="Transport & Mobilization">
                              Transport &amp; Mobilization
                            </option>
                            <option value="Talent & Hospitality">
                              Talent &amp; Hospitality
                            </option>
                          </select>
                        </div>

                        {expenseReceiptDataUrl && (
                          <div
                            data-testid="petty-cash-uploaded-receipt-preview"
                            className="p-3 rounded-xl border border-[#00B4D8]/40 bg-[#00B4D8]/10 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs min-w-0">
                                <p className="font-semibold text-[#00B4D8] truncate">
                                  Preview Foto Struk
                                </p>
                                <p className={`text-[11px] truncate ${mutedText}`}>
                                  {expenseReceiptLabel}
                                </p>
                              </div>
                              <button
                                type="button"
                                data-testid="open-receipt-detail-modal-from-form-btn"
                                onClick={() =>
                                  setSelectedReceiptDetail({
                                    id: `preview_${Date.now()}`,
                                    eventId: activeEventBudget.eventId,
                                    event_id: activeEventBudget.eventId,
                                    eventName:
                                      activeEventBudget.event_name ||
                                      activeEventBudget.eventName,
                                    involvedPersonnelIds: expenseInvolvedStaffIds,
                                    involvedStaffIds: expenseInvolvedStaffIds,
                                    involvedPersonnelNames: [
                                      `${currentUser.name} (${currentUser.role})`,
                                    ],
                                    merchant:
                                      expenseMerchant ||
                                      'Merchant Struk Operasional',
                                    date: expenseDate,
                                    receipt_date: expenseDate,
                                    amount:
                                      Number(
                                        expenseAmount.replace(/[^0-9]/g, '')
                                      ) || 0,
                                    category: expenseCategory,
                                    receiptLabel:
                                      expenseReceiptLabel ||
                                      'Uploaded_Receipt.jpg',
                                    receiptDataUrl: expenseReceiptDataUrl,
                                    receipt_url: expenseReceiptDataUrl,
                                    submittedBy:
                                      currentUser.email || currentUser.name,
                                    submitted_by:
                                      currentUser.email || currentUser.name,
                                    submittedByStaffId: currentUser.staffId,
                                  })
                                }
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#0277BD] text-white hover:bg-[#00B4D8] shrink-0"
                              >
                                Buka Modal Detail Struk
                              </button>
                            </div>
                            <img
                              src={expenseReceiptDataUrl}
                              alt="Scanned Receipt Preview"
                              data-testid="petty-cash-form-preview-img"
                              referrerPolicy="no-referrer"
                              className="w-full h-36 object-cover rounded border border-slate-600 cursor-pointer"
                            />
                          </div>
                        )}

                        {expenseFormError && (
                          <p className="text-xs text-rose-400 font-medium">
                            {expenseFormError}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={isSubmittingPcTransaction}
                          data-testid="save-petty-cash-expense-btn"
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#0277BD] hover:bg-[#00B4D8] disabled:opacity-50 transition-colors"
                        >
                          {isSubmittingPcTransaction
                            ? 'Menyimpan ke pc_transactions...'
                            : 'Simpan Transaksi & Lampirkan Struk ke Event'}
                        </button>
                      </form>
                    )}

                    {/* Right: Petty Cash Detail Transactions Table (`pc_transactions` for selected `event_id`) */}
                    <div
                      className={`lg:col-span-7 p-6 rounded-xl border ${surfaceCard}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                        <div>
                          <h2 className="text-base font-bold font-display">
                            Daftar Transaksi Event (Detail pc_transactions)
                          </h2>
                          <p className={`text-xs ${mutedText}`}>
                            Menampilkan rincian struk untuk{' '}
                            <strong>
                              {activeEventBudget.event_name ||
                                activeEventBudget.eventName}
                            </strong>{' '}
                            (Status:{' '}
                            <strong>
                              {activeEventBudget.is_completed
                                ? 'Selesai'
                                : 'Aktif'}
                            </strong>
                            ). Klik baris transaksi untuk melihat foto struk.
                          </p>
                        </div>
                        <span className="text-xs font-mono text-emerald-500 font-semibold shrink-0">
                          Total: {formatIDR(pettyCashSummary.totalSpent)}
                        </span>
                      </div>

                      {activeEventExpenses.length === 0 ? (
                        <div
                          data-testid="petty-cash-empty-blank-slate"
                          className="my-4 p-8 rounded-xl border border-dashed border-slate-700/60 text-center space-y-2"
                        >
                          <Receipt className="w-8 h-8 text-[#00B4D8] mx-auto opacity-80" />
                          <p className="text-sm font-bold font-display">
                            Belum Ada Transaksi pada Event Ini
                          </p>
                          <p className={`text-xs max-w-md mx-auto ${mutedText}`}>
                            Tabel <code>pc_transactions</code> untuk event{' '}
                            <strong>
                              {activeEventBudget.event_name ||
                                activeEventBudget.eventName}
                            </strong>{' '}
                            masih kosong. Unggah struk pengeluaran pada form di
                            samping untuk menambahkan rincian transaksi.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto w-full">
                          <table
                            data-testid="petty-cash-table"
                            className="w-full text-left border-collapse text-xs min-w-[640px]"
                          >
                            <thead>
                              <tr
                                className={`border-b ${
                                  isDark
                                    ? 'border-slate-800 text-slate-400'
                                    : 'border-slate-200 text-slate-600'
                                }`}
                              >
                                <th className="py-2.5 px-2.5 font-semibold">
                                  Tanggal Struk
                                </th>
                                <th className="py-2.5 px-2.5 font-semibold">
                                  Merchant &amp; Kategori
                                </th>
                                <th className="py-2.5 px-2.5 font-semibold">
                                  Submitted By
                                </th>
                                <th className="py-2.5 px-2.5 font-semibold text-right">
                                  Nominal
                                </th>
                                <th className="py-2.5 px-2.5 font-semibold">
                                  Foto Struk (receipt_url)
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {activeEventExpenses.map((exp) => (
                                <tr
                                  key={exp.id}
                                  data-testid={`petty-cash-row-${exp.id}`}
                                  onClick={() => setSelectedReceiptDetail(exp)}
                                  className="cursor-pointer hover:bg-slate-800/30 transition-colors"
                                >
                                  <td className="py-2.5 px-2.5 font-mono tabular-nums whitespace-nowrap">
                                    {exp.receipt_date || exp.date}
                                  </td>
                                  <td className="py-2.5 px-2.5">
                                    <p className="font-semibold">
                                      {exp.merchant}
                                    </p>
                                    <p className={`text-[11px] ${mutedText}`}>
                                      {exp.category}
                                    </p>
                                  </td>
                                  <td className="py-2.5 px-2.5">
                                    <p className="font-mono text-[11px] text-[#00B4D8]">
                                      {exp.submitted_by || exp.submittedBy}
                                    </p>
                                  </td>
                                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums font-semibold text-[#00B4D8] whitespace-nowrap">
                                    {formatIDR(exp.amount)}
                                  </td>
                                  <td className="py-2.5 px-2.5 max-w-[170px]">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {exp.receipt_url || exp.receiptDataUrl ? (
                                        <img
                                          src={
                                            exp.receipt_url ||
                                            exp.receiptDataUrl
                                          }
                                          alt={exp.receiptLabel}
                                          referrerPolicy="no-referrer"
                                          className="w-12 h-9 object-cover rounded border border-slate-700 shrink-0"
                                        />
                                      ) : (
                                        <Receipt className="w-5 h-5 text-[#00B4D8] shrink-0" />
                                      )}
                                      <span
                                        title={exp.receiptLabel}
                                        className="text-[11px] font-mono text-emerald-500 underline truncate"
                                      >
                                        Lihat Struk
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* =================================================================
              NEW TAB: MANAJEMEN TIM & ABSENSI ("Tim & Absensi" — OPEN TO ALL ACTIVE PERSONNEL WITH DYNAMIC RBAC)
             ================================================================= */}
          {activeTab === 'team_attendance' && (
            <TeamAttendanceDashboardTab
              currentUser={currentUser}
              staffList={staffList}
              attendanceLogs={attendanceLogs}
              payrollCycleLabel={payrollCycle.label}
              onDownloadTeamPdf={handleDownloadTeamDashboardPDF}
              onDownloadTeamExcel={handleDownloadTeamDashboardExcel}
              isExporting={isExporting}
              isDark={isDark}
              leaveRecords={leaveRecords}
              calendarEvents={calendarEvents}
            />
          )}

          {/* =================================================================
              NEW TAB: SOP PERUSAHAAN (EXECUTIVE & DIGITAL ONLY CRUD, READ-ONLY FOR STANDARD)
             ================================================================= */}
          {activeTab === 'sop' && (
            <SopManagementTab
              currentUser={currentUser}
              sops={sops}
              onAddSop={handleAddCompanySop}
              onUpdateSop={handleUpdateCompanySop}
              onDeleteSop={handleDeleteCompanySop}
              isDark={isDark}
            />
          )}

          {/* =================================================================
              NEW TAB: MANAJEMEN KENDARAAN (FLEET MANAGEMENT — PAK RIO & NUGI ONLY CRUD)
             ================================================================= */}
          {activeTab === 'fleet' && (
            <FleetManagementTab
              currentUser={currentUser}
              fleetVehicles={fleetVehicles}
              carBookings={calendarEvents.filter(
                (ev) => ev.eventType === 'Booking Mobil Operasional'
              )}
              onAddVehicle={handleAddFleetVehicle}
              onUpdateVehicle={handleUpdateFleetVehicle}
              onDeleteVehicle={handleDeleteFleetVehicle}
              onBookVehicle={handleAddCalendarEvent}
              onUpdateBooking={handleUpdateVehicleBooking}
              onDeleteBooking={handleDeleteVehicleBooking}
              isDark={isDark}
            />
          )}

          {/* =================================================================
              NEW TAB: TASK & PEKERJAAN (SPLIT CHECKLIST + CALENDAR DEADLINE SYNC)
             ================================================================= */}
          {activeTab === 'tasks' && (
            <TasksManagementTab
              currentUser={currentUser}
              staffList={staffList}
              tasks={tasks}
              onAddTask={handleAddWorkTask}
              onToggleTask={handleToggleWorkTask}
              onUpdateTask={handleUpdateWorkTask}
              onOpenCalendarTab={() => setActiveTab('leave')}
              isDark={isDark}
            />
          )}

          {/* =================================================================
              TAB 4: CO-WORKER CHAT ROOM (FUTARI GENERAL CHAT - LOCAL SUPABASE)
             ================================================================= */}
          {activeTab === 'chat' && (
            <CoworkerChatTab
              currentUser={currentUser}
              staffList={staffList}
              messages={chatMessages}
              onSendMessage={handleSendChatMessage}
              isDark={isDark}
            />
          )}

          {/* =================================================================
              TAB 5: LEAVE CALENDAR SYSTEM (CUTI, EVENT, DYNAMIC CAR BOOKING & TASK DEADLINE SYNC)
             ================================================================= */}
          {activeTab === 'leave' && (
            <LeaveCalendarTab
              currentUser={currentUser}
              staffList={staffList}
              leaves={leaveRecords}
              events={calendarEvents}
              dailyChecklists={dailyChecklists}
              fleetVehicles={fleetVehicles}
              tasks={tasks}
              onSubmitLeaveRequest={handleSubmitLeaveRequest}
              onAddCalendarEvent={handleAddCalendarEvent}
              onUpdateCalendarEvent={handleUpdateVehicleBooking}
              onDeleteCalendarEvent={handleDeleteVehicleBooking}
              onToggleChecklistItem={handleToggleChecklistItem}
              onAddChecklistItem={handleAddChecklistItem}
              onEditChecklistItem={handleEditChecklistItem}
              onDeleteChecklistItem={handleDeleteChecklistItem}
              onSyncLeaveToGoogleCalendar={handleSyncLeaveToGoogleCalendar}
              onOpenTasksTab={() => setActiveTab('tasks')}
              isDark={isDark}
            />
          )}

          {/* =================================================================
              TAB 6: MANDATORY PROFILE PAGE (22-PERSON DATABASE + SELF-SERVICE + 3D AVATAR)
             ================================================================= */}
          {activeTab === 'profile' && (
            <ProfileTab
              currentUser={currentUser}
              staffList={staffList}
              onUpdateOwnProfile={handleSelfServiceUpdateOwnProfile}
              userAttendanceLogs={privateUserAttendanceLogs}
              payrollCycleLabel={payrollCycle.label}
              onOpenStructuredPdfModal={() => setIsReportViewerOpen(true)}
              isDark={isDark}
            />
          )}

          {/* =================================================================
              TAB 8: EXCLUSIVE DEVELOPER / SUPERADMIN BACKDOOR (USER MANAGEMENT)
              Strictly rendered ONLY when authenticated as nuginugroho2005@gmail.com
             ================================================================= */}
          {activeTab === 'user_management' && isDeveloperUser && (
            <UserManagementTab
              currentUser={currentUser}
              staffList={staffList}
              onChangeUserRole={handleDeveloperChangeRole}
              onChangeUserDivision={handleDeveloperChangeDivision}
              onToggleSuspendUser={handleDeveloperToggleSuspend}
              onDeleteUser={handleDeveloperDeleteUser}
              onRegisterNewAccount={handleDeveloperRegisterWorkspaceAccount}
              onSuperadminEditFullProfile={handleSuperadminEditFullProfile}
              onShowToast={showToast}
              isDark={isDark}
            />
          )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Photo Check-In + HTML5 Camera/File Upload + Google Maps Grounding Modal */}
      <PhotoWatermarkModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        staffName={currentUser.name}
        role={currentUser.role}
        branch={currentUser.branch}
        selectedMode={selectedWorkMode}
        checkInTime={checkInInputTime}
        initialPreviewObjectUrl={uploadedCheckInObjectUrl}
        initialFileName={uploadedCheckInFileName}
        initialFile={uploadedCheckInFile}
        isSubmitting={isSubmittingCheckIn}
        errorMessage={checkInError}
        onConfirmCapture={handleConfirmPhotoCheckIn}
      />

      {/* Structured PDF & Excel Attendance Report Document Viewer Modal (Strictly Private to Target Employee) */}
      <AttendanceReportViewerModal
        isOpen={isReportViewerOpen}
        onClose={() => setIsReportViewerOpen(false)}
        employee={targetAttendanceEmployee}
        periodLabel={payrollCycle.label}
        logs={syncAttendanceLogsWithLeave(
          privateUserAttendanceLogs,
          leaveRecords,
          targetAttendanceEmployee,
          calendarEvents
        )}
        isDark={isDark}
        onDownloadHtmlPdfFile={() => handleConfirmStructuredPdfDownload(false)}
        onDownloadExcelFile={handleDownloadAttendanceExcel}
        onSyncToGoogleDocs={() => handleConfirmStructuredPdfDownload(true)}
        isExporting={isExporting}
      />

      {/* Petty Cash Receipt Detail Modal with Real URL.createObjectURL(file) Image Preview */}
      {selectedReceiptDetail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Detail Struk Petty Cash"
          data-testid="receipt-detail-modal"
          className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
        >
          <div className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-5 space-y-4 ${surfaceCard}`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#00B4D8]/20 text-[#00B4D8]">
                  Receipt Detail Modal · Real Image Preview
                </span>
                <h3 className="text-base font-bold font-display mt-1">
                  {selectedReceiptDetail.merchant}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedReceiptDetail.eventName} · {selectedReceiptDetail.date}
                </p>
              </div>
              <button
                type="button"
                data-testid="close-receipt-detail-modal-btn"
                onClick={() => setSelectedReceiptDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Real Image Preview rendered from URL.createObjectURL(file) */}
            <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex flex-col items-center justify-center p-3">
              {selectedReceiptDetail.receiptDataUrl ? (
                <img
                  src={selectedReceiptDetail.receiptDataUrl}
                  alt={`Preview Struk ${selectedReceiptDetail.merchant}`}
                  data-testid="receipt-detail-modal-img"
                  className="max-h-72 w-auto object-contain rounded-lg border border-slate-800"
                />
              ) : (
                <p className="text-xs text-slate-400 py-8">
                  Tidak ada gambar struk
                </p>
              )}
              <p className="text-[11px] font-mono text-emerald-400 mt-2">
                File: {selectedReceiptDetail.receiptLabel}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <div>
                <p className="text-slate-400 text-[11px]">Nominal Struk</p>
                <p className="font-mono font-bold text-rose-400 text-sm mt-0.5">
                  {formatIDR(selectedReceiptDetail.amount)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Kategori</p>
                <p className="font-semibold text-white mt-0.5">
                  {selectedReceiptDetail.category}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400 text-[11px]">Diinput Oleh</p>
                <p className="text-slate-200 mt-0.5">
                  {selectedReceiptDetail.submittedBy}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReceiptDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0277BD] text-white hover:bg-[#00B4D8]"
              >
                Tutup Preview Struk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY "Deskripsi Pekerjaan Hari Ini" Modal on Clock-Out at ANY time (with max-h-[80vh] overflow-y-auto) */}
      {isOvertimeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Modal Wajib Deskripsi Pekerjaan Hari Ini"
          data-testid="mandatory-overtime-modal"
          className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSaveMandatoryOvertimeNote}
            className={`w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl p-4 sm:p-6 space-y-4 ${surfaceCard}`}
          >
            <div className="flex items-center gap-2.5 text-[#00B4D8]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3
                id="overtime-modal-title"
                className="text-base font-bold font-display"
              >
                Deskripsi Pekerjaan Hari Ini — WAJIB CLOCK-OUT
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Waktu Clock-Out Anda adalah{' '}
              <strong className="font-mono text-[#00B4D8]">
                {checkOutInputTime} WIB
              </strong>
              . Sesuai kebijakan operasional Futari, setiap karyawan{' '}
              <strong>wajib</strong> mengisi{' '}
              <strong>Deskripsi Pekerjaan Hari Ini</strong> sebelum menyelesaikan
              Clock-Out agar otomatis tampil di Tabel Absensi &amp; Laporan PDF.
              {liveOvertimePreview.isOvertime
                ? ' Karena waktu Clock-Out ≥ 20:00 WIB, kompensasi lembur dihitung sebesar IDR 7.000/jam mulai pukul 20:00 WIB.'
                : ' Karena waktu Clock-Out sebelum 20:00 WIB, status jam pulang adalah Reguler/Normal (Lembur IDR 0).'}
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono tabular-nums">
              <span>
                Status:{' '}
                {liveOvertimePreview.isOvertime
                  ? `Lembur (${liveOvertimePreview.overtimeHours} Jam)`
                  : 'Jam Kerja Normal'}
              </span>
              <span className="text-emerald-400 font-bold">
                Lembur: {formatIDR(liveOvertimePreview.overtimePay)}
              </span>
            </div>

            <div>
              <label
                htmlFor="overtime-note-textarea"
                className="block text-xs font-medium mb-1.5"
              >
                Deskripsi Pekerjaan Hari Ini (Wajib Diisi)
              </label>
              <textarea
                id="overtime-note-textarea"
                rows={3}
                value={overtimeNoteInput}
                onChange={(e) => setOvertimeNoteInput(e.target.value)}
                placeholder="Contoh: Koordinasi produksi vendor Tech Summit JKT & finalisasi laporan harian..."
                className="w-full px-3 py-2 rounded-lg text-xs bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00B4D8]"
              />
              {overtimeNoteError && (
                <p className="text-xs text-rose-400 mt-1">{overtimeNoteError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOvertimeModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95"
              >
                Simpan Deskripsi Pekerjaan &amp; Clock-Out
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Master Event (`pc_events`) Modal (event_name, created_by, authorized_personnel JSONB emails) */}
      {isBudgetModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="budget-modal-title"
          className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSaveApprovedBudget}
            className={`w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl p-4 sm:p-6 space-y-4 ${surfaceCard}`}
          >
            <div className="flex items-center gap-2.5 text-[#00B4D8]">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <h3
                id="budget-modal-title"
                className="text-base font-bold font-display"
              >
                Buat Event Baru (Master pc_events)
              </h3>
            </div>

            <p className="text-xs text-slate-300">
              Tetapkan <strong>Nama Event (event_name)</strong> dan pilih
              beberapa personel Futari untuk ditambahkan ke array{' '}
              <code>authorized_personnel</code> (JSONB array of emails). Pembuat
              event (<code>created_by</code>:{' '}
              <strong className="text-[#00B4D8]">{currentUser.email}</strong>)
              otomatis terdaftar.
            </p>

            {/* Nama Event Input */}
            <div>
              <label
                htmlFor="budget-event-name-input"
                className="block text-xs font-semibold text-[#00B4D8] mb-1.5"
              >
                Nama Event (event_name)
              </label>
              <input
                id="budget-event-name-input"
                data-testid="budget-event-name-input"
                type="text"
                required
                value={budgetEventNameInput}
                onChange={(e) => setBudgetEventNameInput(e.target.value)}
                placeholder="Contoh: Telkomsel NextGen Brand Activation JKT"
                className="w-full px-3 py-2 rounded-lg text-xs bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00B4D8]"
              />
            </div>

            {/* Required Number Input for Total Dana Approval (IDR) (`approved_budget`) */}
            <div>
              <label
                htmlFor="approved-budget-input"
                className="block text-xs font-semibold text-[#00B4D8] mb-1.5"
              >
                Total Dana Approval (IDR)
              </label>
              <input
                id="approved-budget-input"
                data-testid="approved-budget-input"
                type="number"
                required
                min={1}
                value={newBudgetAmount}
                onChange={(e) => setNewBudgetAmount(e.target.value)}
                placeholder="Contoh: 35000000"
                className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00B4D8]"
              />
            </div>

            {/* Authorized Personnel (Multi-Select Emails) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="budget-involved-pic-select"
                  className="block text-xs font-semibold text-[#00B4D8]"
                >
                  Pilih Personel Diotorisasi (authorized_personnel Emails)
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {budgetAuthorizedEmails.length} Email Dipilih
                </span>
              </div>

              <select
                id="budget-involved-pic-select"
                data-testid="budget-involved-pic-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    toggleAuthorizedEmailSelection(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg text-xs bg-slate-950 border border-slate-700 text-white mb-2"
              >
                <option value="">
                  + Pilih / Toggle Email Personel ke authorized_personnel...
                </option>
                {staffList.map((s) => {
                  const emailNorm = (s.email || '').trim().toLowerCase();
                  const isSelected = budgetAuthorizedEmails.includes(emailNorm);
                  return (
                    <option key={s.staffId} value={emailNorm}>
                      {isSelected ? '✓ ' : ''}
                      {s.name} ({s.email}) — {s.role}
                    </option>
                  );
                })}
              </select>

              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 rounded-lg border border-slate-800 bg-slate-950">
                {budgetAuthorizedEmails.map((em) => {
                  const member = staffList.find(
                    (s) => (s.email || '').trim().toLowerCase() === em
                  );
                  return (
                    <button
                      key={em}
                      type="button"
                      onClick={() => toggleAuthorizedEmailSelection(em)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-[#0277BD]/30 text-[#00B4D8] border border-[#00B4D8]/40 hover:bg-rose-500/20 hover:text-rose-300"
                    >
                      <Users className="w-3 h-3" />
                      <span>
                        {member ? `${member.name} (${em})` : em}
                      </span>
                      <span>×</span>
                    </button>
                  );
                })}
              </div>
              {budgetModalError && (
                <p className="text-xs text-rose-400 mt-1.5">{budgetModalError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingPcEvent}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 disabled:opacity-50"
              >
                {isSubmittingPcEvent
                  ? 'Menyimpan ke pc_events...'
                  : 'Simpan Event & Authorized Personnel'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
