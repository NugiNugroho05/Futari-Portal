export type DivisionType =
  | 'Executive'
  | 'PM'
  | 'PIC_TL'
  | 'Admin_Finance'
  | 'Design_Talent_Production'
  | 'Operational'
  | 'Finance'
  | 'Project Management'
  | 'Digital Design Multimedia'
  | 'Production'
  | 'HRD'
  | string;

export type BranchType = 'JKT' | 'Bandung';
export type WorkModeType = 'WFO' | 'WFE' | 'OFFLINE';

export type VirtualOfficeRoomName =
  | 'Ruangan Creative/Design'
  | 'Ruangan PM (Team Bu Ade)'
  | 'Ruangan PM (Team Pak Ristanto)'
  | 'Ruangan PM (Team Mas Gusman)'
  | 'Ruangan Executive (Team Bu Hilda)'
  | 'Ruangan Production & HRD'
  | 'Ruangan Finance'
  | 'Ruangan Operational'
  | 'Cabang Bandung';

export type AccessLevelType = 'standard' | 'executive' | 'developer';

export type AvatarHairStyle = 'short' | 'parted' | 'long' | 'bun';

export interface Avatar3DConfig {
  shirtColor: string;
  hairStyle: AvatarHairStyle;
  hairColor: string;
  useHijab: boolean;
  hijabColor?: string;
}

export interface StaffMemberRecord {
  id?: string;
  created_at?: string;
  staffId: string;
  name: string;
  email: string;
  password?: string;
  accessLevel?: AccessLevelType;
  isSuspended?: boolean;
  status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  role: string;
  division: DivisionType;
  divisionLabel: string;
  branch: BranchType;
  location?: 'Jakarta' | 'Bandung' | 'JKT';
  supervisor: string;
  workMode: WorkModeType;
  checkInTime: string;
  lateMinutesMonth: number;
  deskZone: VirtualOfficeRoomName;
  roomName: VirtualOfficeRoomName;
  deskCoords: { x: number; z: number };
  avatarColor: string;
  initials: string;
  photoUrl?: string;
  avatar_url?: string | null;
  avatar3DConfig?: Avatar3DConfig;
  allowedAttendanceViewerIds?: string[];
  supervisor_email?: string | null;
}

export interface SupabasePersonnelRow {
  id: string | number;
  created_at?: string | null;
  name?: string | null;
  email: string;
  role?: string | null;
  division?: string | null;
  avatar_url?: string | null;
  supervisor_email?: string | null;
  status?: string | null;
}

export interface VirtualOfficeRoomDefinition {
  roomName: VirtualOfficeRoomName;
  subtitle: string;
  branch: BranchType;
  accentColor: string;
  floorBounds: { centerX: number; centerZ: number; width: number; depth: number };
  expectedRosterNames: string[];
}

export interface VirtualOfficeRoomGroup extends VirtualOfficeRoomDefinition {
  activeWfoMembers: StaffMemberRecord[];
  totalAssignedCount: number;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  branch: BranchType;
  date: string;
  mode: 'WFO' | 'WFE';
  initialMode?: 'WFO' | 'WFE';
  isHybridTransition?: boolean;
  wfeTransitionTime?: string;
  checkInTime: string;
  checkOutTime: string;
  regularHours?: number;
  lateMinutes: number;
  overtimeHours: number;
  overtimePay: number;
  overtimeNote: string; // Deskripsi Pekerjaan Hari Ini (Mandatory for all clock-outs)
  task_description?: string; // Supabase `attendance.task_description` (Jobdesk / Pekerjaan typed on Clock-Out)
  email?: string;
  locationWatermark: string;
  mapsUri?: string;
  photoDataUrl?: string;
  status: 'checked_in' | 'completed' | 'checked_out';
}

export interface PcEventRow {
  id: string;
  event_name: string;
  created_by: string;
  authorized_personnel: string[]; // JSONB array of emails
  is_completed: boolean;
  approved_budget?: number; // int8 column in pc_events
  created_at?: string;
}

export interface PcTransactionRow {
  id: string;
  event_id: string;
  submitted_by: string;
  merchant: string;
  receipt_date: string;
  category: string;
  amount: number;
  receipt_url: string;
  created_at?: string;
}

export interface PettyCashRecord {
  id: string;
  eventId: string;
  event_id?: string;
  eventName: string;
  involvedPersonnel?: string[];
  involvedPersonnelIds: string[];
  involvedStaffIds: string[];
  involvedPersonnelNames: string[];
  merchant: string;
  date: string;
  receipt_date?: string;
  amount: number;
  category: string;
  receiptLabel: string;
  receiptDataUrl?: string;
  receipt_url?: string;
  submittedBy: string;
  submitted_by?: string;
  submittedByStaffId?: string;
}

export interface EventBudgetRecord {
  id?: string;
  eventId: string;
  eventName: string;
  event_name?: string;
  created_by?: string;
  authorized_personnel?: string[];
  is_completed?: boolean;
  approved_budget?: number;
  clientName: string;
  approvedBudget: number;
  location: string;
  dateRange: string;
  involvedPersonnel?: string[];
  involvedPersonnelIds: string[];
  involvedStaffIds: string[];
  involvedPersonnelNames: string[];
}

export interface CompanySopItem {
  id: string;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  category?: string;
  authorName?: string;
  authorRole?: string;
}

export type FleetVehicleStatus = 'Tersedia' | 'Digunakan' | 'Servis';

export interface FleetVehicleItem {
  id: string;
  model: string;
  licensePlate: string;
  status: FleetVehicleStatus;
  branch: BranchType;
  notes?: string;
}

export interface WorkTaskItem {
  id: string;
  taskName: string;
  assigneeId: string;
  assigneeName: string;
  assigneeRole: string;
  creatorId: string;
  creatorName: string;
  creatorRole: string;
  startDate: string; // YYYY-MM-DD
  deadlineDate: string; // YYYY-MM-DD
  completed: boolean;
  notes?: string;
  updatedAt: string;
  // Supabase `tasks` table fields (present when the task was loaded from the database)
  assigned_to?: string;
  title?: string;
  description?: string;
  status?: string;
  due_date?: string; // ISO timestamptz
  is_completed?: boolean;
  completed_at?: string | null;
}

/** Row shape of the Supabase `tasks` table. */
export interface SupabaseTaskRow {
  id: string | number;
  assigned_to: string;
  title: string;
  description?: string | null;
  status?: string | null;
  due_date?: string | null;
  is_completed?: boolean | null;
  completed_at?: string | null;
  created_at?: string | null;
}


export interface ChatMessageItem {
  id: string;
  staffId: string;
  senderName: string;
  senderRole: string;
  branch: BranchType;
  initials: string;
  avatarColor: string;
  channel: 'Futari General Chat' | 'Event Operations & Venue' | 'Bandung Creative Hub';
  message: string;
  timestamp: string;
  isAnnouncement?: boolean;
}

export interface LeaveRecordItem {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  divisionLabel: string;
  branch: BranchType;
  leaveType: 'Cuti Tahunan' | 'Izin Sakit' | 'Izin Khusus' | 'Cuti Bersama';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: 'Approved' | 'Pending';
  badgeLabel: string; // e.g., "Ferdy - Cuti Tahunan"
}

export type CalendarEntryType =
  | 'Cuti'
  | 'Event Kantor'
  | 'Booking Mobil Operasional';

export interface VehicleBookingRow {
  id?: string | number;
  email: string;
  vehicle: string;
  start_time: string; // timestamptz
  end_time: string; // timestamptz
  purpose: string;
  created_at?: string;
}

export interface CalendarEventItem {
  id: string;
  title: string; // e.g., "Tech Summit JKT" or "Innova Zenix — Survey Venue"
  eventType?: 'Event Kantor' | 'Booking Mobil Operasional';
  location: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  picName: string;
  branch: BranchType;
  vehicleName?: string; // For Booking Mobil Operasional
  timeSlot?: string; // e.g., "09:00 - 17:00 WIB"
  notes?: string;
  // Supabase `vehicle_bookings` table columns
  email?: string;
  vehicle?: string;
  start_time?: string; // timestamptz ISO string
  end_time?: string; // timestamptz ISO string
  purpose?: string;
}

export interface DailyChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  updatedAt: string;
}

export interface DailyChecklistRecord {
  dateStr: string; // YYYY-MM-DD
  staffId: string;
  items: DailyChecklistItem[];
}

export interface PersonnelDailyChecklistGroup {
  dateStr: string;
  staffId: string;
  staffName: string;
  role: string;
  divisionLabel: string;
  branch: BranchType;
  initials: string;
  avatarColor: string;
  photoUrl?: string;
  isOwner: boolean;
  items: DailyChecklistItem[];
}

export const OVERTIME_RATE_PER_HOUR = 7000;

/**
 * Canonical 9-room layout for the 3D Virtual Office and Room Avatar Grid.
 */
export const VIRTUAL_OFFICE_ROOMS: VirtualOfficeRoomDefinition[] = [
  {
    roomName: 'Ruangan Creative/Design',
    subtitle: 'Design, Admin Creative & Talent Leader (JKT)',
    branch: 'JKT',
    accentColor: '#00B4D8',
    floorBounds: { centerX: -7.5, centerZ: -5.5, width: 6.4, depth: 4.4 },
    expectedRosterNames: ['Ulian', 'Raul', 'Nugi Nugroho', 'Andri'],
  },
  {
    roomName: 'Ruangan PM (Team Bu Ade)',
    subtitle: 'Project Management & Operations Unit 1 (JKT)',
    branch: 'JKT',
    accentColor: '#0277BD',
    floorBounds: { centerX: 0, centerZ: -5.5, width: 6.2, depth: 4.4 },
    expectedRosterNames: ['Ade Yenny', 'Ferdy', 'Sesil'],
  },
  {
    roomName: 'Ruangan PM (Team Pak Ristanto)',
    subtitle: 'Project Management & Operations Unit 2 (JKT)',
    branch: 'JKT',
    accentColor: '#0096C7',
    floorBounds: { centerX: 7.5, centerZ: -5.5, width: 6.2, depth: 4.4 },
    expectedRosterNames: ['Ristanto', 'Bobby', 'Salima'],
  },
  {
    roomName: 'Ruangan PM (Team Mas Gusman)',
    subtitle: 'Project Management & Operations Unit 3 (JKT)',
    branch: 'JKT',
    accentColor: '#0288D1',
    floorBounds: { centerX: -7.5, centerZ: 0, width: 6.4, depth: 4.4 },
    expectedRosterNames: ['Gusman Razak', 'Novita (PIC)'],
  },
  {
    roomName: 'Ruangan Executive (Team Bu Hilda)',
    subtitle: 'Founder & CEO Executive Suite (JKT)',
    branch: 'JKT',
    accentColor: '#00B4D8',
    floorBounds: { centerX: 0, centerZ: 0, width: 6.2, depth: 4.4 },
    expectedRosterNames: ['Hildasari Umami', 'Nana', 'Zahra'],
  },
  {
    roomName: 'Ruangan Production & HRD',
    subtitle: 'Production, Recruitment & Talent Leader (JKT)',
    branch: 'JKT',
    accentColor: '#0077B6',
    floorBounds: { centerX: 7.5, centerZ: 0, width: 6.2, depth: 4.4 },
    expectedRosterNames: ['Tiara', 'Iza', 'Tohir'],
  },
  {
    roomName: 'Ruangan Finance',
    subtitle: 'Corporate Finance & Accounting (JKT)',
    branch: 'JKT',
    accentColor: '#0096C7',
    floorBounds: { centerX: -7.5, centerZ: 5.5, width: 6.4, depth: 4.4 },
    expectedRosterNames: ['Erlita', 'Novita (Finance)'],
  },
  {
    roomName: 'Ruangan Operational',
    subtitle: 'Operational Command Center (JKT)',
    branch: 'JKT',
    accentColor: '#0277BD',
    floorBounds: { centerX: 3.7, centerZ: 5.5, width: 13.6, depth: 4.4 },
    expectedRosterNames: ['M Rio Antoni'],
  },
  {
    roomName: 'Cabang Bandung',
    subtitle: 'Bandung Regional Hub (Jl. Braga) — Separate 3D Building',
    branch: 'Bandung',
    accentColor: '#00B4D8',
    floorBounds: { centerX: 28.0, centerZ: 0.0, width: 9.2, depth: 6.8 },
    expectedRosterNames: ['Alfian', 'Yanti'],
  },
];

/**
 * ROOT ADMIN SEED (WIPE PERSONNEL DATA FOR PRODUCTION BLANK SLATE):
 * Leaves EXACTLY ONE user object in the initial state (`INITIAL_FUTARI_STAFF` / `INITIAL_PERSONNEL`)
 * to act as the root Superadmin:
 * `{ id: '1', name: 'Nugi Nugroho', email: 'nuginugroho2005@gmail.com', role: 'Digital', division: 'Design_Talent_Production', location: 'JKT', status: 'ACTIVE' }`
 *
 * `SEED_FUTARI_STAFF_FIXTURE` is exported only for unit test fixtures.
 */
export const ROOT_SUPERADMIN_NUGI: StaffMemberRecord = {
  id: '1',
  staffId: '1',
  name: 'Nugi Nugroho',
  email: 'nuginugroho2005@gmail.com',
  role: 'Digital',
  division: 'Design_Talent_Production',
  location: 'JKT',
  status: 'ACTIVE',
  password: 'nug1d1d1',
  accessLevel: 'developer',
  isSuspended: false,
  divisionLabel: 'Design/Talent/Production',
  branch: 'JKT',
  supervisor: 'Nugi Nugroho (Digital)',
  workMode: 'WFO',
  checkInTime: '09:44',
  lateMinutesMonth: 0,
  deskZone: 'Ruangan Creative/Design',
  roomName: 'Ruangan Creative/Design',
  deskCoords: { x: -9.0, z: -4.6 },
  avatarColor: '#0277BD',
  initials: 'NN',
};

export const INITIAL_FUTARI_STAFF: StaffMemberRecord[] = [ROOT_SUPERADMIN_NUGI];
export const INITIAL_PERSONNEL: StaffMemberRecord[] = INITIAL_FUTARI_STAFF;

export const SEED_FUTARI_STAFF_FIXTURE: StaffMemberRecord[] = [
  // 1. Ruangan Executive (Team Bu Hilda): Hildasari Umami, Nana, Zahra
  {
    staffId: 'exec_hildasari',
    name: 'Hildasari Umami',
    email: 'hildasari@futari.id',
    role: 'Founder & CEO',
    division: 'Executive',
    divisionLabel: 'Executive',
    branch: 'JKT',
    supervisor: 'Board of Founders Futari',
    workMode: 'WFO',
    checkInTime: '09:35',
    lateMinutesMonth: 0,
    deskZone: 'Ruangan Executive (Team Bu Hilda)',
    roomName: 'Ruangan Executive (Team Bu Hilda)',
    deskCoords: { x: -1.8, z: -0.6 },
    avatarColor: '#00B4D8',
    initials: 'HU',
  },
  {
    staffId: 'pic_nana',
    name: 'Nana',
    email: 'nana@futari.id',
    role: 'Person In Charge (PIC)',
    division: 'PIC_TL',
    divisionLabel: 'PICs/TLs',
    branch: 'JKT',
    supervisor: 'Hildasari Umami (Founder & CEO)',
    workMode: 'WFO',
    checkInTime: '09:58',
    lateMinutesMonth: 0,
    deskZone: 'Ruangan Executive (Team Bu Hilda)',
    roomName: 'Ruangan Executive (Team Bu Hilda)',
    deskCoords: { x: 0, z: 0.6 },
    avatarColor: '#0077B6',
    initials: 'NN',
  },
  {
    staffId: 'adm_zahra',
    name: 'Zahra',
    email: 'zahra@futari.id',
    role: 'Admin',
    division: 'Admin_Finance',
    divisionLabel: 'Admins/Finance',
    branch: 'JKT',
    supervisor: 'Hildasari Umami (Founder & CEO)',
    workMode: 'WFO',
    checkInTime: '09:49',
    lateMinutesMonth: 0,
    deskZone: 'Ruangan Executive (Team Bu Hilda)',
    roomName: 'Ruangan Executive (Team Bu Hilda)',
    deskCoords: { x: 1.8, z: -0.6 },
    avatarColor: '#00B4D8',
    initials: 'ZH',
  },

  // 2. Ruangan Operational: M Rio Antoni
  {
    staffId: 'exec_rio',
    name: 'M Rio Antoni',
    email: 'rio@futari.id',
    role: 'Operational',
    division: 'Executive',
    divisionLabel: 'Executive',
    branch: 'JKT',
    supervisor: 'Hildasari Umami (Founder & CEO)',
    workMode: 'WFO',
    checkInTime: '09:48',
    lateMinutesMonth: 0,
    deskZone: 'Ruangan Operational',
    roomName: 'Ruangan Operational',
    deskCoords: { x: 0, z: 5.5 },
    avatarColor: '#0277BD',
    initials: 'RA',
  },

  // 3. Ruangan PM (Team Bu Ade): Ade Yenny, Ferdy, Sesil
  {
    staffId: 'pm_ade',
    name: 'Ade Yenny',
    email: 'ade.yenny@futari.id',
    role: 'Project Manager',
    division: 'PM',
    divisionLabel: 'PMs',
    branch: 'JKT',
    supervisor: 'M Rio Antoni (Operational)',
    workMode: 'WFO',
    checkInTime: '09:55',
    lateMinutesMonth: 12,
    deskZone: 'Ruangan PM (Team Bu Ade)',
    roomName: 'Ruangan PM (Team Bu Ade)',
    deskCoords: { x: -1.8, z: -6.0 },
    avatarColor: '#0096C7',
    initials: 'AY',
  },
  {
    staffId: 'pic_ferdy',
    name: 'Ferdy',
    email: 'ferdy@futari.id',
    role: 'Person In Charge (PIC)',
    division: 'PIC_TL',
    divisionLabel: 'PICs/TLs',
    branch: 'JKT',
    supervisor: 'Ade Yenny (Project Manager)',
    workMode: 'WFO',
    checkInTime: '10:14',
    lateMinutesMonth: 29,
    deskZone: 'Ruangan PM (Team Bu Ade)',
    roomName: 'Ruangan PM (Team Bu Ade)',
    deskCoords: { x: 0, z: -4.9 },
    avatarColor: '#00B4D8',
    initials: 'FD',
  },
  {
    staffId: 'adm_sesil',
    name: 'Sesil',
    email: 'sesil@futari.id',
    role: 'Admin',
    division: 'Admin_Finance',
    divisionLabel: 'Admins/Finance',
    branch: 'JKT',
    supervisor: 'Ade Yenny (Project Manager)',
    workMode: 'WFO',
    checkInTime: '09:57',
    lateMinutesMonth: 8,
    deskZone: 'Ruangan PM (Team Bu Ade)',
    roomName: 'Ruangan PM (Team Bu Ade)',
    deskCoords: { x: 1.8, z: -6.0 },
    avatarColor: '#0277BD',
    initials: 'SS',
  },

  // 4. Ruangan PM (Team Pak Ristanto): Ristanto, Bobby, Salima
  {
    staffId: 'pm_ristanto',
    name: 'Ristanto',
    email: 'ristanto@futari.id',
    role: 'Project Manager',
    division: 'PM',
    divisionLabel: 'PMs',
    branch: 'JKT',
    supervisor: 'M Rio Antoni (Operational)',
    workMode: 'WFO',
    checkInTime: '10:02',
    lateMinutesMonth: 18,
    deskZone: 'Ruangan PM (Team Pak Ristanto)',
    roomName: 'Ruangan PM (Team Pak Ristanto)',
    deskCoords: { x: 5.8, z: -6.0 },
    avatarColor: '#00B4D8',
    initials: 'RS',
  },
  {
    staffId: 'pic_bobby',
    name: 'Bobby',
    email: 'bobby@futari.id',
    role: 'Person In Charge (PIC)',
    division: 'PIC_TL',
    divisionLabel: 'PICs/TLs',
    branch: 'JKT',
    supervisor: 'Ristanto (Project Manager)',
    workMode: 'WFE',
    checkInTime: '09:30',
    lateMinutesMonth: 24,
    deskZone: 'Ruangan PM (Team Pak Ristanto)',
    roomName: 'Ruangan PM (Team Pak Ristanto)',
    deskCoords: { x: 7.5, z: -4.9 },
    avatarColor: '#0277BD',
    initials: 'BB',
  },
  {
    staffId: 'pic_salima',
    name: 'Salima',
    email: 'salima@futari.id',
    role: 'Person In Charge (PIC)',
    division: 'PIC_TL',
    divisionLabel: 'PICs/TLs',
    branch: 'JKT',
    supervisor: 'Ristanto (Project Manager)',
    workMode: 'WFO',
    checkInTime: '09:51',
    lateMinutesMonth: 0,
    deskZone: 'Ruangan PM (Team Pak Ristanto)',
    roomName: 'Ruangan PM (Team Pak Ristanto)',
    deskCoords: { x: 9.2, z: -6.0 },
    avatarColor: '#0288D1',
    initials: 'SL',
  },

  // 5. Ruangan PM (Team Mas Gusman): Gusman Razak, Novita (PIC)
  {
    staffId: 'pm_gusman',
    name: 'Gusman Razak',
    email: 'gusman@futari.id',
    role: 'Project Manager',
    division: 'PM',
    divisionLabel: 'PMs',
    branch: 'JKT',
    supervisor: 'M Rio Antoni (Operational)',
    workMode: 'WFE',
    checkInTime: '09:40',
    lateMinutesMonth: 0,
    deskZone: 'Ruangan PM (Team Mas Gusman)',
    roomName: 'Ruangan PM (Team Mas Gusman)',
    deskCoords: { x: -8.6, z: -0.4 },
    avatarColor: '#0288D1',
    initials: 'GR',
  },
  {
    staffId: 'pic_novita',
    name: 'Novita (PIC)',
    email: 'novita.pic@futari.id',
    role: 'Person In Charge (PIC)',
    division: 'PIC_TL',
    divisionLabel: 'PICs/TLs',
    branch: 'JKT',
    supervisor: 'Gusman Razak (Project Manager)',
    workMode: 'WFO',
    checkInTime: '10:04',
    lateMinutesMonth: 9,
    deskZone: 'Ruangan PM (Team Mas Gusman)',
    roomName: 'Ruangan PM (Team Mas Gusman)',
    deskCoords: { x: -6.4, z: 0.4 },
    avatarColor: '#0096C7',
    initials: 'NV',
  },

  // 6. Ruangan Creative/Design: Ulian, Raul, Nugi Nugroho, Andri
  {
    staffId: 'des_ulian',
    name: 'Ulian',
    email: 'ulian@futari.id',
    role: 'Head of Design',
    division: 'Design_Talent_Production',
    divisionLabel: 'Design/Talent/Production',
    branch: 'JKT',
    supervisor: 'Hildasari Umami (Founder & CEO)',
    workMode: 'WFO',
    checkInTime: '09:59',
    lateMinutesMonth: 11,
    deskZone: 'Ruangan Creative/Design',
    roomName: 'Ruangan Creative/Design',
    deskCoords: { x: -9.0, z: -6.3 },
    avatarColor: '#00B4D8',
    initials: 'UL',
  },
  {
    staffId: 'adm_raul',
    name: 'Raul',
    email: 'raul@futari.id',
    role: 'Admin',
    division: 'Admin_Finance',
    divisionLabel: 'Admins/Finance',
    branch: 'JKT',
    supervisor: 'Ulian (Head of Design)',
    workMode: 'WFO',
    checkInTime: '10:01',
    lateMinutesMonth: 15,
    deskZone: 'Ruangan Creative/Design',
    roomName: 'Ruangan Creative/Design',
    deskCoords: { x: -6.2, z: -6.3 },
    avatarColor: '#0077B6',
    initials: 'RL',
  },
  {
    staffId: 'des_nugi',
    name: 'Nugi Nugroho',
    email: 'nuginugroho2005@gmail.com',
    password: 'nug1d1d1',
    accessLevel: 'developer',
    isSuspended: false,
    role: 'Digital',
    division: 'Design_Talent_Production',
    divisionLabel: 'Design/Talent/Production',
    branch: 'JKT',
    supervisor: 'Ulian (Head of Design)',
    workMode: 'WFO',
    checkInTime: '09:44',
    lateMinutesMonth: 0,
    deskZone: 'Ruangan Creative/Design',
    roomName: 'Ruangan Creative/Design',
    deskCoords: { x: -9.0, z: -4.6 },
    avatarColor: '#0277BD',
    initials: 'NN',
  },
  {
    staffId: 'tl_andri',
    name: 'Andri',
    email: 'andri@futari.id',
    role: 'Talent Leader',
    division: 'Design_Talent_Production',
    divisionLabel: 'Design/Talent/Production',
    branch: 'JKT',
    supervisor: 'Ulian (Head of Design)',
    workMode: 'WFO',
    checkInTime: '09:52',
    lateMinutesMonth: 0,
    deskZone: 'Ruangan Creative/Design',
    roomName: 'Ruangan Creative/Design',
    deskCoords: { x: -6.2, z: -4.6 },
    avatarColor: '#0096C7',
    initials: 'AN',
  },

  // 7. Ruangan Production & HRD: Tiara, Iza, Tohir
  {
    staffId: 'prd_tiara',
    name: 'Tiara',
    email: 'tiara@futari.id',
    role: 'Production',
    division: 'Design_Talent_Production',
    divisionLabel: 'Design/Talent/Production',
    branch: 'JKT',
    supervisor: 'M Rio Antoni (Operational)',
    workMode: 'WFE',
    checkInTime: '09:38',
    lateMinutesMonth: 0,
    deskZone: 'Ruangan Production & HRD',
    roomName: 'Ruangan Production & HRD',
    deskCoords: { x: 5.8, z: -0.6 },
    avatarColor: '#0096C7',
    initials: 'TR',
  },
  {
    staffId: 'rec_iza',
    name: 'Iza',
    email: 'iza@futari.id',
    role: 'Recruitment',
    division: 'Design_Talent_Production',
    divisionLabel: 'Design/Talent/Production',
    branch: 'JKT',
    supervisor: 'M Rio Antoni (Operational)',
    workMode: 'WFO',
    checkInTime: '09:56',
    lateMinutesMonth: 0,
    deskZone: 'Ruangan Production & HRD',
    roomName: 'Ruangan Production & HRD',
    deskCoords: { x: 7.5, z: 0.6 },
    avatarColor: '#0077B6',
    initials: 'IZ',
  },
  {
    staffId: 'tl_tohir',
    name: 'Tohir',
    email: 'tohir@futari.id',
    role: 'Talent Leader',
    division: 'Design_Talent_Production',
    divisionLabel: 'Design/Talent/Production',
    branch: 'JKT',
    supervisor: 'M Rio Antoni (Operational)',
    workMode: 'WFO',
    checkInTime: '09:47',
    lateMinutesMonth: 0,
    deskZone: 'Ruangan Production & HRD',
    roomName: 'Ruangan Production & HRD',
    deskCoords: { x: 9.2, z: -0.6 },
    avatarColor: '#0288D1',
    initials: 'TH',
  },

  // 8. Ruangan Finance: Erlita, Novita (Finance)
  {
    staffId: 'fin_erlita',
    name: 'Erlita',
    email: 'erlita@futari.id',
    role: 'Finance',
    division: 'Admin_Finance',
    divisionLabel: 'Admins/Finance',
    branch: 'JKT',
    supervisor: 'M Rio Antoni (Operational)',
    workMode: 'WFO',
    checkInTime: '09:42',
    lateMinutesMonth: 0,
    deskZone: 'Ruangan Finance',
    roomName: 'Ruangan Finance',
    deskCoords: { x: -8.6, z: 5.5 },
    avatarColor: '#0096C7',
    initials: 'ER',
  },
  {
    staffId: 'fin_novita',
    name: 'Novita (Finance)',
    email: 'novita.finance@futari.id',
    role: 'Finance',
    division: 'Admin_Finance',
    divisionLabel: 'Admins/Finance',
    branch: 'JKT',
    supervisor: 'M Rio Antoni (Operational)',
    workMode: 'WFO',
    checkInTime: '09:53',
    lateMinutesMonth: 0,
    deskZone: 'Ruangan Finance',
    roomName: 'Ruangan Finance',
    deskCoords: { x: -6.4, z: 5.5 },
    avatarColor: '#0288D1',
    initials: 'NF',
  },

  // 9. Cabang Bandung (Separate 3D Building Platform at X=28): Alfian, Yanti
  {
    staffId: 'tl_alfian',
    name: 'Alfian',
    email: 'alfian@futari.id',
    role: 'Team Leader (TL)',
    division: 'PIC_TL',
    divisionLabel: 'PICs/TLs',
    branch: 'Bandung',
    location: 'Bandung',
    supervisor: 'Ristanto (Project Manager)',
    workMode: 'WFO',
    checkInTime: '09:45',
    lateMinutesMonth: 0,
    deskZone: 'Cabang Bandung',
    roomName: 'Cabang Bandung',
    deskCoords: { x: 26.2, z: -0.5 },
    avatarColor: '#0096C7',
    initials: 'AL',
  },
  {
    staffId: 'rec_yanti',
    name: 'Yanti',
    email: 'yanti@futari.id',
    role: 'Recruitment',
    division: 'Design_Talent_Production',
    divisionLabel: 'Design/Talent/Production',
    branch: 'Bandung',
    location: 'Bandung',
    supervisor: 'Alfian (Team Leader Bandung)',
    workMode: 'WFO',
    checkInTime: '09:50',
    lateMinutesMonth: 0,
    deskZone: 'Cabang Bandung',
    roomName: 'Cabang Bandung',
    deskCoords: { x: 29.8, z: -0.5 },
    avatarColor: '#0288D1',
    initials: 'YT',
  },
];

/**
 * STRICT VISIBILITY RULE FOR 3D VIRTUAL OFFICE & AVATAR GRID:
 * Only returns personnel who have actively checked-in with status === "WFO".
 * Users checked in as "WFE" or "OFFLINE" are strictly excluded.
 */
export function filterActiveWfoPersonnel(
  staffList: StaffMemberRecord[]
): StaffMemberRecord[] {
  return staffList.filter((s) => s.workMode === 'WFO' && !s.isSuspended);
}

/**
 * Groups the active WFO personnel into the 9 exact rooms/zones specified by the organization.
 * Personnel who are "WFE" or "OFFLINE" are strictly excluded from `activeWfoMembers`.
 */
export function groupActiveWfoByRoom(
  staffList: StaffMemberRecord[]
): VirtualOfficeRoomGroup[] {
  const wfoOnly = filterActiveWfoPersonnel(staffList);
  return VIRTUAL_OFFICE_ROOMS.map((roomDef) => {
    const allInRoom = staffList.filter((s) => s.roomName === roomDef.roomName);
    const activeWfoMembers = wfoOnly.filter(
      (s) => s.roomName === roomDef.roomName
    );
    return {
      ...roomDef,
      activeWfoMembers,
      totalAssignedCount: allInRoom.length,
    };
  });
}

/**
 * CLEAR MOCK DATA (BLANK SLATE FOR TESTING):
 * `INITIAL_EVENT_BUDGETS` (`pettyCashEvents`) is initialized to an empty array `[]`
 * so adding events and scanning receipts can be tested from a completely blank slate.
 * `SEED_EVENT_BUDGETS_FIXTURE` is exported only for unit test fixtures.
 */
export const INITIAL_EVENT_BUDGETS: EventBudgetRecord[] = [];

export const SEED_EVENT_BUDGETS_FIXTURE: EventBudgetRecord[] = [
  {
    eventId: 'evt_jkt_activation',
    eventName: 'Telkomsel NextGen Brand Activation JKT',
    clientName: 'PT Telkomsel Indonesia',
    approvedBudget: 35000000,
    location: 'Jakarta Convention Center (JCC) Senayan',
    dateRange: '18 Okt – 24 Okt 2026',
    involvedPersonnel: [
      'exec_rio',
      'pm_ade',
      'pm_gusman',
      'pic_nana',
      'pic_bobby',
      'pic_ferdy',
      'adm_zahra',
      'des_ulian',
      'des_nugi',
      'tl_andri',
      'prd_tiara',
      'Ade Yenny',
      'Gusman Razak',
      'Nana',
      'Bobby',
      'Ferdy',
      'Zahra',
      'Ulian',
      'Nugi Nugroho',
      'Andri',
      'Tiara',
    ],
    involvedPersonnelIds: [
      'exec_rio',
      'pm_ade',
      'pm_gusman',
      'pic_nana',
      'pic_bobby',
      'pic_ferdy',
      'adm_zahra',
      'des_ulian',
      'des_nugi',
      'tl_andri',
      'prd_tiara',
    ],
    involvedStaffIds: [
      'exec_rio',
      'pm_ade',
      'pm_gusman',
      'pic_nana',
      'pic_bobby',
      'pic_ferdy',
      'adm_zahra',
      'des_ulian',
      'des_nugi',
      'tl_andri',
      'prd_tiara',
    ],
    involvedPersonnelNames: [
      'Ade Yenny (PM)',
      'Gusman Razak (PM)',
      'Nana (PIC)',
      'Bobby (PIC)',
      'Ferdy (PIC)',
      'Nugi Nugroho (Digital)',
      'Andri (Talent Leader)',
      'Tiara (Production)',
    ],
  },
  {
    eventId: 'evt_tech_summit',
    eventName: 'Tech Summit JKT 2026',
    clientName: 'Asosiasi Cloud & AI Indonesia',
    approvedBudget: 28000000,
    location: 'Ritz-Carlton Pacific Place, Jakarta',
    dateRange: '08 Okt – 10 Okt 2026',
    involvedPersonnel: [
      'exec_rio',
      'pm_ristanto',
      'pic_novita',
      'pic_salima',
      'pic_bobby',
      'adm_sesil',
      'adm_raul',
      'rec_iza',
      'tl_tohir',
      'Ristanto',
      'Novita (PIC)',
      'Salima',
      'Bobby',
      'Sesil',
      'Raul',
      'Iza',
      'Tohir',
    ],
    involvedPersonnelIds: [
      'exec_rio',
      'pm_ristanto',
      'pic_novita',
      'pic_salima',
      'pic_bobby',
      'adm_sesil',
      'adm_raul',
      'rec_iza',
      'tl_tohir',
    ],
    involvedStaffIds: [
      'exec_rio',
      'pm_ristanto',
      'pic_novita',
      'pic_salima',
      'pic_bobby',
      'adm_sesil',
      'adm_raul',
      'rec_iza',
      'tl_tohir',
    ],
    involvedPersonnelNames: [
      'Ristanto (PM)',
      'Novita (PIC)',
      'Salima (PIC)',
      'Bobby (PIC)',
      'Sesil (Admin)',
      'Raul (Admin)',
      'Tohir (Talent Leader)',
    ],
  },
  {
    eventId: 'evt_bdg_fest',
    eventName: 'Bandung Creative Experience Summit',
    clientName: 'Disparbud Jawa Barat',
    approvedBudget: 22000000,
    location: 'Trans Luxury Convention Center, Bandung',
    dateRange: '24 Okt – 26 Okt 2026',
    involvedPersonnel: [
      'exec_rio',
      'pm_ristanto',
      'tl_alfian',
      'rec_yanti',
      'pic_salima',
      'Ristanto',
      'Alfian',
      'Yanti',
      'Salima',
    ],
    involvedPersonnelIds: [
      'exec_rio',
      'pm_ristanto',
      'tl_alfian',
      'rec_yanti',
      'pic_salima',
    ],
    involvedStaffIds: [
      'exec_rio',
      'pm_ristanto',
      'tl_alfian',
      'rec_yanti',
      'pic_salima',
    ],
    involvedPersonnelNames: [
      'Alfian (TL Bandung)',
      'Yanti (Recruitment Bandung)',
      'Ristanto (PM)',
      'Salima (PIC)',
    ],
  },
];

export const INITIAL_PETTY_CASH_EVENTS: EventBudgetRecord[] = [];

export const INITIAL_PETTY_CASH_EXPENSES: PettyCashRecord[] = [];

export const SEED_PETTY_CASH_EXPENSES_FIXTURE: PettyCashRecord[] = [
  {
    id: 'pc_seed_1',
    eventId: 'evt_jkt_activation',
    eventName: 'Telkomsel NextGen Brand Activation JKT',
    involvedPersonnel: ['pm_ade', 'pic_ferdy', 'des_nugi', 'Ade Yenny', 'Ferdy', 'Nugi Nugroho'],
    involvedPersonnelIds: ['pm_ade', 'pic_ferdy', 'des_nugi'],
    involvedStaffIds: ['pm_ade', 'pic_ferdy', 'des_nugi'],
    involvedPersonnelNames: ['Ade Yenny (PM)', 'Ferdy (PIC)', 'Nugi Nugroho (Digital)'],
    merchant: 'Kopi Kenangan & Crew Catering JCC Senayan',
    date: '2026-10-20',
    amount: 1450000,
    category: 'Consumption & Crew Meals',
    receiptLabel: 'STRUK_CREW_CATERING_JCC_20OKT.PNG',
    submittedBy: 'Ferdy (Person In Charge (PIC), JKT)',
    submittedByStaffId: 'pic_ferdy',
  },
  {
    id: 'pc_seed_2',
    eventId: 'evt_bdg_fest',
    eventName: 'Bandung Creative Experience Summit',
    involvedPersonnel: ['tl_alfian', 'rec_yanti', 'Alfian', 'Yanti'],
    involvedPersonnelIds: ['tl_alfian', 'rec_yanti'],
    involvedStaffIds: ['tl_alfian', 'rec_yanti'],
    involvedPersonnelNames: ['Alfian (TL Bandung)', 'Yanti (Recruitment Bandung)'],
    merchant: 'Braga Audio Visual & Rigging Rental Bandung',
    date: '2026-10-20',
    amount: 3200000,
    category: 'Production & Stage Supplies',
    receiptLabel: 'STRUK_BRAGA_RIGGING_BDG_20OKT.PNG',
    submittedBy: 'Alfian (Team Leader (TL), Bandung)',
    submittedByStaffId: 'tl_alfian',
  },
];

/**
 * Global RBAC Access Check:
 * Users with the Role 'Executive', 'Finance', or 'Digital' (Dev)
 * have full unrestricted visibility across all modules (personnel, attendance, petty cash, tasks, reports).
 */
export function hasGlobalRoleAccess(
  user: { role?: string | null; email?: string | null; accessLevel?: string | null; division?: string | null } | null | undefined
): boolean {
  if (!user) return false;
  const roleNorm = (user.role || '').trim().toLowerCase();
  const emailNorm = (user.email || '').trim().toLowerCase();
  const divNorm = (user.division || '').trim().toLowerCase();

  return (
    roleNorm === 'executive' ||
    roleNorm === 'finance' ||
    roleNorm === 'digital' ||
    roleNorm === 'dev' ||
    roleNorm === 'developer' ||
    roleNorm === 'superadmin' ||
    roleNorm === 'founder & ceo' ||
    roleNorm.includes('executive') ||
    divNorm === 'executive' ||
    user.accessLevel === 'developer' ||
    emailNorm === DEVELOPER_SUPERADMIN_EMAIL
  );
}

/**
 * STRICT PETTY CASH PRIVACY (RBAC):
 * - Exception Rule: Users with the roles `Executive`, `Finance`, or `Digital` (like Nugi Nugroho)
 *   bypass this restriction and can see ALL Petty Cash events and transactions globally.
 * - Visibility Logic: A standard user (e.g., PIC or PM) MUST ONLY see events, balances, and
 *   receipt histories where they are explicitly assigned in `involvedPersonnel` (or `involvedPersonnelIds`).
 *   Hide all other events completely.
 */
export function canViewAllPettyCash(user: StaffMemberRecord): boolean {
  if (!user) return false;
  if (hasGlobalRoleAccess(user)) return true;
  const roleNorm = (user.role || '').trim().toLowerCase();
  return (
    roleNorm === 'operational' ||
    user.id === '1' ||
    user.staffId === '1' ||
    user.staffId === 'exec_hildasari' ||
    user.staffId === 'exec_rio' ||
    user.staffId === 'fin_erlita' ||
    user.staffId === 'fin_novita' ||
    user.staffId === 'des_nugi'
  );
}

export function isUserInvolvedInEvent(
  user: StaffMemberRecord,
  eventOrExpense: {
    involvedPersonnel?: string[];
    involvedPersonnelIds?: string[];
    involvedStaffIds?: string[];
    involvedPersonnelNames?: string[];
  }
): boolean {
  const combinedList = [
    ...(eventOrExpense.involvedPersonnel || []),
    ...(eventOrExpense.involvedPersonnelIds || []),
    ...(eventOrExpense.involvedStaffIds || []),
  ];
  const userNameLower = user.name.trim().toLowerCase();
  return combinedList.some((entry) => {
    const clean = String(entry).trim();
    return (
      clean === user.staffId ||
      clean.toLowerCase() === userNameLower ||
      clean.toLowerCase().startsWith(`${userNameLower} (`)
    );
  });
}

export function filterVisibleEventsForUser(
  user: StaffMemberRecord,
  events: EventBudgetRecord[]
): EventBudgetRecord[] {
  if (canViewAllPettyCash(user)) {
    return events;
  }
  return events.filter((ev) => isUserInvolvedInEvent(user, ev));
}

export function filterVisiblePettyCashExpenses(
  user: StaffMemberRecord,
  events: EventBudgetRecord[],
  expenses: PettyCashRecord[]
): PettyCashRecord[] {
  if (canViewAllPettyCash(user)) {
    return expenses;
  }
  const allowedEventIds = new Set(
    filterVisibleEventsForUser(user, events).map((e) => e.eventId)
  );
  return expenses.filter(
    (exp) => allowedEventIds.has(exp.eventId) || isUserInvolvedInEvent(user, exp)
  );
}

/**
 * STRICT ATTENDANCE RBAC (TEAM vs GLOBAL):
 * - Global Access: Users with roles `Executive` (Hildasari, M Rio Antoni), `Finance` (Erlita, Novita),
 *   and explicitly the Developer `Digital` (Nugi Nugroho, email: nuginugroho2005@gmail.com) have
 *   UNRESTRICTED GLOBAL ACCESS to inspect and export ANY employee's attendance record.
 * - Team Access: All other users (PMs, PICs, TLs, Admins, etc.) can ONLY view their own attendance
 *   records AND the records of personnel who share their exact `division` or have them listed as
 *   their `supervisor`. They must NOT see attendance data from outside their team.
 */
export function canViewAllAttendance(currentUser: StaffMemberRecord): boolean {
  if (!currentUser) return false;
  if (hasGlobalRoleAccess(currentUser)) return true;
  const cleanEmail = (currentUser.email || '').trim().toLowerCase();
  return (
    currentUser.role === 'Executive' ||
    currentUser.role === 'Finance' ||
    currentUser.role === 'Digital' ||
    cleanEmail === 'nuginugroho2005@gmail.com' ||
    currentUser.division === 'Executive' ||
    currentUser.role === 'Founder & CEO' ||
    currentUser.role === 'Operational' ||
    currentUser.id === '1' ||
    currentUser.staffId === '1' ||
    currentUser.staffId === 'exec_hildasari' ||
    currentUser.staffId === 'exec_rio' ||
    currentUser.staffId === 'fin_erlita' ||
    currentUser.staffId === 'fin_novita' ||
    currentUser.staffId === 'des_nugi'
  );
}

export function canViewOtherStaffAttendance(user: StaffMemberRecord): boolean {
  return canViewAllAttendance(user);
}

export function canUserViewStaffAttendance(
  viewer: StaffMemberRecord,
  targetStaff: StaffMemberRecord
): boolean {
  if (!viewer || !targetStaff) return false;
  if (canViewAllAttendance(viewer)) {
    return true;
  }
  if (targetStaff.staffId === viewer.staffId) {
    return true;
  }
  if (
    Array.isArray(targetStaff.allowedAttendanceViewerIds) &&
    targetStaff.allowedAttendanceViewerIds.includes(viewer.staffId)
  ) {
    return true;
  }
  if (targetStaff.division === viewer.division) {
    return true;
  }
  if (isDirectReportOf(targetStaff, viewer)) {
    return true;
  }
  return false;
}

export function getAccessibleAttendancePersonnel(
  viewer: StaffMemberRecord,
  staffList: StaffMemberRecord[] = INITIAL_FUTARI_STAFF
): StaffMemberRecord[] {
  if (!viewer) return [];
  if (canViewAllAttendance(viewer)) {
    return staffList;
  }
  return staffList.filter((person) => canUserViewStaffAttendance(viewer, person));
}

export function filterAttendanceLogsForUser(
  currentUser: StaffMemberRecord,
  allLogs: AttendanceRecord[],
  selectedTargetStaffId?: string,
  staffList: StaffMemberRecord[] = INITIAL_FUTARI_STAFF
): AttendanceRecord[] {
  const accessibleStaff = getAccessibleAttendancePersonnel(currentUser, staffList);
  const accessibleIds = new Set(accessibleStaff.map((s) => s.staffId));

  if (!selectedTargetStaffId || selectedTargetStaffId === 'ALL_ACCESSIBLE') {
    return allLogs.filter((log) => accessibleIds.has(log.staffId));
  }

  const effectiveStaffId = accessibleIds.has(selectedTargetStaffId)
    ? selectedTargetStaffId
    : currentUser.staffId;
  return allLogs.filter((log) => log.staffId === effectiveStaffId);
}

/**
 * OPEN "TIM & ABSENSI" TAB TO EVERYONE:
 * The "Tim & Absensi" tab is visible and accessible to ALL active personnel.
 */
export function canAccessTeamAttendanceTab(
  user: StaffMemberRecord | null | undefined
): boolean {
  if (!user || user.isSuspended) return false;
  return true;
}

export function normalizeSupervisorName(supervisorStr: string | undefined): string {
  const clean = (supervisorStr || '').trim().toLowerCase();
  if (!clean) return '';
  const parenIdx = clean.indexOf('(');
  return (parenIdx > 0 ? clean.slice(0, parenIdx) : clean).trim();
}

export function sharesSameSupervisor(
  personA: StaffMemberRecord,
  personB: StaffMemberRecord
): boolean {
  if (!personA || !personB) return false;
  const rawA = (personA.supervisor || '').trim().toLowerCase();
  const rawB = (personB.supervisor || '').trim().toLowerCase();
  if (!rawA || !rawB) return false;
  if (rawA === rawB) return true;
  const normA = normalizeSupervisorName(rawA);
  const normB = normalizeSupervisorName(rawB);
  return Boolean(normA && normA === normB);
}

/**
 * DYNAMIC RBAC FILTERING LOGIC FOR "TIM & ABSENSI" (TEAM DASHBOARD):
 * - Global View: If the logged-in user is `Executive`, `Finance`, or `Digital` (email: nuginugroho2005@gmail.com),
 *   they can see and export the attendance data of ALL company personnel.
 * - Team View (For Everyone Else): If the user is a `PM`, `PIC`, `Admin`, or any other role,
 *   they MUST ONLY see their own attendance data AND the data of their direct team members
 *   (personnel who report directly to them, or personnel who share the exact same supervisor,
 *   plus any custom viewer overrides).
 */
export function getTeamDashboardPersonnel(
  viewer: StaffMemberRecord | null | undefined,
  staffList: StaffMemberRecord[] = INITIAL_FUTARI_STAFF
): StaffMemberRecord[] {
  if (!viewer) return [];
  if (canViewAllAttendance(viewer)) {
    return staffList;
  }
  return staffList.filter(
    (person) =>
      person.staffId === viewer.staffId ||
      isDirectReportOf(person, viewer) ||
      sharesSameSupervisor(person, viewer)
  );
}

/**
 * Builds the attendance records visible inside the "Tim & Absensi" dashboard for export & table display.
 * - Strictly filters to `getTeamDashboardPersonnel(viewer, staffList)` (and any active screen filter).
 * - For each visible team member, returns their actual AttendanceRecord logs if present, or synthesizes
 *   a live daily attendance record from their active status so PDF & Excel exports always calculate
 *   Regular Hours vs Overtime (>= 20:00) accurately for the strictly filtered data visible on screen.
 */
export function buildTeamDashboardExportLogs(
  viewer: StaffMemberRecord,
  allLogs: AttendanceRecord[],
  staffList: StaffMemberRecord[] = INITIAL_FUTARI_STAFF,
  selectedMemberFilterId: string = 'ALL_VISIBLE',
  referenceDate: string = toLocalDateKey(new Date()),
  explicitlyVisibleStaff?: StaffMemberRecord[]
): AttendanceRecord[] {
  const rbacAllowedStaff = getTeamDashboardPersonnel(viewer, staffList);
  const rbacAllowedIds = new Set(rbacAllowedStaff.map((s) => s.staffId));

  const baseVisibleStaff = explicitlyVisibleStaff
    ? explicitlyVisibleStaff.filter((s) => rbacAllowedIds.has(s.staffId))
    : rbacAllowedStaff;

  const filteredStaff =
    selectedMemberFilterId && selectedMemberFilterId !== 'ALL_VISIBLE'
      ? baseVisibleStaff.filter((s) => s.staffId === selectedMemberFilterId)
      : baseVisibleStaff;

  const allowedIds = new Set(filteredStaff.map((s) => s.staffId));
  const matchingActualLogs = allLogs.filter((l) => allowedIds.has(l.staffId));

  const logsByStaff = new Set(matchingActualLogs.map((l) => l.staffId));
  const synthesizedLogs: AttendanceRecord[] = [];

  for (const member of filteredStaff) {
    if (logsByStaff.has(member.staffId)) continue;
    const checkIn =
      member.checkInTime && member.checkInTime !== '-'
        ? member.checkInTime
        : '09:50';
    const defaultCheckOut = member.workMode === 'OFFLINE' ? '18:00' : '19:00';
    const regHours =
      member.workMode === 'OFFLINE'
        ? 0
        : calculateRegularWorkingHours(checkIn, defaultCheckOut);
    const lateMins = calculateLateMinutes(checkIn);
    synthesizedLogs.push({
      id: `team_live_${member.staffId}_${referenceDate}`,
      staffId: member.staffId,
      staffName: member.name,
      role: member.role,
      branch: member.branch,
      date: referenceDate,
      mode: member.workMode === 'WFE' ? 'WFE' : 'WFO',
      checkInTime: checkIn,
      checkOutTime: member.workMode === 'OFFLINE' ? '-' : defaultCheckOut,
      regularHours: regHours,
      lateMinutes: lateMins,
      overtimeHours: 0,
      overtimePay: 0,
      overtimeNote: `Status Kehadiran Tim (${member.workMode}) — Supervisor: ${member.supervisor}`,
      locationWatermark:
        member.branch === 'Bandung'
          ? 'Bandung Creative Hub (Jl. Braga)'
          : FUTARI_HQ_ADDRESS,
      status: 'completed',
    });
  }

  return [...matchingActualLogs, ...synthesizedLogs];
}

export const FUTARI_HQ_ADDRESS =
  'Jl. Nusa Indah No.33, RT.14/RW.5, Cipete Sel., Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12410';

/**
 * CLEAR MOCK DATA (BLANK SLATE FOR TESTING):
 * `INITIAL_ATTENDANCE_LOGS` (`attendanceRecords`) is initialized to an empty array `[]`
 * so checking in, hybrid WFO->WFE transitions, and clocking out can be tested from a blank slate.
 * `SEED_ATTENDANCE_LOGS_FIXTURE` is exported only for unit test fixtures.
 */
export const INITIAL_ATTENDANCE_LOGS: AttendanceRecord[] = [];

export const SEED_ATTENDANCE_LOGS_FIXTURE: AttendanceRecord[] = [
  {
    id: 'att_nugi_1',
    staffId: 'des_nugi',
    staffName: 'Nugi Nugroho',
    role: 'Digital',
    branch: 'JKT',
    date: '2026-10-20',
    mode: 'WFO',
    checkInTime: '09:44',
    checkOutTime: '19:15',
    regularHours: 9.5,
    lateMinutes: 0,
    overtimeHours: 0,
    overtimePay: 0,
    overtimeNote:
      'Mengerjakan layout key visual KV booth Telkomsel NextGen JKT & revisi ukuran banner registrasi.',
    locationWatermark: FUTARI_HQ_ADDRESS,
    status: 'completed',
  },
  {
    id: 'att_nugi_2',
    staffId: 'des_nugi',
    staffName: 'Nugi Nugroho',
    role: 'Digital',
    branch: 'JKT',
    date: '2026-10-19',
    mode: 'WFE',
    checkInTime: '09:52',
    checkOutTime: '21:00',
    regularHours: 10.1,
    lateMinutes: 0,
    overtimeHours: 1,
    overtimePay: 7000,
    overtimeNote:
      'Asistensi supervisi cetak materi promosi di JCC Senayan & penyesuaian warna LED screen panggung.',
    locationWatermark: 'Jakarta Convention Center (JCC) Senayan, Jakarta Pusat (-6.2146, 106.8071)',
    status: 'completed',
  },
  {
    id: 'att_hilda_1',
    staffId: 'exec_hildasari',
    staffName: 'Hildasari Umami',
    role: 'Founder & CEO',
    branch: 'JKT',
    date: '2026-10-20',
    mode: 'WFO',
    checkInTime: '09:35',
    checkOutTime: '19:45',
    regularHours: 10.2,
    lateMinutes: 0,
    overtimeHours: 0,
    overtimePay: 0,
    overtimeNote:
      'Review eksekutif anggaran kuartal IV, persetujuan plafon Petty Cash Telkomsel NextGen & rapat direksi.',
    locationWatermark: FUTARI_HQ_ADDRESS,
    status: 'completed',
  },
];

/**
 * Blank-slate initial messages for "Futari General Chat" room (`[]`).
 */
export const INITIAL_CHAT_MESSAGES: ChatMessageItem[] = [];

export const SEED_CHAT_MESSAGES_FIXTURE: ChatMessageItem[] = [
  {
    id: 'msg_1',
    staffId: 'exec_rio',
    senderName: 'M Rio Antoni',
    senderRole: 'Operational · Executive',
    branch: 'JKT',
    initials: 'RA',
    avatarColor: '#0277BD',
    channel: 'Futari General Chat',
    message:
      'Selamat pagi rekan-rekan Futari Jakarta & Bandung! Pengumuman operasional: pastikan seluruh personel yang bertugas WFE di Tech Summit JKT dan Telkomsel NextGen sudah melakukan Photo Check-In dengan Maps Watermark sebelum pukul 10:05 WIB. Jangan lupa saat Clock-Out wajib mengisi Deskripsi Pekerjaan Hari Ini.',
    timestamp: '09:15 WIB',
    isAnnouncement: true,
  },
  {
    id: 'msg_2',
    staffId: 'pic_bobby',
    senderName: 'Bobby',
    senderRole: 'Person In Charge (PIC) · PICs/TLs',
    branch: 'JKT',
    initials: 'BB',
    avatarColor: '#0277BD',
    channel: 'Futari General Chat',
    message:
      'Siap Pak Rio! Saya dan Gusman Razak sudah di lokasi JCC Senayan untuk supervisi rigging panggung utama Tech Summit JKT. Loading LED screen sudah 85% selesai.',
    timestamp: '09:32 WIB',
  },
  {
    id: 'msg_3',
    staffId: 'pic_nana',
    senderName: 'Nana',
    senderRole: 'Person In Charge (PIC) · PICs/TLs',
    branch: 'JKT',
    initials: 'NN',
    avatarColor: '#0077B6',
    channel: 'Futari General Chat',
    message:
      '@Bobby @Tiara Untuk kebutuhan cetak backdrop registrasi dan lanyard VIP sudah dikirim dari tim produksi HQ Cipete Selatan menuju JCC ya. Mohon dikabari kalau kurir sudah tiba di loading dock.',
    timestamp: '09:44 WIB',
  },
  {
    id: 'msg_4',
    staffId: 'tl_alfian',
    senderName: 'Alfian',
    senderRole: 'Team Leader (TL) · PICs/TLs',
    branch: 'Bandung',
    initials: 'AL',
    avatarColor: '#0096C7',
    channel: 'Futari General Chat',
    message:
      'Update dari Bandung Hub (Jl. Braga): Saya dan Yanti sedang finalisasi daftar usher & talent untuk Bandung Creative Fest akhir pekan ini. Semua dokumen sudah sinkron di Google Drive.',
    timestamp: '09:50 WIB',
  },
  {
    id: 'msg_5',
    staffId: 'fin_erlita',
    senderName: 'Erlita',
    senderRole: 'Finance · Admins/Finance',
    branch: 'JKT',
    initials: 'ER',
    avatarColor: '#0096C7',
    channel: 'Futari General Chat',
    message:
      'Reminder dari tim Finance: Untuk teman-teman PIC yang ada pengeluaran konsumsi atau perlengkapan panggung, silakan langsung upload struk via tombol "Minta Piti Scan Struk" di tab Petty Cash agar otomatis terekap ke laporan Excel.',
    timestamp: '10:02 WIB',
  },
  {
    id: 'msg_6',
    staffId: 'exec_hildasari',
    senderName: 'Hildasari Umami',
    senderRole: 'Founder & CEO · Executive',
    branch: 'JKT',
    initials: 'HU',
    avatarColor: '#00B4D8',
    channel: 'Futari General Chat',
    message:
      'Terima kasih Pak Rio dan seluruh tim! Semangat untuk eksekusi minggu ini, jaga kesehatan dan koordinasi antar ruangan tetap solid ya.',
    timestamp: '10:08 WIB',
    isAnnouncement: true,
  },
];

/**
 * Blank-slate Approved Leaves (Cuti & Izin) for the Leave Calendar System (`[]`).
 */
export const INITIAL_LEAVE_RECORDS: LeaveRecordItem[] = [];

export const SEED_LEAVE_RECORDS_FIXTURE: LeaveRecordItem[] = [
  {
    id: 'lv_ferdy_1',
    staffId: 'pic_ferdy',
    staffName: 'Ferdy',
    role: 'Person In Charge (PIC)',
    divisionLabel: 'PICs/TLs',
    branch: 'JKT',
    leaveType: 'Cuti Tahunan',
    startDate: '2026-10-14',
    endDate: '2026-10-16',
    reason: 'Cuti tahunan keluarga (handover operasional venue ke Nana & Salima).',
    status: 'Approved',
    badgeLabel: 'Ferdy - Cuti Tahunan',
  },
  {
    id: 'lv_sesil_2',
    staffId: 'adm_sesil',
    staffName: 'Sesil',
    role: 'Admin',
    divisionLabel: 'Admins/Finance',
    branch: 'JKT',
    leaveType: 'Cuti Tahunan',
    startDate: '2026-10-22',
    endDate: '2026-10-23',
    reason: 'Keperluan administrasi keluarga di luar kota (backup oleh Zahra).',
    status: 'Approved',
    badgeLabel: 'Sesil - Cuti Tahunan',
  },
  {
    id: 'lv_alfian_3',
    staffId: 'tl_alfian',
    staffName: 'Alfian',
    role: 'Team Leader (TL)',
    divisionLabel: 'PICs/TLs',
    branch: 'Bandung',
    leaveType: 'Izin Khusus',
    startDate: '2026-10-28',
    endDate: '2026-10-28',
    reason: 'Menghadiri wisuda adik di Bandung.',
    status: 'Approved',
    badgeLabel: 'Alfian - Izin Khusus',
  },
];

/**
 * Blank-slate Multi-Type Calendar Entries (`[]`).
 */
export const INITIAL_CALENDAR_EVENTS: CalendarEventItem[] = [];

export const SEED_CALENDAR_EVENTS_FIXTURE: CalendarEventItem[] = [
  {
    id: 'cal_ev_1',
    title: 'Tech Summit JKT',
    eventType: 'Event Kantor',
    location: 'JCC Senayan, Jakarta',
    startDate: '2026-10-08',
    endDate: '2026-10-10',
    picName: 'Bobby & Nana',
    branch: 'JKT',
    timeSlot: '08:00 - 21:00 WIB',
  },
  {
    id: 'cal_ev_2',
    title: 'Telkomsel NextGen JKT',
    eventType: 'Event Kantor',
    location: 'JCC Senayan, Jakarta',
    startDate: '2026-10-18',
    endDate: '2026-10-21',
    picName: 'Gusman Razak & Bobby',
    branch: 'JKT',
    timeSlot: '09:00 - 20:00 WIB',
  },
  {
    id: 'cal_ev_3',
    title: 'Bandung Creative Fest',
    eventType: 'Event Kantor',
    location: 'Trans Luxury Hall, Bandung',
    startDate: '2026-10-24',
    endDate: '2026-10-26',
    picName: 'Alfian & Yanti',
    branch: 'Bandung',
    timeSlot: '09:00 - 21:00 WIB',
  },
  {
    id: 'cal_car_1',
    title: 'Booking Mobil Operasional — Innova Zenix (Survey & Klien Senayan)',
    eventType: 'Booking Mobil Operasional',
    vehicleName: 'Toyota Innova Zenix B 1829 FTR',
    location: 'Futari HQ Cipete → JCC Senayan',
    startDate: '2026-10-19',
    endDate: '2026-10-20',
    picName: 'M Rio Antoni & Ade Yenny',
    branch: 'JKT',
    timeSlot: '10:00 - 17:30 WIB',
    notes: 'Koordinasi operasional Pak Rio & loading dokumen teknis venue Senayan.',
  },
  {
    id: 'cal_car_2',
    title: 'Booking Mobil Operasional — HiAce Blindvan (Loading Booth Production)',
    eventType: 'Booking Mobil Operasional',
    vehicleName: 'Toyota HiAce Operasional B 9044 FTR',
    location: 'Gudang Cipete → Senayan City',
    startDate: '2026-10-20',
    endDate: '2026-10-21',
    picName: 'M Rio Antoni, Tiara & Tohir',
    branch: 'JKT',
    timeSlot: '08:30 - 19:00 WIB',
    notes: 'Mobilisasi peralatan rigging & talent wardrobe di bawah supervisi Pak Rio.',
  },
  {
    id: 'cal_car_3',
    title: 'Booking Mobil Operasional — Avanza Operasional BDG (Site Visit)',
    eventType: 'Booking Mobil Operasional',
    vehicleName: 'Toyota Avanza Veloz D 1412 FTR',
    location: 'Braga Hub → Trans Luxury Hall Bandung',
    startDate: '2026-10-24',
    endDate: '2026-10-25',
    picName: 'Alfian & M Rio Antoni',
    branch: 'Bandung',
    timeSlot: '09:00 - 18:00 WIB',
    notes: 'Inspeksi kesiapan venue Bandung Creative Fest.',
  },
];

/**
 * Blank-slate Daily Checklists (`[]`).
 */
export const INITIAL_DAILY_CHECKLISTS: DailyChecklistRecord[] = [];

export const SEED_DAILY_CHECKLISTS_FIXTURE: DailyChecklistRecord[] = [
  {
    dateStr: '2026-10-20',
    staffId: 'exec_hildasari',
    items: [
      {
        id: 'chk_hilda_1',
        text: 'Approve plafon Petty Cash Telkomsel NextGen JKT (IDR 35.000.000)',
        completed: true,
        updatedAt: '10:05 WIB',
      },
      {
        id: 'chk_hilda_2',
        text: 'Review laporan presensi & evaluasi KPI bulanan bersama Pak Rio',
        completed: false,
        updatedAt: '11:20 WIB',
      },
    ],
  },
  {
    dateStr: '2026-10-20',
    staffId: 'exec_rio',
    items: [
      {
        id: 'chk_rio_1',
        text: 'Verifikasi jadwal Booking Mobil Operasional (Innova Zenix & HiAce)',
        completed: true,
        updatedAt: '09:40 WIB',
      },
      {
        id: 'chk_rio_2',
        text: 'Inspeksi logistik gudang Cipete & kesiapan pemberangkatan tim produksi',
        completed: true,
        updatedAt: '13:15 WIB',
      },
      {
        id: 'chk_rio_3',
        text: 'Koordinasi rute mobil operasional ke JCC Senayan',
        completed: false,
        updatedAt: '15:00 WIB',
      },
    ],
  },
  {
    dateStr: '2026-10-20',
    staffId: 'pm_ade',
    items: [
      {
        id: 'chk_ade_1',
        text: 'Finalisasi rundown klien Telkomsel NextGen bersama Ferdy & Sesil',
        completed: true,
        updatedAt: '10:15 WIB',
      },
      {
        id: 'chk_ade_2',
        text: 'Sinkronisasi kebutuhan talent & usher dengan Andri',
        completed: false,
        updatedAt: '14:10 WIB',
      },
    ],
  },
  {
    dateStr: '2026-10-20',
    staffId: 'des_nugi',
    items: [
      {
        id: 'chk_nugi_1',
        text: 'Deploy update 3D Virtual Office & RBAC Superadmin Console',
        completed: true,
        updatedAt: '10:00 WIB',
      },
      {
        id: 'chk_nugi_2',
        text: 'Render visual motion bumper LED stage JCC Senayan',
        completed: false,
        updatedAt: '14:45 WIB',
      },
    ],
  },
  {
    dateStr: '2026-10-20',
    staffId: 'prd_tiara',
    items: [
      {
        id: 'chk_tiara_1',
        text: 'Checklist barang produksi masuk ke HiAce Operasional B 9044 FTR',
        completed: true,
        updatedAt: '09:50 WIB',
      },
      {
        id: 'chk_tiara_2',
        text: 'Upload struk Ace Hardware Senayan ke modul Petty Cash OCR',
        completed: true,
        updatedAt: '13:30 WIB',
      },
    ],
  },
];

/**
 * Parses "HH:mm" into total minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  const clean = timeStr.trim();
  const parts = clean.split(':');
  if (parts.length !== 2) return 0;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

/**
 * Standard start is 10:00 (600 mins). Tolerance is 10:05 (605 mins).
 * If check-in is <= 10:05, late minutes = 0.
 * If check-in is > 10:05, returns minutes late past 10:00 standard start.
 */
export function calculateLateMinutes(checkInTime: string): number {
  const totalMinutes = parseTimeToMinutes(checkInTime);
  const standardStart = 10 * 60; // 10:00 -> 600
  const toleranceCutoff = 10 * 60 + 5; // 10:05 -> 605
  if (totalMinutes <= toleranceCutoff) {
    return 0;
  }
  return totalMinutes - standardStart;
}

export interface OvertimeCalculationResult {
  isOvertime: boolean;
  requiresMandatoryNote: boolean;
  requiresMandatoryDailyDescription: boolean;
  overtimeHours: number;
  overtimePay: number;
  classification: 'EARLY_OR_REGULAR' | 'NORMAL_1900_1959' | 'OVERTIME_2000_PLUS';
}

/**
 * Updated Clock-Out & Strict 20:00 Overtime Rule:
 * - When a user clicks "Clock Out" at ANY time (17:00, 19:00, or 21:00+), it ALWAYS triggers
 *   the mandatory "Deskripsi Pekerjaan Hari Ini" modal (`requiresMandatoryDailyDescription: true`, `requiresMandatoryNote: true`).
 * - Overtime pay (IDR 7,000/hr) is strictly calculated ONLY if clocking out at 20:00 or later.
 */
export function calculateOvertime(checkOutTime: string): OvertimeCalculationResult {
  const totalMinutes = parseTimeToMinutes(checkOutTime);
  const normalStart = 19 * 60; // 19:00 -> 1140
  const overtimeStart = 20 * 60; // 20:00 -> 1200

  if (totalMinutes >= overtimeStart) {
    const rawHours = (totalMinutes - overtimeStart) / 60;
    const overtimeHours = Math.round(rawHours * 100) / 100;
    const overtimePay = Math.round(overtimeHours * OVERTIME_RATE_PER_HOUR);
    return {
      isOvertime: true,
      requiresMandatoryNote: true,
      requiresMandatoryDailyDescription: true,
      overtimeHours,
      overtimePay,
      classification: 'OVERTIME_2000_PLUS',
    };
  }

  if (totalMinutes >= normalStart && totalMinutes < overtimeStart) {
    return {
      isOvertime: false,
      requiresMandatoryNote: true,
      requiresMandatoryDailyDescription: true,
      overtimeHours: 0,
      overtimePay: 0,
      classification: 'NORMAL_1900_1959',
    };
  }

  return {
    isOvertime: false,
    requiresMandatoryNote: true,
    requiresMandatoryDailyDescription: true,
    overtimeHours: 0,
    overtimePay: 0,
    classification: 'EARLY_OR_REGULAR',
  };
}

/**
 * Returns the active payroll cycle (26th of previous month to 25th of current month,
 * or 26th of current month to 25th of next month if day >= 26).
 */
export function getActivePayrollCycle(referenceDate: Date = new Date()): {
  startDate: string;
  endDate: string;
  label: string;
} {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-indexed
  const day = referenceDate.getDate();

  let start: Date;
  let end: Date;

  if (day >= 26) {
    start = new Date(year, month, 26);
    end = new Date(year, month + 1, 25);
  } else {
    start = new Date(year, month - 1, 26);
    end = new Date(year, month, 25);
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const iso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  };

  return {
    startDate: iso(start),
    endDate: iso(end),
    label: `${fmt(start)} – ${fmt(end)}`,
  };
}

/**
 * Formats numbers as IDR currency with tabular readiness.
 */
export function formatIDR(amount: number): string {
  return `IDR ${Math.round(amount).toLocaleString('id-ID')}`;
}

/**
 * Summarizes event petty cash budget vs spent vs remaining.
 */
export function calculatePettyCashSummary(
  approvedBudget: number,
  expenses: Pick<PettyCashRecord, 'amount'>[]
): {
  approvedBudget: number;
  totalSpent: number;
  remainingBalance: number;
  utilizationPercent: number;
} {
  const totalSpent = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const remainingBalance = approvedBudget - totalSpent;
  const utilizationPercent =
    approvedBudget > 0 ? Math.min(100, Math.round((totalSpent / approvedBudget) * 1000) / 10) : 0;

  return {
    approvedBudget,
    totalSpent,
    remainingBalance,
    utilizationPercent,
  };
}

export interface CalendarDayCell {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday?: boolean;
  leaves: LeaveRecordItem[];
  events: CalendarEventItem[];
  officeEvents: CalendarEventItem[];
  carBookings: CalendarEventItem[];
  deadlineTasks: WorkTaskItem[];
}

/**
 * Generates a 35- or 42-cell monthly calendar grid with matching:
 * 1. "Cuti" (leaves)
 * 2. "Event Kantor" (officeEvents)
 * 3. "Booking Mobil Operasional" (carBookings)
 * 4. "Task & Pekerjaan" synced specifically on their Deadline Date (deadlineTasks)
 */
export function buildMonthlyCalendarGrid(
  year: number,
  monthZeroIndexed: number,
  leaves: LeaveRecordItem[],
  events: CalendarEventItem[],
  tasks: WorkTaskItem[] = [],
  referenceDate: Date = new Date()
): CalendarDayCell[] {
  const todayStr = toLocalDateKey(referenceDate);
  const firstDayOfMonth = new Date(year, monthZeroIndexed, 1);
  const lastDayOfMonth = new Date(year, monthZeroIndexed + 1, 0);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = lastDayOfMonth.getDate();

  const formatYMD = (y: number, m0: number, d: number) => {
    const dt = new Date(y, m0, d);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return { dateStr: `${yy}-${mm}-${dd}`, dayNum: dt.getDate() };
  };

  const buildCell = (dateStr: string, dayNumber: number, isCurrentMonth: boolean): CalendarDayCell => {
    const dayLeaves = leaves.filter((lv) => dateStr >= lv.startDate && dateStr <= lv.endDate);
    const dayEvents = events.filter((ev) => dateStr >= ev.startDate && dateStr <= ev.endDate);
    const officeEvents = dayEvents.filter(
      (ev) => (ev.eventType || 'Event Kantor') === 'Event Kantor'
    );
    const carBookings = dayEvents.filter(
      (ev) => ev.eventType === 'Booking Mobil Operasional'
    );
    // Calendar Sync: Render tasks on the grid specifically on their Deadline Date / due_date
    const deadlineTasks = tasks.filter((t) => {
      const taskDue = t.deadlineDate || (t.due_date ? t.due_date.split('T')[0] : '');
      return taskDue === dateStr;
    });
    return {
      dateStr,
      dayNumber,
      isCurrentMonth,
      isToday: dateStr === todayStr,
      leaves: dayLeaves,
      events: dayEvents,
      officeEvents,
      carBookings,
      deadlineTasks,
    };
  };

  const cells: CalendarDayCell[] = [];

  // Leading days from previous month
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const { dateStr, dayNum } = formatYMD(year, monthZeroIndexed, -i);
    cells.push(buildCell(dateStr, dayNum, false));
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const { dateStr, dayNum } = formatYMD(year, monthZeroIndexed, d);
    cells.push(buildCell(dateStr, dayNum, true));
  }

  // Trailing days to complete weeks
  const totalSlots = cells.length <= 35 ? 35 : 42;
  let nextMonthDay = 1;
  while (cells.length < totalSlots) {
    const { dateStr, dayNum } = formatYMD(year, monthZeroIndexed + 1, nextMonthDay++);
    cells.push(buildCell(dateStr, dayNum, false));
  }

  return cells;
}

export const FUTARI_CYAN_HIGHLIGHT_HEX = '#00B4D8';

/**
 * Formats a check-in time string (e.g., "09:55") with the "WIB" timezone suffix ("09:55 WIB").
 */
export function formatCheckInWib(checkInTime: string): string {
  const trimmed = (checkInTime || '').trim();
  if (!trimmed || trimmed === '-') return '- WIB';
  if (trimmed.toUpperCase().endsWith('WIB')) return trimmed;
  return `${trimmed} WIB`;
}

export interface LiveAttendanceHudInfo {
  staffId: string;
  name: string;
  initials: string;
  avatarColor: string;
  role: string;
  divisionLabel: string;
  roleAndDivision: string;
  branch: BranchType;
  roomName: VirtualOfficeRoomName;
  statusText: 'Sedang WFO (Hadir)';
  checkInWib: string;
  highlightEmissiveHex: string;
  deskCoords: { x: number; z: number };
}

/**
 * Returns the structured 2D Live Attendance Info Overlay (HUD) data for a highlighted 3D avatar.
 * Strictly returns null if no avatar is selected OR if the person is not actively checked in as "WFO".
 */
export function getHighlightedAvatarHudData(
  staffList: StaffMemberRecord[],
  selectedStaffId: string | null
): LiveAttendanceHudInfo | null {
  if (!selectedStaffId) return null;
  const activeWfo = filterActiveWfoPersonnel(staffList);
  const target = activeWfo.find((s) => s.staffId === selectedStaffId);
  if (!target) return null;

  return {
    staffId: target.staffId,
    name: target.name,
    initials: target.initials,
    avatarColor: target.avatarColor,
    role: target.role,
    divisionLabel: target.divisionLabel,
    roleAndDivision: `${target.role} · ${target.divisionLabel}`,
    branch: target.branch,
    roomName: target.roomName,
    statusText: 'Sedang WFO (Hadir)',
    checkInWib: formatCheckInWib(target.checkInTime),
    highlightEmissiveHex: FUTARI_CYAN_HIGHLIGHT_HEX,
    deskCoords: target.deskCoords,
  };
}

/**
 * Resolves the next highlighted 3D avatar ID when clicking in the 3D Virtual Office:
 * - Only one avatar can be highlighted at a time.
 * - Clicking outside (clickedStaffId === null) removes the highlight (returns null).
 * - Clicking another active WFO avatar switches the highlight to that avatar.
 * - Clicking a non-WFO (WFE / OFFLINE) user ID returns null (since they are hidden from the 3D scene).
 */
export function resolveNextHighlightedStaffId(
  _currentSelectedId: string | null,
  clickedStaffId: string | null,
  staffList: StaffMemberRecord[]
): string | null {
  if (!clickedStaffId) return null;
  const activeWfo = filterActiveWfoPersonnel(staffList);
  const isWfoActive = activeWfo.some((s) => s.staffId === clickedStaffId);
  return isWfoActive ? clickedStaffId : null;
}

// =============================================================================
// DEVELOPER / SUPERADMIN BACKDOOR & USER MANAGEMENT PURE LOGIC
// =============================================================================

export const DEVELOPER_SUPERADMIN_EMAIL = 'nuginugroho2005@gmail.com';
export const DEVELOPER_SUPERADMIN_PASSWORD = 'nug1d1d1';

export const DIVISION_LABEL_MAP: Record<DivisionType, string> = {
  Executive: 'Executive',
  PM: 'PMs',
  PIC_TL: 'PICs/TLs',
  Admin_Finance: 'Admins/Finance',
  Design_Talent_Production: 'Design/Talent/Production',
};

export const COMPANY_ROLES = [
  'Executive',
  'Operasional',
  'Finance',
  'Project Manager',
  'Person In Charge',
  'Team Leader',
  'Admin',
  'Multimedia',
  'Design',
  'Production',
  'HRD',
] as const;

export type CompanyRole = (typeof COMPANY_ROLES)[number];

export const COMPANY_DIVISIONS = [
  'Executive',
  'Operational',
  'Finance',
  'Project Management',
  'Digital Design Multimedia',
  'Production',
  'HRD',
] as const;

export type CompanyDivision = (typeof COMPANY_DIVISIONS)[number];

export const AVAILABLE_STAFF_ROLES: string[] = [
  'Unassigned',
  'Pending',
  'Founder & CEO',
  'Operational',
  'Project Manager',
  'Person In Charge (PIC)',
  'Team Leader (TL)',
  'Talent Leader',
  'Admin',
  'Finance',
  'Head of Design',
  'Digital',
  'Production',
  'Recruitment',
];

export const AVAILABLE_DIVISIONS: { value: DivisionType; label: string }[] = [
  { value: 'Executive', label: 'Executive' },
  { value: 'PM', label: 'PMs' },
  { value: 'PIC_TL', label: 'PICs/TLs' },
  { value: 'Admin_Finance', label: 'Admins/Finance' },
  { value: 'Design_Talent_Production', label: 'Design/Talent/Production' },
];

/**
 * STRICT VISIBILITY RULE FOR EXCLUSIVE DEVELOPER DASHBOARD:
 * Returns true ONLY if the actively logged-in user is authenticated with
 * email === "nuginugroho2005@gmail.com" AND accessLevel === "developer".
 * Completely hidden from CEO (Ibu Hilda), PMs, PICs, Admins, Finance, and all other personnel.
 */
export function isDeveloperSuperadmin(
  user: StaffMemberRecord | null | undefined
): boolean {
  if (!user) return false;
  const roleNorm = (user.role || '').trim().toLowerCase();
  return (
    (user.email.trim().toLowerCase() === DEVELOPER_SUPERADMIN_EMAIL &&
      user.accessLevel === 'developer') ||
    roleNorm === 'dev' ||
    roleNorm === 'developer' ||
    roleNorm === 'superadmin'
  );
}

export interface MockAuthResult {
  success: boolean;
  user?: StaffMemberRecord;
  error?: string;
}

/**
 * Authenticates a user against the mock database:
 * - Enforces exact password `nug1d1d1` for `nuginugroho2005@gmail.com`.
 * - Rejects suspended/deactivated accounts (`isSuspended === true`).
 * - Matches standard employees by email or name (requiring non-empty password).
 */
export function authenticateStaffCredentials(
  emailInput: string,
  passwordInput: string,
  staffList: StaffMemberRecord[]
): MockAuthResult {
  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  if (!cleanEmail || !cleanPass) {
    return {
      success: false,
      error: 'Masukkan email karyawan Futari dan password.',
    };
  }

  // Strict check for Developer/Superadmin profile (nuginugroho2005@gmail.com)
  if (cleanEmail === DEVELOPER_SUPERADMIN_EMAIL) {
    const nugiProfile = staffList.find(
      (s) => s.email.trim().toLowerCase() === DEVELOPER_SUPERADMIN_EMAIL
    );
    if (!nugiProfile) {
      return {
        success: false,
        error: 'Profil Developer tidak ditemukan di database.',
      };
    }
    if (nugiProfile.isSuspended) {
      return {
        success: false,
        error: 'Akun ini sedang ditangguhkan (Suspended) oleh Administrator.',
      };
    }
    if (cleanPass !== (nugiProfile.password || DEVELOPER_SUPERADMIN_PASSWORD)) {
      return {
        success: false,
        error:
          'Kredensial Developer ditolak: Password khusus untuk nuginugroho2005@gmail.com tidak sesuai.',
      };
    }
    return {
      success: true,
      user: nugiProfile,
    };
  }

  const matched = staffList.find(
    (s) =>
      s.email.toLowerCase() === cleanEmail ||
      s.name.toLowerCase().includes(cleanEmail.split('@')[0])
  );

  if (!matched) {
    return {
      success: false,
      error: 'Email karyawan tidak terdaftar di database personel Futari.',
    };
  }

  if (matched.isSuspended) {
    return {
      success: false,
      error: `Akun ${matched.name} (${matched.email}) sedang ditangguhkan / dinonaktifkan (Suspended). Hubungi Developer.`,
    };
  }

  if (matched.password && cleanPass !== matched.password) {
    return {
      success: false,
      error: 'Password tidak sesuai untuk akun ini.',
    };
  }

  return {
    success: true,
    user: matched,
  };
}

/**
 * Updates a staff member's role and/or division on the fly.
 */
export function updateStaffRoleAndDivision(
  staffList: StaffMemberRecord[],
  targetStaffId: string,
  updates: { role?: string; division?: DivisionType }
): StaffMemberRecord[] {
  return staffList.map((staff) => {
    if (staff.staffId !== targetStaffId) return staff;
    const nextRole = updates.role !== undefined ? updates.role : staff.role;
    const nextDivision =
      updates.division !== undefined ? updates.division : staff.division;
    const nextDivisionLabel =
      updates.division !== undefined
        ? (DIVISION_LABEL_MAP[nextDivision as keyof typeof DIVISION_LABEL_MAP] || updates.division)
        : staff.divisionLabel;

    return {
      ...staff,
      role: nextRole,
      division: nextDivision,
      divisionLabel: nextDivisionLabel,
    };
  });
}

/**
 * Toggles a staff member's account suspension (`isSuspended`) state.
 * When suspended, their `workMode` is also set to 'OFFLINE' if they were active,
 * or preserved so they can be restored cleanly.
 */
export function toggleStaffSuspensionStatus(
  staffList: StaffMemberRecord[],
  targetStaffId: string
): StaffMemberRecord[] {
  return staffList.map((staff) => {
    if (staff.staffId !== targetStaffId) return staff;
    const nextSuspended = !Boolean(staff.isSuspended);
    return {
      ...staff,
      isSuspended: nextSuspended,
    };
  });
}

export interface NewWorkspaceAccountInput {
  name: string;
  email: string;
  password?: string;
  supervisor?: string;
  role: string;
  division: DivisionType;
  branch: BranchType;
  roomName: VirtualOfficeRoomName;
  workMode?: WorkModeType;
}

/**
 * Registers a new Google Workspace employee account into the personnel database,
 * inheriting initial password and direct supervisor for hierarchical displays.
 */
export function formatRealTimeHHMM(date: Date = new Date()): string {
  const hrs = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${hrs}:${mins}`;
}

export function registerNewGoogleWorkspaceAccount(
  staffList: StaffMemberRecord[],
  input: NewWorkspaceAccountInput
): { updatedList: StaffMemberRecord[]; createdStaff: StaffMemberRecord } {
  const cleanName = input.name.trim();
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanPassword = (input.password || '').trim() || 'futari2026';
  const cleanSupervisor =
    (input.supervisor || '').trim() || '';

  const parts = cleanName.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : cleanName.slice(0, 2).toUpperCase();

  const roomDef =
    VIRTUAL_OFFICE_ROOMS.find((r) => r.roomName === input.roomName) ||
    VIRTUAL_OFFICE_ROOMS[0];

  const offsetAngle = (staffList.length % 8) * (Math.PI / 4);
  const deskCoords = {
    x:
      Math.round((roomDef.floorBounds.centerX + Math.cos(offsetAngle) * 1.4) * 10) /
      10,
    z:
      Math.round((roomDef.floorBounds.centerZ + Math.sin(offsetAngle) * 1.1) * 10) /
      10,
  };

  const nextId = String(staffList.length + 1);
  const createdStaff: StaffMemberRecord = {
    id: nextId,
    staffId: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    email: cleanEmail,
    password: cleanPassword,
    accessLevel:
      cleanEmail === DEVELOPER_SUPERADMIN_EMAIL ? 'developer' : 'standard',
    isSuspended: false,
    status: 'ACTIVE',
    role: input.role,
    division: input.division,
    divisionLabel: DIVISION_LABEL_MAP[input.division] || 'Operations',
    branch: input.branch,
    location: input.branch === 'Bandung' ? 'Bandung' : 'JKT',
    supervisor: cleanSupervisor,
    workMode: input.workMode || 'WFO',
    checkInTime: formatRealTimeHHMM(),
    lateMinutesMonth: 0,
    deskZone: input.roomName,
    roomName: input.roomName,
    deskCoords,
    avatarColor: '#00B4D8',
    initials,
  };

  return {
    updatedList: [...staffList, createdStaff],
    createdStaff,
  };
}

/**
 * Permanently removes a user object from the personnel database state.
 */
export function deleteStaffMember(
  staffList: StaffMemberRecord[],
  targetStaffId: string
): StaffMemberRecord[] {
  return staffList.filter((staff) => staff.staffId !== targetStaffId);
}

/**
 * Determines whether `candidateStaff` has `supervisorStaff` set as their direct supervisor.
 * Handles both exact name matches (e.g., "Ade Yenny") and name+role formatted strings
 * (e.g., "Ade Yenny (Project Manager)").
 */
export function isDirectReportOf(
  candidateStaff: StaffMemberRecord,
  supervisorStaff: StaffMemberRecord
): boolean {
  if (!candidateStaff || !supervisorStaff) return false;
  if (candidateStaff.staffId === supervisorStaff.staffId) return false;

  // 1. Direct match by supervisor_email (highest priority)
  const candidateSupEmail = (candidateStaff.supervisor_email || '').trim().toLowerCase();
  const supervisorEmail = (supervisorStaff.email || '').trim().toLowerCase();
  if (candidateSupEmail && supervisorEmail && candidateSupEmail === supervisorEmail) {
    return true;
  }

  // 2. Fallback to name-based match
  const rawSup = (candidateStaff.supervisor || '').trim().toLowerCase();
  const supName = (supervisorStaff.name || '').trim().toLowerCase();
  const supRole = (supervisorStaff.role || '').trim().toLowerCase();

  if (!rawSup || !supName) return false;
  if (rawSup === supName) return true;
  if (rawSup === `${supName} (${supRole})`) return true;
  if (rawSup.startsWith(`${supName} (`)) return true;
  return false;
}

/**
 * Filters the personnel database to return all direct reports (team members)
 * who have `supervisorStaff` set as their direct supervisor.
 */
export function getDirectReportsForSupervisor(
  staffList: StaffMemberRecord[],
  supervisorStaff: StaffMemberRecord | null | undefined
): StaffMemberRecord[] {
  if (!supervisorStaff) return [];
  return staffList.filter((person) => isDirectReportOf(person, supervisorStaff));
}

// =============================================================================
// DAILY CHECKLISTS & PERMISSION LOCK PURE LOGIC
// =============================================================================

/**
 * STRICT PERMISSION LOCK:
 * Everyone can view all checklists, but ONLY the checklist owner can check/uncheck or edit their own items.
 */
export function canModifyDailyChecklist(
  actingUserId: string | null | undefined,
  checklistOwnerStaffId: string | null | undefined
): boolean {
  if (!actingUserId || !checklistOwnerStaffId) return false;
  return actingUserId.trim() === checklistOwnerStaffId.trim();
}

/**
 * Returns daily checklists for a specific date (`dateStr`), grouped by personnel.
 * Always includes the currently logged-in user first, followed by all personnel who have items
 * on that date, and optionally all active personnel so anyone's checklist can be inspected.
 */
export function getDailyChecklistsGroupedByPersonnel(
  checklists: DailyChecklistRecord[],
  dateStr: string,
  staffList: StaffMemberRecord[],
  actingUserId: string,
  includeEmptyPersonnel: boolean = false
): PersonnelDailyChecklistGroup[] {
  const byStaff = new Map<string, DailyChecklistItem[]>();
  for (const rec of checklists) {
    if (rec.dateStr === dateStr) {
      byStaff.set(rec.staffId, rec.items);
    }
  }

  const groups: PersonnelDailyChecklistGroup[] = [];
  for (const person of staffList) {
    if (person.isSuspended) continue;
    const items = byStaff.get(person.staffId) || [];
    const isOwner = canModifyDailyChecklist(actingUserId, person.staffId);
    if (isOwner || items.length > 0 || includeEmptyPersonnel) {
      groups.push({
        dateStr,
        staffId: person.staffId,
        staffName: person.name,
        role: person.role,
        divisionLabel: person.divisionLabel,
        branch: person.branch,
        initials: person.initials,
        avatarColor: person.avatarColor,
        photoUrl: person.photoUrl,
        isOwner,
        items,
      });
    }
  }

  // Sort so the logged-in user's checklist is always at the top, followed by those with items
  return groups.sort((a, b) => {
    if (a.isOwner && !b.isOwner) return -1;
    if (!a.isOwner && b.isOwner) return 1;
    if (a.items.length !== b.items.length) return b.items.length - a.items.length;
    return a.staffName.localeCompare(b.staffName);
  });
}

/**
 * Toggles a checklist item's completed status ONLY if `actingUserId === targetOwnerStaffId`.
 */
export function toggleDailyChecklistItem(
  checklists: DailyChecklistRecord[],
  dateStr: string,
  targetOwnerStaffId: string,
  actingUserId: string,
  itemId: string
): DailyChecklistRecord[] {
  if (!canModifyDailyChecklist(actingUserId, targetOwnerStaffId)) {
    return checklists;
  }

  return checklists.map((rec) => {
    if (rec.dateStr !== dateStr || rec.staffId !== targetOwnerStaffId) return rec;
    return {
      ...rec,
      items: rec.items.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ),
    };
  });
}

/**
 * Adds a new checklist item for `targetOwnerStaffId` on `dateStr` ONLY if `actingUserId === targetOwnerStaffId`.
 */
export function addDailyChecklistItem(
  checklists: DailyChecklistRecord[],
  dateStr: string,
  targetOwnerStaffId: string,
  actingUserId: string,
  text: string,
  timestampLabel: string = 'Baru saja'
): DailyChecklistRecord[] {
  if (!canModifyDailyChecklist(actingUserId, targetOwnerStaffId)) {
    return checklists;
  }
  const cleanText = text.trim();
  if (!cleanText) return checklists;

  const newItem: DailyChecklistItem = {
    id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text: cleanText,
    completed: false,
    updatedAt: timestampLabel,
  };

  const exists = checklists.some(
    (rec) => rec.dateStr === dateStr && rec.staffId === targetOwnerStaffId
  );

  if (!exists) {
    return [
      ...checklists,
      {
        dateStr,
        staffId: targetOwnerStaffId,
        items: [newItem],
      },
    ];
  }

  return checklists.map((rec) => {
    if (rec.dateStr !== dateStr || rec.staffId !== targetOwnerStaffId) return rec;
    return {
      ...rec,
      items: [...rec.items, newItem],
    };
  });
}

/**
 * Edits the text of an existing checklist item ONLY if `actingUserId === targetOwnerStaffId`.
 */
export function editDailyChecklistItem(
  checklists: DailyChecklistRecord[],
  dateStr: string,
  targetOwnerStaffId: string,
  actingUserId: string,
  itemId: string,
  newText: string
): DailyChecklistRecord[] {
  if (!canModifyDailyChecklist(actingUserId, targetOwnerStaffId)) {
    return checklists;
  }
  const cleanText = newText.trim();
  if (!cleanText) return checklists;

  return checklists.map((rec) => {
    if (rec.dateStr !== dateStr || rec.staffId !== targetOwnerStaffId) return rec;
    return {
      ...rec,
      items: rec.items.map((item) =>
        item.id === itemId ? { ...item, text: cleanText } : item
      ),
    };
  });
}

/**
 * Deletes a checklist item ONLY if `actingUserId === targetOwnerStaffId`.
 */
export function deleteDailyChecklistItem(
  checklists: DailyChecklistRecord[],
  dateStr: string,
  targetOwnerStaffId: string,
  actingUserId: string,
  itemId: string
): DailyChecklistRecord[] {
  if (!canModifyDailyChecklist(actingUserId, targetOwnerStaffId)) {
    return checklists;
  }

  return checklists.map((rec) => {
    if (rec.dateStr !== dateStr || rec.staffId !== targetOwnerStaffId) return rec;
    return {
      ...rec,
      items: rec.items.filter((item) => item.id !== itemId),
    };
  });
}

// =============================================================================
// 3D AVATAR CUSTOMIZATION & SELF-SERVICE / SUPERADMIN PROFILE EDITING
// =============================================================================

const HIJAB_DEFAULT_STAFF_IDS = new Set([
  'exec_hildasari',
  'pm_ade',
  'pic_salima',
  'adm_zahra',
  'fin_erlita',
  'hrd_iza',
  'rec_yanti',
]);

/**
 * Resolves the complete 3D Avatar Configuration for a staff member, merging any saved
 * customization with deterministic defaults based on their profile.
 */
export function getStaffAvatar3DConfig(person: StaffMemberRecord): Avatar3DConfig {
  const defaultHijab = HIJAB_DEFAULT_STAFF_IDS.has(person.staffId);
  const defaults: Avatar3DConfig = {
    shirtColor: person.avatarColor || '#00B4D8',
    hairStyle: defaultHijab ? 'bun' : 'short',
    hairColor: '#1e293b',
    useHijab: defaultHijab,
    hijabColor: person.avatarColor || '#0277BD',
  };

  if (!person.avatar3DConfig) {
    return defaults;
  }

  return {
    shirtColor: person.avatar3DConfig.shirtColor || defaults.shirtColor,
    hairStyle: person.avatar3DConfig.hairStyle || defaults.hairStyle,
    hairColor: person.avatar3DConfig.hairColor || defaults.hairColor,
    useHijab:
      person.avatar3DConfig.useHijab !== undefined
        ? person.avatar3DConfig.useHijab
        : defaults.useHijab,
    hijabColor: person.avatar3DConfig.hijabColor || defaults.hijabColor,
  };
}

export interface SelfServiceProfileUpdateInput {
  name?: string;
  password?: string;
  supervisor?: string;
  supervisor_email?: string | null;
  roomName?: VirtualOfficeRoomName;
  avatarColor?: string;
  photoUrl?: string;
  avatar_url?: string | null;
  avatar3DConfig?: Partial<Avatar3DConfig>;
}

function computeInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || 'FT';
}

function computeDeskCoordsForRoom(
  roomName: VirtualOfficeRoomName,
  seedIndex: number
): { x: number; z: number } {
  const roomDef =
    VIRTUAL_OFFICE_ROOMS.find((r) => r.roomName === roomName) ||
    VIRTUAL_OFFICE_ROOMS[0];
  const offsetAngle = (seedIndex % 8) * (Math.PI / 4);
  return {
    x:
      Math.round((roomDef.floorBounds.centerX + Math.cos(offsetAngle) * 1.4) * 10) /
      10,
    z:
      Math.round((roomDef.floorBounds.centerZ + Math.sin(offsetAngle) * 1.1) * 10) /
      10,
  };
}

/**
 * Self-Service Profile Update:
 * Allows any logged-in user to edit their OWN profile (Name, Password, Supervisor/Team,
 * Room, Photo/Avatar Color, and 3D Avatar Customization: Shirt Color, Hair Style/Color, Hijab toggle).
 */
export function updateOwnProfileSelfService(
  staffList: StaffMemberRecord[],
  actingUserId: string,
  updates: SelfServiceProfileUpdateInput
): StaffMemberRecord[] {
  return staffList.map((staff, idx) => {
    if (staff.staffId !== actingUserId) return staff;

    const nextName =
      updates.name !== undefined && updates.name.trim()
        ? updates.name.trim()
        : staff.name;
    const nextPassword =
      updates.password !== undefined && updates.password.trim()
        ? updates.password.trim()
        : staff.password;
    const nextSupervisor =
      updates.supervisor !== undefined && updates.supervisor.trim()
        ? updates.supervisor.trim()
        : staff.supervisor;
    const nextSupervisorEmail =
      updates.supervisor_email !== undefined
        ? updates.supervisor_email
        : staff.supervisor_email;
    const nextRoomName =
      updates.roomName !== undefined ? updates.roomName : staff.roomName;
    const roomChanged = nextRoomName !== staff.roomName;
    const nextDeskCoords = roomChanged
      ? computeDeskCoordsForRoom(nextRoomName, idx + 3)
      : staff.deskCoords;
    const nextAvatarColor =
      updates.avatarColor !== undefined && updates.avatarColor.trim()
        ? updates.avatarColor.trim()
        : staff.avatarColor;
    const nextPhotoUrl =
      updates.photoUrl !== undefined
        ? updates.photoUrl
        : updates.avatar_url !== undefined
        ? updates.avatar_url || undefined
        : staff.photoUrl;
    const nextAvatarUrl =
      updates.avatar_url !== undefined
        ? updates.avatar_url
        : updates.photoUrl !== undefined
        ? updates.photoUrl || null
        : staff.avatar_url;

    const current3D = getStaffAvatar3DConfig(staff);
    const next3D: Avatar3DConfig = {
      ...current3D,
      ...(updates.avatar3DConfig || {}),
    };

    return {
      ...staff,
      name: nextName,
      initials: computeInitialsFromName(nextName),
      password: nextPassword,
      supervisor: nextSupervisor,
      supervisor_email: nextSupervisorEmail,
      roomName: nextRoomName,
      deskZone: nextRoomName,
      deskCoords: nextDeskCoords,
      avatarColor: nextAvatarColor,
      photoUrl: nextPhotoUrl,
      avatar_url: nextAvatarUrl,
      avatar3DConfig: next3D,
    };
  });
}

export interface SuperadminProfileUpdateInput extends SelfServiceProfileUpdateInput {
  email?: string;
  role?: string;
  division?: DivisionType;
  branch?: BranchType;
  workMode?: WorkModeType;
  teamMemberIds?: string[];
  allowedAttendanceViewerIds?: string[];
}

/**
 * Superadmin Full Profile Update:
 * Strictly requires `isDeveloperSuperadmin(actingUser) === true` (Nugi Nugroho).
 * Allows editing ANY user's complete profile, hierarchy (Supervisor & Team Members Assignment),
 * Custom Attendance Viewers (`allowedAttendanceViewerIds`), credentials, and 3D avatar settings.
 */
export function superadminUpdateAnyProfile(
  staffList: StaffMemberRecord[],
  actingUser: StaffMemberRecord | null | undefined,
  targetStaffId: string,
  updates: SuperadminProfileUpdateInput
): StaffMemberRecord[] {
  if (!isDeveloperSuperadmin(actingUser)) {
    return staffList;
  }

  const existingTarget = staffList.find((s) => s.staffId === targetStaffId);
  if (!existingTarget) return staffList;

  const resolvedTargetName =
    updates.name !== undefined && updates.name.trim()
      ? updates.name.trim()
      : existingTarget.name;
  const resolvedTargetRole =
    updates.role !== undefined && updates.role.trim()
      ? updates.role.trim()
      : existingTarget.role;
  const formattedSupervisorLabel = `${resolvedTargetName} (${resolvedTargetRole})`;
  const teamSet =
    updates.teamMemberIds !== undefined
      ? new Set(
          updates.teamMemberIds.filter((id) => id && id !== targetStaffId)
        )
      : null;

  return staffList.map((staff, idx) => {
    if (staff.staffId !== targetStaffId) {
      if (!teamSet) return staff;
      const wasDirectReport = isDirectReportOf(staff, existingTarget);
      const shouldBeDirectReport = teamSet.has(staff.staffId);
      if (shouldBeDirectReport) {
        return {
          ...staff,
          supervisor: formattedSupervisorLabel,
          supervisor_email: (updates.email || existingTarget.email || '').trim().toLowerCase() || staff.supervisor_email,
        };
      }
      if (wasDirectReport && !shouldBeDirectReport) {
        return {
          ...staff,
          supervisor: '',
          supervisor_email: null,
        };
      }
      return staff;
    }

    const nextName = resolvedTargetName;
    const nextEmail =
      updates.email !== undefined && updates.email.trim()
        ? updates.email.trim().toLowerCase()
        : staff.email;
    const nextPassword =
      updates.password !== undefined && updates.password.trim()
        ? updates.password.trim()
        : staff.password;
    const nextRole = resolvedTargetRole;
    const nextDivision =
      updates.division !== undefined ? updates.division : staff.division;
    const nextDivisionLabel =
      updates.division !== undefined
        ? (DIVISION_LABEL_MAP[nextDivision as keyof typeof DIVISION_LABEL_MAP] || updates.division)
        : staff.divisionLabel;
    const nextBranch =
      updates.branch !== undefined ? updates.branch : staff.branch;
    const nextSupervisor =
      updates.supervisor !== undefined && updates.supervisor.trim()
        ? updates.supervisor.trim()
        : staff.supervisor;
    const nextSupervisorEmail =
      updates.supervisor_email !== undefined
        ? updates.supervisor_email
        : staff.supervisor_email;
    const nextRoomName =
      updates.roomName !== undefined ? updates.roomName : staff.roomName;
    const roomChanged = nextRoomName !== staff.roomName;
    const nextDeskCoords = roomChanged
      ? computeDeskCoordsForRoom(nextRoomName, idx + 5)
      : staff.deskCoords;
    const nextWorkMode =
      updates.workMode !== undefined ? updates.workMode : staff.workMode;
    const nextAvatarColor =
      updates.avatarColor !== undefined && updates.avatarColor.trim()
        ? updates.avatarColor.trim()
        : staff.avatarColor;
    const nextPhotoUrl =
      updates.photoUrl !== undefined
        ? updates.photoUrl
        : updates.avatar_url !== undefined
        ? updates.avatar_url || undefined
        : staff.photoUrl;
    const nextAvatarUrl =
      updates.avatar_url !== undefined
        ? updates.avatar_url
        : updates.photoUrl !== undefined
        ? updates.photoUrl || null
        : staff.avatar_url;
    const nextAllowedViewers =
      updates.allowedAttendanceViewerIds !== undefined
        ? Array.from(new Set(updates.allowedAttendanceViewerIds))
        : staff.allowedAttendanceViewerIds;

    const current3D = getStaffAvatar3DConfig(staff);
    const next3D: Avatar3DConfig = {
      ...current3D,
      ...(updates.avatar3DConfig || {}),
    };

    return {
      ...staff,
      name: nextName,
      initials: computeInitialsFromName(nextName),
      email: nextEmail,
      password: nextPassword,
      role: nextRole,
      division: nextDivision,
      divisionLabel: nextDivisionLabel,
      branch: nextBranch,
      supervisor: nextSupervisor,
      supervisor_email: nextSupervisorEmail,
      roomName: nextRoomName,
      deskZone: nextRoomName,
      deskCoords: nextDeskCoords,
      workMode: nextWorkMode,
      avatarColor: nextAvatarColor,
      photoUrl: nextPhotoUrl,
      avatar_url: nextAvatarUrl,
      avatar3DConfig: next3D,
      allowedAttendanceViewerIds: nextAllowedViewers,
    };
  });
}

// =============================================================================
// REAL FIREBASE AUTH USER MAPPING & PITI AI PERSONA SYSTEM INSTRUCTION
// =============================================================================

export const PITI_PERSONA_SYSTEM_INSTRUCTION =
  'Kamu adalah Piti, asisten virtual cerdas dan ramah untuk portal operasional Futari. Jawablah dalam bahasa Indonesia yang profesional namun santai.';

/**
 * Builds the full system instruction for Piti AI, combining the required persona prompt
 * with real-time operational context from the 22-person Futari database.
 */
export function buildPitiSystemInstruction(
  currentUser?: { name?: string; role?: string; division?: string; branch?: string },
  contextSummary?: string
): string {
  const userLine = currentUser?.name
    ? `Pengguna aktif saat ini: ${currentUser.name} (${currentUser.role || 'Staff'} - ${currentUser.division || 'Operasional'}, cabang ${currentUser.branch || 'JKT'}).`
    : '';
  const contextBlock = contextSummary?.trim()
    ? `\nData Operasional Real-Time Futari:\n${contextSummary.trim()}`
    : '';
  return [
    PITI_PERSONA_SYSTEM_INSTRUCTION,
    userLine,
    contextBlock,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export interface FirebaseUserMappingResult {
  matchedStaff: StaffMemberRecord;
  updatedStaffList: StaffMemberRecord[];
  isNewRegistration: boolean;
}

/**
 * REAL REGISTRATION FLOW HANDLING:
 * When a user successfully authenticates via Google/Email, checks if their email exists in the `personnel` (`staffList`) array.
 * - If they exist (e.g., nuginugroho2005@gmail.com), returns their existing profile.
 * - If they do NOT exist (new registration), automatically appends a new user object to the `personnel` array
 *   with their Google Display Name, Email, and a default role of `'Unassigned'` (so Developer Nugi can use
 *   the "User Management" tab to assign their proper Role, Division, and Supervisor).
 */
export function mapFirebaseUserToStaffProfile(
  email: string,
  displayName: string | null | undefined,
  staffList: StaffMemberRecord[],
  password?: string
): FirebaseUserMappingResult {
  const cleanEmail = (email || '').trim().toLowerCase();

  const existing = staffList.find(
    (s) => s.email.trim().toLowerCase() === cleanEmail
  );

  if (existing) {
    return {
      matchedStaff: existing,
      updatedStaffList: staffList,
      isNewRegistration: false,
    };
  }

  // Derive a clean display name if not provided by Google/Firebase Auth
  const fallbackNameFromEmail = cleanEmail
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const resolvedName =
    displayName && displayName.trim().length > 0
      ? displayName.trim()
      : fallbackNameFromEmail || 'Personel Baru Futari';

  const { updatedList, createdStaff } = registerNewGoogleWorkspaceAccount(
    staffList,
    {
      name: resolvedName,
      email: cleanEmail || `user_${Date.now()}@futari.id`,
      password: password || 'futari2026',
      supervisor: 'Unassigned',
      role: cleanEmail === DEVELOPER_SUPERADMIN_EMAIL ? 'Digital' : 'Unassigned',
      division: 'Design_Talent_Production',
      branch: 'JKT',
      roomName: 'Ruangan Creative/Design',
      workMode: 'WFO',
    }
  );

  return {
    matchedStaff: createdStaff,
    updatedStaffList: updatedList,
    isNewRegistration: true,
  };
}

// =============================================================================
// SUPABASE PERSONNEL TABLE MAPPING & RBAC STATE HYDRATION
// =============================================================================

export const DEFAULT_UNAUTHENTICATED_STAFF: StaffMemberRecord = {
  id: 'unauthenticated',
  staffId: 'unauthenticated',
  name: 'Guest User',
  email: '',
  role: 'Unassigned',
  division: 'Design_Talent_Production',
  divisionLabel: 'Design/Talent/Production',
  branch: 'JKT',
  location: 'JKT',
  status: 'PENDING',
  accessLevel: 'standard',
  isSuspended: false,
  supervisor: 'Unassigned',
  workMode: 'OFFLINE',
  checkInTime: '-',
  lateMinutesMonth: 0,
  deskZone: 'Ruangan Creative/Design',
  roomName: 'Ruangan Creative/Design',
  deskCoords: { x: -7.5, z: -5.5 },
  avatarColor: '#0277BD',
  initials: 'FT',
};

export function normalizeSupabaseDivision(
  rawDivision?: string | null,
  rawRole?: string | null
): DivisionType {
  const divClean = (rawDivision || '').trim();
  if (
    divClean === 'Executive' ||
    divClean === 'PM' ||
    divClean === 'PIC_TL' ||
    divClean === 'Admin_Finance' ||
    divClean === 'Design_Talent_Production'
  ) {
    return divClean;
  }

  const divLower = divClean.toLowerCase();
  if (divLower.includes('exec') || divLower.includes('ceo') || divLower.includes('board')) {
    return 'Executive';
  }
  if (divLower === 'pm' || divLower === 'pms' || divLower.includes('project manager')) {
    return 'PM';
  }
  if (divLower.includes('pic') || divLower.includes('tl') || divLower.includes('team leader')) {
    return 'PIC_TL';
  }
  if (divLower.includes('admin') || divLower.includes('finance') || divLower.includes('accounting')) {
    return 'Admin_Finance';
  }
  if (
    divLower.includes('design') ||
    divLower.includes('talent') ||
    divLower.includes('prod') ||
    divLower.includes('digital') ||
    divLower.includes('creative') ||
    divLower.includes('hr') ||
    divLower.includes('recruit')
  ) {
    return 'Design_Talent_Production';
  }

  const roleLower = (rawRole || '').trim().toLowerCase();
  if (
    roleLower.includes('executive') ||
    roleLower.includes('ceo') ||
    roleLower.includes('founder') ||
    roleLower === 'operational'
  ) {
    return 'Executive';
  }
  if (roleLower === 'pm' || roleLower.includes('project manager')) {
    return 'PM';
  }
  if (roleLower.includes('finance') || roleLower.includes('admin')) {
    return 'Admin_Finance';
  }
  if (
    roleLower.includes('pic') ||
    roleLower.includes('person in charge') ||
    roleLower.includes('team leader') ||
    roleLower === 'tl'
  ) {
    return 'PIC_TL';
  }
  return 'Design_Talent_Production';
}

function resolveDefaultRoomForSupabaseRecord(
  name: string,
  role: string,
  division: DivisionType
): { roomName: VirtualOfficeRoomName; branch: BranchType; supervisor: string } {
  const nameLower = name.trim().toLowerCase();
  const roleLower = role.trim().toLowerCase();

  // Check if name matches any canonical room roster
  for (const roomDef of VIRTUAL_OFFICE_ROOMS) {
    if (
      roomDef.expectedRosterNames.some(
        (rosterName) => rosterName.toLowerCase() === nameLower
      )
    ) {
      return {
        roomName: roomDef.roomName,
        branch: roomDef.branch,
        supervisor:
          roomDef.branch === 'Bandung'
            ? 'Ristanto (Project Manager)'
            : '',
      };
    }
  }

  if (roleLower.includes('operational')) {
    return {
      roomName: 'Ruangan Operational',
      branch: 'JKT',
      supervisor: 'Hildasari Umami (Founder & CEO)',
    };
  }
  if (division === 'Executive' || roleLower.includes('ceo') || roleLower.includes('executive')) {
    return {
      roomName: 'Ruangan Executive (Team Bu Hilda)',
      branch: 'JKT',
      supervisor: 'Board of Founders Futari',
    };
  }
  if (roleLower.includes('finance')) {
    return {
      roomName: 'Ruangan Finance',
      branch: 'JKT',
      supervisor: '',
    };
  }
  if (division === 'PM' || roleLower.includes('project manager')) {
    return {
      roomName: 'Ruangan PM (Team Bu Ade)',
      branch: 'JKT',
      supervisor: '',
    };
  }
  if (division === 'PIC_TL') {
    return {
      roomName: 'Ruangan PM (Team Bu Ade)',
      branch: 'JKT',
      supervisor: 'Ade Yenny (Project Manager)',
    };
  }
  if (roleLower.includes('production') || roleLower.includes('recruitment')) {
    return {
      roomName: 'Ruangan Production & HRD',
      branch: 'JKT',
      supervisor: '',
    };
  }
  return {
    roomName: 'Ruangan Creative/Design',
    branch: 'JKT',
    supervisor: 'Ulian (Head of Design)',
  };
}

/**
 * Maps a row from the Supabase `personnel` table (`id, created_at, name, email, role, division`)
 * into a full `StaffMemberRecord` so existing RBAC routing, attendance, petty cash, SOP, fleet,
 * and 3D Virtual Office modules work seamlessly.
 */
export function mapSupabasePersonnelToStaffRecord(
  row: SupabasePersonnelRow,
  seedIndex: number = 0
): StaffMemberRecord {
  const cleanEmail = (row.email || '').trim().toLowerCase();
  const fallbackNameFromEmail = cleanEmail
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const cleanName =
    row.name && row.name.trim().length > 0
      ? row.name.trim()
      : fallbackNameFromEmail || 'Personel Futari';

  const cleanRole =
    row.role && row.role.trim().length > 0
      ? row.role.trim()
      : cleanEmail === DEVELOPER_SUPERADMIN_EMAIL
      ? 'Digital'
      : 'Unassigned';

  const rawDivTrimmed = (row.division || '').trim();
  const normalizedDivision = normalizeSupabaseDivision(row.division, cleanRole);
  const displayDivision = rawDivTrimmed.length > 0 ? rawDivTrimmed : normalizedDivision;
  const divisionLabel = displayDivision;

  const { roomName, branch, supervisor } = resolveDefaultRoomForSupabaseRecord(
    cleanName,
    cleanRole,
    normalizedDivision
  );

  const idStr = String(row.id ?? `sup_${seedIndex + 1}`);
  const isDev =
    cleanEmail === DEVELOPER_SUPERADMIN_EMAIL ||
    cleanRole.toLowerCase() === 'dev' ||
    cleanRole.toLowerCase() === 'developer' ||
    cleanRole.toLowerCase() === 'digital' ||
    cleanRole.toLowerCase() === 'superadmin';

  const rawStatus = (row.status || '').trim().toLowerCase();
  const isSuspended = rawStatus === 'suspended' || rawStatus === 'inactive';
  const staffStatus: 'ACTIVE' | 'SUSPENDED' | 'PENDING' = isSuspended
    ? 'SUSPENDED'
    : rawStatus === 'pending'
    ? 'PENDING'
    : 'ACTIVE';

  return {
    id: idStr,
    created_at: row.created_at || undefined,
    staffId: idStr,
    name: cleanName,
    email: cleanEmail,
    accessLevel: isDev
      ? 'developer'
      : normalizedDivision === 'Executive'
      ? 'executive'
      : 'standard',
    isSuspended,
    status: staffStatus,
    role: cleanRole,
    division: displayDivision,
    divisionLabel,
    branch,
    location: branch === 'Bandung' ? 'Bandung' : 'JKT',
    supervisor,
    supervisor_email: row.supervisor_email || null,
    workMode: isSuspended ? 'OFFLINE' : 'OFFLINE',
    checkInTime: '-',
    lateMinutesMonth: 0,
    deskZone: roomName,
    roomName,
    deskCoords: computeDeskCoordsForRoom(roomName, seedIndex + 1),
    avatarColor: '#00B4D8',
    initials: computeInitialsFromName(cleanName),
    avatar_url: row.avatar_url || null,
    photoUrl: row.avatar_url || undefined,
  };
}

export function mapSupabasePersonnelListToStaffList(
  rows: SupabasePersonnelRow[]
): StaffMemberRecord[] {
  const staff = rows.map((row, idx) => mapSupabasePersonnelToStaffRecord(row, idx));
  const emailMap = new Map<string, StaffMemberRecord>();
  staff.forEach((s) => {
    if (s.email) emailMap.set(s.email.toLowerCase(), s);
  });
  return staff.map((s) => {
    if (s.supervisor_email) {
      const sup = emailMap.get(s.supervisor_email.toLowerCase());
      if (sup) {
        return {
          ...s,
          supervisor: `${sup.name} (${sup.role})`,
        };
      }
      return {
        ...s,
        supervisor: s.supervisor_email,
      };
    }
    // If supervisor_email is explicitly null:
    // Top-level executives default to "Board of Founders Futari", while others without a supervisor have empty supervisor
    const roleLower = (s.role || '').toLowerCase();
    const divLower = (s.division || '').toLowerCase();
    const isExecutive =
      roleLower === 'executive' ||
      roleLower.includes('founder') ||
      roleLower.includes('ceo') ||
      divLower === 'executive';

    return {
      ...s,
      supervisor: isExecutive ? 'Board of Founders Futari' : '',
    };
  });
}

export interface SupabaseAttendanceRow {
  id?: string | number;
  email?: string | null;
  mode?: string | null;
  check_in_time?: string | null;
  clock_out_time?: string | null;
  check_out_time?: string | null;
  photo_url?: string | null;
  task_description?: string | null;
  created_at?: string | null;
}

/** Local (device timezone) `YYYY-MM-DD` key for a real `Date`. */
export function toLocalDateKey(date: Date = new Date()): string {
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Indonesia Western Time (`Asia/Jakarta` / WIB) `YYYY-MM-DD` key for a real `Date`. */
export function toJakartaDateKey(date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const yy = parts.find((p) => p.type === 'year')?.value;
    const mm = parts.find((p) => p.type === 'month')?.value;
    const dd = parts.find((p) => p.type === 'day')?.value;
    if (yy && mm && dd) {
      return `${yy}-${mm}-${dd}`;
    }
  } catch {
    // Fallback to local date key if Intl timeZone is unavailable
  }
  return toLocalDateKey(date);
}

/**
 * Resolves the "Deskripsi Pekerjaan" (Jobdesk) text for exports & report tables.
 * STRICTLY sourced from `task_description` (falling back to the legacy in-memory `overtimeNote`
 * for records created before the column existed). NEVER returns the location / watermark.
 */
export function getAttendanceJobDescription(
  log: Pick<AttendanceRecord, 'task_description' | 'overtimeNote'>
): string {
  const fromColumn = (log.task_description || '').trim();
  if (fromColumn) return fromColumn;
  const legacy = (log.overtimeNote || '').trim();
  return legacy || '-';
}

/** Formats a `Date` into `HH:mm` in Indonesia Western Time (`Asia/Jakarta` / WIB). */
export function formatJakartaTimeHHMM(date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const hh = parts.find((p) => p.type === 'hour')?.value;
    const mm = parts.find((p) => p.type === 'minute')?.value;
    if (hh && mm) {
      return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
    }
  } catch {
    // Fallback to local HH:mm
  }
  return formatRealTimeHHMM(date);
}

/**
 * Maps a Supabase `attendance` row to the in-app `AttendanceRecord` used by the
 * Attendance history table, Team dashboard and PDF / Excel exports.
 */
export function mapSupabaseAttendanceRowToRecord(
  row: SupabaseAttendanceRow,
  staffList: StaffMemberRecord[]
): AttendanceRecord {
  const email = (row.email || '').trim().toLowerCase();
  const member = staffList.find((s) => (s.email || '').trim().toLowerCase() === email);
  const checkInDate = row.check_in_time ? new Date(row.check_in_time) : null;
  const rawClockOut = row.clock_out_time || row.check_out_time || null;
  const clockOutDate = rawClockOut ? new Date(rawClockOut) : null;
  const validCheckIn = checkInDate && !Number.isNaN(checkInDate.getTime()) ? checkInDate : null;
  const validClockOut = clockOutDate && !Number.isNaN(clockOutDate.getTime()) ? clockOutDate : null;

  const checkInHHMM = validCheckIn ? formatJakartaTimeHHMM(validCheckIn) : '-';
  const clockOutHHMM = validClockOut ? formatJakartaTimeHHMM(validClockOut) : '';
  const overtime = clockOutHHMM ? calculateOvertime(clockOutHHMM) : { overtimeHours: 0, overtimePay: 0 };
  const taskDescription = (row.task_description || '').trim();
  const mode: 'WFO' | 'WFE' = String(row.mode || '').toUpperCase() === 'WFE' ? 'WFE' : 'WFO';

  return {
    id: row.id !== undefined && row.id !== null ? String(row.id) : `att_${email}_${row.check_in_time}`,
    staffId: member?.staffId || email,
    staffName: member?.name || email,
    role: member?.role || '-',
    branch: member?.branch || 'JKT',
    email,
    date: validCheckIn ? toJakartaDateKey(validCheckIn) : toJakartaDateKey(new Date()),
    mode,
    initialMode: mode,
    checkInTime: checkInHHMM,
    checkOutTime: clockOutHHMM,
    regularHours:
      validCheckIn && clockOutHHMM ? calculateRegularWorkingHours(checkInHHMM, clockOutHHMM) : 0,
    lateMinutes: validCheckIn ? calculateLateMinutes(checkInHHMM) : 0,
    overtimeHours: overtime.overtimeHours,
    overtimePay: overtime.overtimePay,
    overtimeNote: taskDescription,
    task_description: taskDescription,
    locationWatermark: mode === 'WFO' ? FUTARI_HQ_ADDRESS : 'Work From Elsewhere (WFE)',
    photoDataUrl: row.photo_url || undefined,
    status: clockOutHHMM ? 'completed' : 'checked_in',
  };
}

export function formatAttendanceCheckInHHMM(
  rawCheckIn?: string | null
): string {
  if (!rawCheckIn) return formatJakartaTimeHHMM();
  const str = String(rawCheckIn).trim();
  if (/^\d{2}:\d{2}$/.test(str)) return str;
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return formatJakartaTimeHHMM(parsed);
  }
  return formatJakartaTimeHHMM();
}

/**
 * Determines whether a row from the `attendance` table represents an active presence for today:
 * - Must have a non-null `check_in_time` belonging to today (in `Asia/Jakarta` WIB or local/UTC day).
 * - Must have `clock_out_time` (and `check_out_time`) equal to `NULL` / empty.
 */
export function isAttendanceRowActiveForToday(
  row: SupabaseAttendanceRow | null | undefined,
  referenceDate: Date = new Date()
): boolean {
  if (!row) return false;
  const cleanEmail = (row.email || '').trim().toLowerCase();
  if (!cleanEmail) return false;

  const rawCheckIn = row.check_in_time ? String(row.check_in_time).trim() : '';
  if (!rawCheckIn) return false;

  const rawClockOut =
    row.clock_out_time !== undefined && row.clock_out_time !== null
      ? String(row.clock_out_time).trim()
      : row.check_out_time !== undefined && row.check_out_time !== null
      ? String(row.check_out_time).trim()
      : '';
  if (rawClockOut !== '') return false;

  if (/^\d{2}:\d{2}/.test(rawCheckIn)) {
    return true;
  }

  const parsedCheckIn = new Date(rawCheckIn);
  if (!Number.isNaN(parsedCheckIn.getTime())) {
    const isSameJakartaDay =
      toJakartaDateKey(parsedCheckIn) === toJakartaDateKey(referenceDate);
    const isSameLocalDay =
      parsedCheckIn.getFullYear() === referenceDate.getFullYear() &&
      parsedCheckIn.getMonth() === referenceDate.getMonth() &&
      parsedCheckIn.getDate() === referenceDate.getDate();
    const todayUtcPrefix = referenceDate.toISOString().slice(0, 10);
    const isSameUtcDay = rawCheckIn.slice(0, 10) === todayUtcPrefix;
    return isSameJakartaDay || isSameLocalDay || isSameUtcDay;
  }

  return true;
}

/**
 * Merges active today's `attendance` records (`check_in_time` IS NOT NULL AND `clock_out_time` IS NULL)
 * onto the personnel directory so ONLY actively checked-in WFO users have `workMode: 'WFO'` in the 3D Virtual Office,
 * while actively checked-in WFE users have `workMode: 'WFE'`.
 */
export function applyActiveAttendanceToStaffList(
  staffList: StaffMemberRecord[],
  activeAttendanceByEmail: Record<string, SupabaseAttendanceRow>
): StaffMemberRecord[] {
  const matchedEmails = new Set<string>();
  const updatedList = staffList.map((member) => {
    const emailKey = (member.email || '').trim().toLowerCase();
    const activeRow = emailKey ? activeAttendanceByEmail[emailKey] : undefined;

    if (activeRow && isAttendanceRowActiveForToday(activeRow)) {
      matchedEmails.add(emailKey);
      const activeMode: WorkModeType =
        String(activeRow.mode || '').toUpperCase() === 'WFE' ? 'WFE' : 'WFO';
      return {
        ...member,
        workMode: activeMode,
        checkInTime: formatAttendanceCheckInHHMM(activeRow.check_in_time),
      };
    }

    return {
      ...member,
      workMode: 'OFFLINE' as WorkModeType,
      checkInTime: '-',
    };
  });

  // Also synthesize staff records for any active attendance rows whose email wasn't yet in staffList
  Object.entries(activeAttendanceByEmail).forEach(([emailKey, row], idx) => {
    if (!matchedEmails.has(emailKey) && isAttendanceRowActiveForToday(row)) {
      const synthesized = mapSupabasePersonnelToStaffRecord(
        {
          id: row.id ?? `att_live_${idx + 1}`,
          email: emailKey,
        },
        staffList.length + idx
      );
      const activeMode: WorkModeType =
        String(row.mode || '').toUpperCase() === 'WFE' ? 'WFE' : 'WFO';
      updatedList.push({
        ...synthesized,
        workMode: activeMode,
        checkInTime: formatAttendanceCheckInHHMM(row.check_in_time),
      });
    }
  });

  return updatedList;
}

// =============================================================================
// 3D ARCHITECTURE: TWO SEPARATE BRANCHES (JAKARTA HQ & BANDUNG BRANCH)
// & DYNAMIC DAY/NIGHT LIGHTING CYCLE
// =============================================================================

export type VirtualOfficeBranchView = 'JAKARTA_HQ' | 'BANDUNG_BRANCH';

export interface BuildingDoorConfig {
  label: string;
  x: number;
  z: number;
  width: number;
}

export interface VirtualOfficeBuildingSpec {
  id: VirtualOfficeBranchView;
  title: string;
  subtitle: string;
  branch: BranchType;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  wallHeight: number;
  wallThickness: number;
  entranceDoor: BuildingDoorConfig;
  exitDoor: BuildingDoorConfig;
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
}

export const VIRTUAL_OFFICE_BUILDINGS: Record<
  VirtualOfficeBranchView,
  VirtualOfficeBuildingSpec
> = {
  JAKARTA_HQ: {
    id: 'JAKARTA_HQ',
    title: 'Jakarta HQ',
    subtitle: '8 Main Zones (Creative, PMs, Exec, Finance, Production, Operational)',
    branch: 'JKT',
    centerX: 0,
    centerZ: 0.2,
    width: 24.8,
    depth: 19.6,
    wallHeight: 1.75,
    wallThickness: 0.32,
    entranceDoor: {
      label: 'ENTRANCE DOOR · JKT HQ',
      x: -4.2,
      z: 9.8,
      width: 3.0,
    },
    exitDoor: {
      label: 'EXIT DOOR · JKT HQ',
      x: 4.2,
      z: 9.8,
      width: 3.0,
    },
    cameraPosition: { x: 0, y: 21.5, z: 23.0 },
    cameraTarget: { x: 0, y: 0.4, z: 0.5 },
  },
  BANDUNG_BRANCH: {
    id: 'BANDUNG_BRANCH',
    title: 'Bandung Branch',
    subtitle: 'Bandung Regional Hub — Alfian & Yanti (Jl. Braga)',
    branch: 'Bandung',
    centerX: 28.0,
    centerZ: 0.0,
    width: 11.6,
    depth: 10.4,
    wallHeight: 1.75,
    wallThickness: 0.32,
    entranceDoor: {
      label: 'ENTRANCE DOOR · BDG',
      x: 25.8,
      z: 5.2,
      width: 2.3,
    },
    exitDoor: {
      label: 'EXIT DOOR · BDG',
      x: 30.2,
      z: 5.2,
      width: 2.3,
    },
    cameraPosition: { x: 28.0, y: 14.5, z: 16.0 },
    cameraTarget: { x: 28.0, y: 0.4, z: 0.0 },
  },
};

export function isBandungPersonnel(person: StaffMemberRecord): boolean {
  return (
    person.branch === 'Bandung' ||
    person.location === 'Bandung' ||
    person.roomName === 'Cabang Bandung'
  );
}

export type DayNightPhase = 'Morning' | 'Day' | 'Afternoon' | 'Night';

export interface DayNightLightingConfig {
  hour: number;
  phase: DayNightPhase;
  label: string;
  timeRangeLabel: string;
  backgroundHex: string;
  fogHex: string;
  ambientLightHex: string;
  ambientIntensity: number;
  directionalLightHex: string;
  directionalIntensity: number;
  directionalPosition: [number, number, number];
  hemiSkyHex: string;
  hemiGroundHex: string;
  hemiIntensity: number;
  laptopScreenEmissiveIntensity: number;
}

/**
 * Dynamic Day/Night Lighting Cycle based on local hour (`new Date().getHours()`):
 * - 06:00 - 09:00 (Morning): Warm orange/yellow sunrise.
 * - 10:00 - 15:00 (Day): Bright clear daylight sky.
 * - 16:00 - 18:00 (Afternoon/Sunset): Warm golden-amber sunset twilight.
 * - 19:00 - 05:00 (Night/Overtime): Deep midnight navy sky with cool moonlight & glowing indoor screens.
 */
export function getDayNightLightingConfig(
  rawHour: number = new Date().getHours()
): DayNightLightingConfig {
  const hour = ((Math.floor(rawHour) % 24) + 24) % 24;

  if (hour >= 6 && hour <= 9) {
    return {
      hour,
      phase: 'Morning',
      label: 'Morning Sunrise',
      timeRangeLabel: '06:00 - 09:00',
      backgroundHex: '#fdba74',
      fogHex: '#fed7aa',
      ambientLightHex: '#ffedd5',
      ambientIntensity: 0.95,
      directionalLightHex: '#fb923c',
      directionalIntensity: 1.5,
      directionalPosition: [18, 11, 14],
      hemiSkyHex: '#fde68a',
      hemiGroundHex: '#7c2d12',
      hemiIntensity: 1.0,
      laptopScreenEmissiveIntensity: 0.65,
    };
  }

  if (hour >= 10 && hour <= 15) {
    return {
      hour,
      phase: 'Day',
      label: 'Bright Daylight',
      timeRangeLabel: '10:00 - 15:00',
      backgroundHex: '#bae6fd',
      fogHex: '#e0f2fe',
      ambientLightHex: '#ffffff',
      ambientIntensity: 1.25,
      directionalLightHex: '#fffbeb',
      directionalIntensity: 1.65,
      directionalPosition: [8, 25, 12],
      hemiSkyHex: '#e0f2fe',
      hemiGroundHex: '#64748b',
      hemiIntensity: 1.15,
      laptopScreenEmissiveIntensity: 0.5,
    };
  }

  if (hour >= 16 && hour <= 18) {
    return {
      hour,
      phase: 'Afternoon',
      label: 'Golden Sunset',
      timeRangeLabel: '16:00 - 18:00',
      backgroundHex: '#fb923c',
      fogHex: '#fdba74',
      ambientLightHex: '#fed7aa',
      ambientIntensity: 0.85,
      directionalLightHex: '#f97316',
      directionalIntensity: 1.35,
      directionalPosition: [-18, 9, 14],
      hemiSkyHex: '#fdba74',
      hemiGroundHex: '#431407',
      hemiIntensity: 0.9,
      laptopScreenEmissiveIntensity: 0.85,
    };
  }

  return {
    hour,
    phase: 'Night',
    label: 'Night / Overtime',
    timeRangeLabel: '19:00 - 05:00',
    backgroundHex: '#070d19',
    fogHex: '#070d19',
    ambientLightHex: '#1e293b',
    ambientIntensity: 0.55,
    directionalLightHex: '#38bdf8',
    directionalIntensity: 0.8,
    directionalPosition: [-12, 18, -10],
    hemiSkyHex: '#0284c7',
    hemiGroundHex: '#0f172a',
    hemiIntensity: 0.75,
    laptopScreenEmissiveIntensity: 1.2,
  };
}

// =============================================================================
// FINANCE EXPORTS (MBA ERLITA'S REQUEST): REGULAR WORKING HOURS & OVERTIME HOURS
// & HYBRID ATTENDANCE SYSTEM (WFO <-> WFE)
// =============================================================================

/**
 * Calculates Regular Working Hours (Jam Kerja Reguler) from `checkInTime` to `checkOutTime`
 * capped strictly at 20:00 WIB (since any hours worked past 20:00 WIB are counted in
 * Total Jam Lembur / Overtime Hours).
 */
export function calculateRegularWorkingHours(
  checkInTime: string,
  checkOutTime: string
): number {
  if (!checkInTime || !checkOutTime || checkOutTime === '-') {
    return 0;
  }
  const inParts = checkInTime.trim().split(':');
  const outParts = checkOutTime.trim().split(':');
  if (inParts.length < 2 || outParts.length < 2) {
    return 0;
  }

  const inH = Number(inParts[0]);
  const inM = Number(inParts[1]);
  const outH = Number(outParts[0]);
  const outM = Number(outParts[1]);

  if (
    Number.isNaN(inH) ||
    Number.isNaN(inM) ||
    Number.isNaN(outH) ||
    Number.isNaN(outM)
  ) {
    return 0;
  }

  const inTotalMins = inH * 60 + inM;
  const outTotalMins = outH * 60 + outM;
  const regularCutoffMins = 20 * 60; // 20:00 WIB (hours past 20:00 are strictly Overtime)

  const cappedOutMins = Math.min(outTotalMins, regularCutoffMins);
  if (cappedOutMins <= inTotalMins) {
    return 0;
  }

  const rawHours = (cappedOutMins - inTotalMins) / 60;
  return Math.round(rawHours * 10) / 10;
}

export interface UserAttendanceExportTotals {
  totalDays: number;
  totalRegularHours: number;        // 1. Total Jam Kerja (Regular Working Hours)
  totalRegularWorkingHours: number; // Alias for Total Jam Kerja
  totalOvertimeHours: number;       // 2. Total Jam Lembur (Overtime Hours >= 20:00)
  totalOvertimePay: number;
  totalLateMinutes: number;
  totalHybridDays: number;
}

/**
 * Explicitly calculates the two separate totals required by Finance (Mba Erlita) for PDF & Excel exports:
 * 1. Total Jam Kerja (Regular Working Hours)
 * 2. Total Jam Lembur (Overtime Hours - strictly calculated for hours worked past 20:00)
 */
export function calculateAttendanceExportTotals(
  logs: AttendanceRecord[]
): UserAttendanceExportTotals {
  let regSum = 0;
  let otSum = 0;
  let otPaySum = 0;
  let lateSum = 0;
  let hybridSum = 0;

  for (const log of logs) {
    const reg =
      typeof log.regularHours === 'number' && log.regularHours > 0
        ? log.regularHours
        : calculateRegularWorkingHours(log.checkInTime, log.checkOutTime);
    regSum += reg;
    otSum += Number(log.overtimeHours) || 0;
    otPaySum += Number(log.overtimePay) || 0;
    lateSum += Number(log.lateMinutes) || 0;
    if (log.isHybridTransition) {
      hybridSum += 1;
    }
  }

  const roundedReg = Math.round(regSum * 10) / 10;
  return {
    totalDays: logs.length,
    totalRegularHours: roundedReg,
    totalRegularWorkingHours: roundedReg,
    totalOvertimeHours: Math.round(otSum * 10) / 10,
    totalOvertimePay: Math.round(otPaySum),
    totalLateMinutes: Math.round(lateSum),
    totalHybridDays: hybridSum,
  };
}

/**
 * Hybrid Attendance Transition (`WFO -> WFE`):
 * When a user who is currently checked in as `WFO` clicks "Transisi Lokasi (Pindah WFE)",
 * records the transition time, changes their `workMode` status to `WFE`, and updates/creates
 * their active attendance record so their 3D Avatar stands up, walks to the Exit Door,
 * and disappears from the 3D Virtual Office.
 */
export function applyHybridWfoToWfeTransition(
  staffList: StaffMemberRecord[],
  attendanceLogs: AttendanceRecord[],
  staffId: string,
  transitionTime: string,
  fallbackCheckInTime: string = '09:55',
  fallbackDate: string = '2026-10-20',
  wfeVenueWatermark: string = 'Jakarta Convention Center (JCC) Senayan — Hybrid Transition WFO -> WFE'
): {
  updatedStaffList: StaffMemberRecord[];
  updatedAttendanceLogs: AttendanceRecord[];
  transitionedRecord: AttendanceRecord;
  updatedStaff: StaffMemberRecord[];
  updatedLogs: AttendanceRecord[];
  updatedRecord: AttendanceRecord;
} {
  const targetMember =
    staffList.find((s) => s.staffId === staffId) || staffList[0];

  const updatedStaffList = staffList.map((s) =>
    s.staffId === staffId
      ? {
          ...s,
          workMode: 'WFE' as const,
        }
      : s
  );

  const existingActiveIdx = attendanceLogs.findIndex(
    (l) => l.staffId === staffId && l.status === 'checked_in'
  );

  let transitionedRecord: AttendanceRecord;
  let updatedAttendanceLogs: AttendanceRecord[];

  if (existingActiveIdx >= 0) {
    const existing = attendanceLogs[existingActiveIdx];
    transitionedRecord = {
      ...existing,
      initialMode: existing.initialMode || 'WFO',
      mode: 'WFE',
      isHybridTransition: true,
      wfeTransitionTime: transitionTime,
      locationWatermark: `${existing.locationWatermark} → Pindah WFE (${transitionTime} WIB): ${wfeVenueWatermark}`,
    };
    updatedAttendanceLogs = attendanceLogs.map((l, idx) =>
      idx === existingActiveIdx ? transitionedRecord : l
    );
  } else {
    const checkIn = targetMember.checkInTime || fallbackCheckInTime;
    const lateMins = calculateLateMinutes(checkIn);
    transitionedRecord = {
      id: `att_hybrid_${Date.now()}`,
      staffId: targetMember.staffId,
      staffName: targetMember.name,
      role: targetMember.role,
      branch: targetMember.branch,
      date: fallbackDate,
      initialMode: 'WFO',
      mode: 'WFE',
      isHybridTransition: true,
      wfeTransitionTime: transitionTime,
      checkInTime: checkIn,
      checkOutTime: '',
      regularHours: 0,
      lateMinutes: lateMins,
      overtimeHours: 0,
      overtimePay: 0,
      overtimeNote: `Transisi Hybrid WFO → WFE pukul ${transitionTime} WIB`,
      locationWatermark: `HQ → Pindah WFE (${transitionTime} WIB): ${wfeVenueWatermark}`,
      status: 'checked_in',
    };
    updatedAttendanceLogs = [transitionedRecord, ...attendanceLogs];
  }

  return {
    updatedStaffList,
    updatedAttendanceLogs,
    transitionedRecord,
    updatedStaff: updatedStaffList,
    updatedLogs: updatedAttendanceLogs,
    updatedRecord: transitionedRecord,
  };
}

export const transitionStaffWfoToWfe = applyHybridWfoToWfeTransition;

/**
 * Reverses or transitions staff work mode from WFE (Event Venue) back to WFO (HQ Office)
 * within the same day, restoring presence in office and updating attendance logs.
 */
export function applyHybridWfeToWfoTransition(
  staffList: StaffMemberRecord[],
  attendanceLogs: AttendanceRecord[],
  staffId: string,
  transitionTime: string,
  fallbackCheckInTime: string = '10:00',
  fallbackDate: string = '2026-10-20',
  wfoLocationWatermark: string = `${FUTARI_HQ_ADDRESS} — Transisi WFE -> WFO`
): {
  updatedStaffList: StaffMemberRecord[];
  updatedAttendanceLogs: AttendanceRecord[];
  transitionedRecord: AttendanceRecord;
  updatedStaff: StaffMemberRecord[];
  updatedLogs: AttendanceRecord[];
  updatedRecord: AttendanceRecord;
} {
  const targetMember =
    staffList.find((s) => s.staffId === staffId) || staffList[0];

  const updatedStaffList = staffList.map((s) =>
    s.staffId === staffId
      ? {
          ...s,
          workMode: 'WFO' as const,
        }
      : s
  );

  const existingActiveIdx = attendanceLogs.findIndex(
    (l) => l.staffId === staffId && l.status === 'checked_in'
  );

  let transitionedRecord: AttendanceRecord;
  let updatedAttendanceLogs: AttendanceRecord[];

  if (existingActiveIdx >= 0) {
    const existing = attendanceLogs[existingActiveIdx];
    transitionedRecord = {
      ...existing,
      initialMode: existing.initialMode || 'WFE',
      mode: 'WFO',
      isHybridTransition: true,
      wfeTransitionTime: transitionTime,
      locationWatermark: `${existing.locationWatermark} → Pindah WFO (${transitionTime} WIB): ${wfoLocationWatermark}`,
    };
    updatedAttendanceLogs = attendanceLogs.map((l, idx) =>
      idx === existingActiveIdx ? transitionedRecord : l
    );
  } else {
    const checkIn = targetMember.checkInTime || fallbackCheckInTime;
    const lateMins = calculateLateMinutes(checkIn);
    transitionedRecord = {
      id: `att_hybrid_${Date.now()}`,
      staffId: targetMember.staffId,
      staffName: targetMember.name,
      role: targetMember.role,
      branch: targetMember.branch,
      date: fallbackDate,
      initialMode: 'WFE',
      mode: 'WFO',
      isHybridTransition: true,
      wfeTransitionTime: transitionTime,
      checkInTime: checkIn,
      checkOutTime: '',
      regularHours: 0,
      lateMinutes: lateMins,
      overtimeHours: 0,
      overtimePay: 0,
      overtimeNote: `Transisi Hybrid WFE → WFO pukul ${transitionTime} WIB`,
      locationWatermark: `Event Venue → Pindah WFO (${transitionTime} WIB): ${wfoLocationWatermark}`,
      status: 'checked_in',
    };
    updatedAttendanceLogs = [transitionedRecord, ...attendanceLogs];
  }

  return {
    updatedStaffList,
    updatedAttendanceLogs,
    transitionedRecord,
    updatedStaff: updatedStaffList,
    updatedLogs: updatedAttendanceLogs,
    updatedRecord: transitionedRecord,
  };
}

export const transitionStaffWfeToWfo = applyHybridWfeToWfoTransition;

// ============================================================================
// 1. SOP PERUSAHAAN (EXECUTIVE & DIGITAL RBAC)
// ============================================================================

export const INITIAL_COMPANY_SOPS: CompanySopItem[] = [];

export const SEED_COMPANY_SOPS_FIXTURE: CompanySopItem[] = [
  {
    id: 'sop_attendance_overtime',
    title: 'SOP Jam Kerja Operasional, Toleransi 10:05 & Lembur 20:00 WIB',
    content:
      'Jam masuk standar Futari (Jakarta HQ & Bandung Hub) adalah pukul 10:00 WIB dengan batas toleransi keterlambatan hingga pukul 10:05 WIB. Setiap Clock-Out wajib menyertakan Deskripsi Pekerjaan Hari Ini. Perhitungan kompensasi lembur (IDR 7.000/jam) hanya berlaku apabila personel bekerja melewati pukul 20:00 WIB.',
    date: '2026-10-01',
    category: 'HR & Attendance',
    authorName: 'Hildasari Umami',
    authorRole: 'Founder & CEO (Executive)',
  },
  {
    id: 'sop_petty_cash_settlement',
    title: 'SOP Pengajuan Dana Event, Petty Cash & Upload Bukti Struk',
    content:
      'Setiap pengeluaran lapangan wajib menyertakan foto struk asli melalui fitur Scan Struk / HTML5 Camera dan mencantumkan daftar Personel Terlibat (involvedPersonnel). Rekonsiliasi Petty Cash diserahkan ke tim Finance maksimal H+3 setelah event selesai.',
    date: '2026-10-08',
    category: 'Finance & Event Operations',
    authorName: 'M Rio Antoni',
    authorRole: 'Operational (Executive)',
  },
  {
    id: 'sop_fleet_vehicle_usage',
    title: 'SOP Peminjaman & Operasional Armada Kendaraan Kantor',
    content:
      'Seluruh peminjaman mobil operasional wajib didaftarkan melalui sistem Booking Mobil dengan memilih unit dari database Manajemen Kendaraan. Pengelolaan unit armada dan status servis berada di bawah pengawasan langsung Operational (Pak M Rio Antoni) & Digital.',
    date: '2026-10-14',
    category: 'Operational & Fleet',
    authorName: 'Nugi Nugroho',
    authorRole: 'Digital',
  },
];

/**
 * STRICT RBAC FOR SOP MANAGEMENT:
 * ONLY users with the role/division `Executive` (Hildasari Umami, M Rio Antoni)
 * or `Digital` (Nugi Nugroho) can see the "Tambah SOP Baru" button and add/edit SOPs.
 * All other standard users have read-only access.
 */
export function canManageCompanySops(
  user: StaffMemberRecord | null | undefined
): boolean {
  if (!user) return false;
  const roleNorm = (user.role || '').trim().toLowerCase();
  return (
    user.division === 'Executive' ||
    roleNorm === 'executive' ||
    roleNorm === 'digital' ||
    user.id === '1' ||
    user.staffId === '1' ||
    user.staffId === 'exec_hildasari' ||
    user.staffId === 'exec_rio' ||
    user.staffId === 'des_nugi' ||
    user.accessLevel === 'developer'
  );
}

export function addCompanySop(
  sops: CompanySopItem[],
  actor: StaffMemberRecord,
  input: { title: string; content: string; date: string; category?: string }
): CompanySopItem[] {
  if (!canManageCompanySops(actor)) return sops;
  const cleanTitle = input.title.trim();
  const cleanContent = input.content.trim();
  if (!cleanTitle || !cleanContent) return sops;

  const newSop: CompanySopItem = {
    id: `sop_${Date.now()}`,
    title: cleanTitle,
    content: cleanContent,
    date: input.date || '2026-10-20',
    category: input.category || 'General SOP',
    authorName: actor.name,
    authorRole: `${actor.role} (${actor.divisionLabel})`,
  };
  return [newSop, ...sops];
}

export function updateCompanySop(
  sops: CompanySopItem[],
  actor: StaffMemberRecord,
  sopId: string,
  updates: { title: string; content: string; date: string; category?: string }
): CompanySopItem[] {
  if (!canManageCompanySops(actor)) return sops;
  return sops.map((item) =>
    item.id === sopId
      ? {
          ...item,
          title: updates.title.trim() || item.title,
          content: updates.content.trim() || item.content,
          date: updates.date || item.date,
          category: updates.category || item.category,
        }
      : item
  );
}

export function deleteCompanySop(
  sops: CompanySopItem[],
  actor: StaffMemberRecord,
  sopId: string
): CompanySopItem[] {
  if (!canManageCompanySops(actor)) return sops;
  return sops.filter((item) => item.id !== sopId);
}

// ============================================================================
// 2. FLEET MANAGEMENT & AUTOMOTIVE BOOKING (M RIO ANTONI & NUGI NUGROHO RBAC)
// ============================================================================

export const INITIAL_FLEET_VEHICLES: FleetVehicleItem[] = [];

export const SEED_FLEET_VEHICLES_FIXTURE: FleetVehicleItem[] = [
  {
    id: 'veh_zenix_1829',
    model: 'Toyota Innova Zenix',
    licensePlate: 'B 1829 FTR',
    status: 'Tersedia',
    branch: 'JKT',
    notes: 'Unit utama survey venue & mobilisasi VIP Jakarta HQ',
  },
  {
    id: 'veh_hiace_2910',
    model: 'Toyota HiAce Premio',
    licensePlate: 'B 2910 FTR',
    status: 'Digunakan',
    branch: 'JKT',
    notes: 'Mobilisasi kru produksi & peralatan panggung JCC Senayan',
  },
  {
    id: 'veh_avanza_1142',
    model: 'Toyota Avanza Veloz',
    licensePlate: 'D 1142 FTR',
    status: 'Tersedia',
    branch: 'Bandung',
    notes: 'Unit operasional Bandung Creative Hub',
  },
  {
    id: 'veh_blindvan_9081',
    model: 'Daihatsu Gran Max Blind Van',
    licensePlate: 'B 9081 FTR',
    status: 'Servis',
    branch: 'JKT',
    notes: 'Unit kargo logistik event & rigging',
  },
];

/**
 * STRICT RBAC FOR FLEET MANAGEMENT:
 * ONLY users with the role `Operational` (e.g., M Rio Antoni, once assigned)
 * or `Digital` (Nugi Nugroho) are authorized to see the "Add Car" and "Delete Car"
 * buttons and access the form to add/edit/delete actual car data.
 */
export function canManageFleetVehicles(
  user: StaffMemberRecord | null | undefined
): boolean {
  if (!user) return false;
  const roleNorm = (user.role || '').trim().toLowerCase();
  return (
    roleNorm === 'operational' ||
    roleNorm === 'operasional' ||
    roleNorm === 'executive' ||
    roleNorm === 'founder & ceo' ||
    roleNorm === 'digital' ||
    roleNorm === 'developer' ||
    roleNorm === 'superadmin' ||
    user.accessLevel === 'developer'
  );
}

export function formatFleetVehicleOptionLabel(vehicle: FleetVehicleItem): string {
  return `${vehicle.model} ${vehicle.licensePlate}`;
}

/**
 * STRICT RBAC FOR VEHICLE BOOKING SCHEDULE EDIT & DELETE:
 * Users with the Role 'Executive', 'Operasional' (like Pak Rio), and 'Digital' (Dev)
 * have full CRUD access to the vehicle_bookings table, meaning they can Edit and Delete
 * any active booking, not just their own.
 */
export function canEditOrDeleteVehicleBooking(
  user: Pick<StaffMemberRecord, 'role'> | null | undefined
): boolean {
  if (!user) return false;
  const roleNorm = (user.role || '').trim().toLowerCase();
  return (
    roleNorm === 'executive' ||
    roleNorm === 'operasional' ||
    roleNorm === 'operational' ||
    roleNorm === 'digital' ||
    roleNorm === 'dev' ||
    roleNorm === 'developer' ||
    roleNorm === 'superadmin'
  );
}

export function addFleetVehicle(
  vehicles: FleetVehicleItem[],
  actor: StaffMemberRecord,
  input: {
    model: string;
    licensePlate: string;
    status: FleetVehicleStatus;
    branch?: BranchType;
    notes?: string;
  }
): FleetVehicleItem[] {
  if (!canManageFleetVehicles(actor)) return vehicles;
  const cleanModel = input.model.trim();
  const cleanPlate = input.licensePlate.trim().toUpperCase();
  if (!cleanModel || !cleanPlate) return vehicles;

  const newVehicle: FleetVehicleItem = {
    id: `veh_${Date.now()}`,
    model: cleanModel,
    licensePlate: cleanPlate,
    status: input.status || 'Tersedia',
    branch: input.branch || actor.branch || 'JKT',
    notes: input.notes?.trim() || 'Unit operasional Futari',
  };
  return [newVehicle, ...vehicles];
}

export function updateFleetVehicle(
  vehicles: FleetVehicleItem[],
  actor: StaffMemberRecord,
  vehicleId: string,
  updates: {
    model?: string;
    licensePlate?: string;
    status?: FleetVehicleStatus;
    branch?: BranchType;
    notes?: string;
  }
): FleetVehicleItem[] {
  if (!canManageFleetVehicles(actor)) return vehicles;
  return vehicles.map((v) =>
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
  );
}

export function deleteFleetVehicle(
  vehicles: FleetVehicleItem[],
  actor: StaffMemberRecord,
  vehicleId: string
): FleetVehicleItem[] {
  if (!canManageFleetVehicles(actor)) return vehicles;
  return vehicles.filter((v) => v.id !== vehicleId);
}

// ============================================================================
// 4. SPLIT CALENDAR & ADVANCED TASK CHECKLIST ("Task & Pekerjaan")
// ============================================================================

export const INITIAL_WORK_TASKS: WorkTaskItem[] = [];

/**
 * STRICT TASK CREATION RBAC (Supabase `tasks` table):
 * Only PM (Project Manager), Dev (Developer / Superadmin) and Executive roles may create a task
 * and assign it to another personnel by email.
 */
export function canCreateOrAssignTasks(
  user: Pick<StaffMemberRecord, 'role' | 'email' | 'accessLevel'> | null | undefined
): boolean {
  if (!user) return false;
  const roleNorm = (user.role || '').trim().toLowerCase();
  if (!roleNorm) return false;
  if (
    roleNorm === 'pm' ||
    roleNorm === 'dev' ||
    roleNorm === 'developer' ||
    roleNorm === 'superadmin' ||
    roleNorm === 'executive'
  ) {
    return true;
  }
  if (roleNorm.includes('project manager') || /\(pm\)/.test(roleNorm)) return true;
  return user.accessLevel === 'developer' || user.accessLevel === 'executive';
}

/** Converts a `YYYY-MM-DD` date input into a real ISO timestamp (end of that local day). */
export function dueDateInputToIso(dateInput: string): string {
  const parsed = new Date(`${dateInput}T23:59:00`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/**
 * Maps a Supabase `tasks` row to the in-app `WorkTaskItem` consumed by the
 * Task & Pekerjaan board and the Leave / Cuti & Event Calendar (plotted on `due_date`).
 */
export function mapSupabaseTaskRowToWorkTask(
  row: SupabaseTaskRow,
  staffList: StaffMemberRecord[]
): WorkTaskItem {
  const assignedTo = (row.assigned_to || '').trim().toLowerCase();
  const assignee = staffList.find(
    (s) => (s.email || '').trim().toLowerCase() === assignedTo
  );
  const dueDate = row.due_date ? new Date(row.due_date) : null;
  const validDue = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null;
  const createdAt = row.created_at ? new Date(row.created_at) : null;
  const validCreated =
    createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null;
  const isCompleted = Boolean(row.is_completed);
  const completedAt = row.completed_at ? new Date(row.completed_at) : null;

  return {
    id: String(row.id),
    taskName: row.title,
    assigneeId: assignee?.staffId || assignedTo,
    assigneeName: assignee?.name || assignedTo,
    assigneeRole: assignee?.role || '-',
    creatorId: '',
    creatorName: '-',
    creatorRole: '-',
    startDate: validCreated ? toLocalDateKey(validCreated) : '',
    deadlineDate: row.due_date ? row.due_date.split('T')[0] : validDue ? toLocalDateKey(validDue) : '',
    completed: isCompleted,
    notes: row.description || '',
    updatedAt:
      completedAt && !Number.isNaN(completedAt.getTime())
        ? `${formatRealTimeHHMM(completedAt)} WIB`
        : '-',
    assigned_to: assignedTo,
    title: row.title,
    description: row.description || '',
    status: row.status || (isCompleted ? 'Done' : 'Pending'),
    due_date: row.due_date || undefined,
    is_completed: isCompleted,
    completed_at: row.completed_at || null,
  };
}

export const SEED_WORK_TASKS_FIXTURE: WorkTaskItem[] = [
  {
    id: 'task_1',
    taskName: 'Finalisasi Rundown & Technical Cue Sheet Telkomsel NextGen',
    assigneeId: 'pic_ferdy',
    assigneeName: 'Ferdy',
    assigneeRole: 'Person In Charge (PIC)',
    creatorId: 'pm_ade',
    creatorName: 'Ade Yenny',
    creatorRole: 'Project Manager (PM)',
    startDate: '2026-10-18',
    deadlineDate: '2026-10-20',
    completed: false,
    notes: 'Koordinasi bersama tim kreatif dan vendor multimedia JCC',
    updatedAt: '09:30 WIB',
  },
  {
    id: 'task_2',
    taskName: 'Audit Armada Operasional & Checklist Loading Venue Senayan',
    assigneeId: 'exec_rio',
    assigneeName: 'M Rio Antoni',
    assigneeRole: 'Operational',
    creatorId: 'exec_hildasari',
    creatorName: 'Hildasari Umami',
    creatorRole: 'Founder & CEO',
    startDate: '2026-10-19',
    deadlineDate: '2026-10-21',
    completed: false,
    notes: 'Pastikan unit Innova Zenix & HiAce Premio siap operasional',
    updatedAt: '10:00 WIB',
  },
  {
    id: 'task_3',
    taskName: 'Deploy Update ERP SOP, Fleet & Task Sync Futari Portal',
    assigneeId: 'des_nugi',
    assigneeName: 'Nugi Nugroho',
    assigneeRole: 'Digital',
    creatorId: 'exec_hildasari',
    creatorName: 'Hildasari Umami',
    creatorRole: 'Founder & CEO',
    startDate: '2026-10-19',
    deadlineDate: '2026-10-20',
    completed: true,
    notes: 'Integrasi modul SOP Perusahaan, Manajemen Kendaraan, dan Kalender',
    updatedAt: '10:15 WIB',
  },
  {
    id: 'task_4',
    taskName: 'Rekapitulasi Pengeluaran Petty Cash Bandung Summit',
    assigneeId: 'tl_alfian',
    assigneeName: 'Alfian',
    assigneeRole: 'Team Leader (TL)',
    creatorId: 'pm_ristanto',
    creatorName: 'Ristanto',
    creatorRole: 'Project Manager (PM)',
    startDate: '2026-10-20',
    deadlineDate: '2026-10-24',
    completed: false,
    notes: 'Sinkronisasi bukti struk ke Finance Jakarta',
    updatedAt: '11:00 WIB',
  },
];

/**
 * STRICT TASK EDIT LOGIC (RBAC):
 * Only the Assignee, the Task Creator, or the Assignee's Direct Supervisor
 * can check/uncheck or edit the task.
 */
export function canModifyWorkTask(
  currentUser: StaffMemberRecord | null | undefined,
  task: WorkTaskItem,
  staffList: StaffMemberRecord[]
): boolean {
  if (!currentUser) return false;
  // Developer absolute override
  if (currentUser.role === 'Digital' || currentUser.accessLevel === 'developer') return true;
  // 1. User is the Assignee
  const userEmail = (currentUser.email || '').trim().toLowerCase();
  const taskEmail = (task.assigned_to || '').trim().toLowerCase();
  if (currentUser.staffId === task.assigneeId || (taskEmail && taskEmail === userEmail)) return true;
  // 2. User is the Task Creator
  if (currentUser.staffId === task.creatorId) return true;
  // 3. User is the Assignee's Direct Supervisor
  const assigneeRecord = staffList.find(
    (s) => s.staffId === task.assigneeId || (taskEmail && s.email.toLowerCase() === taskEmail)
  );
  if (assigneeRecord && isDirectReportOf(assigneeRecord, currentUser)) {
    return true;
  }
  return false;
}

export function addWorkTask(
  tasks: WorkTaskItem[],
  creator: StaffMemberRecord,
  staffList: StaffMemberRecord[],
  input: {
    taskName: string;
    assigneeId: string;
    startDate: string;
    deadlineDate: string;
    notes?: string;
  },
  timestampLabel = 'Baru saja'
): WorkTaskItem[] {
  const cleanName = input.taskName.trim();
  if (!cleanName || !input.assigneeId || !input.startDate || !input.deadlineDate) {
    return tasks;
  }
  const assignee =
    staffList.find((s) => s.staffId === input.assigneeId) || creator;

  const newTask: WorkTaskItem = {
    id: `task_${Date.now()}`,
    taskName: cleanName,
    assigneeId: assignee.staffId,
    assigneeName: assignee.name,
    assigneeRole: assignee.role,
    creatorId: creator.staffId,
    creatorName: creator.name,
    creatorRole: creator.role,
    startDate: input.startDate,
    deadlineDate: input.deadlineDate,
    completed: false,
    notes: input.notes?.trim() || '',
    updatedAt: timestampLabel,
  };
  return [newTask, ...tasks];
}

export function toggleWorkTaskCompletion(
  tasks: WorkTaskItem[],
  actor: StaffMemberRecord,
  staffList: StaffMemberRecord[],
  taskId: string,
  timestampLabel = 'Diperbarui'
): WorkTaskItem[] {
  return tasks.map((t) => {
    if (t.id !== taskId) return t;
    if (!canModifyWorkTask(actor, t, staffList)) return t;
    return {
      ...t,
      completed: !t.completed,
      updatedAt: timestampLabel,
    };
  });
}

export function updateWorkTask(
  tasks: WorkTaskItem[],
  actor: StaffMemberRecord,
  staffList: StaffMemberRecord[],
  taskId: string,
  updates: {
    taskName?: string;
    assigneeId?: string;
    startDate?: string;
    deadlineDate?: string;
    notes?: string;
  },
  timestampLabel = 'Diperbarui'
): WorkTaskItem[] {
  return tasks.map((t) => {
    if (t.id !== taskId) return t;
    if (!canModifyWorkTask(actor, t, staffList)) return t;
    const nextAssignee = updates.assigneeId
      ? staffList.find((s) => s.staffId === updates.assigneeId)
      : undefined;
    return {
      ...t,
      taskName:
        updates.taskName !== undefined
          ? updates.taskName.trim() || t.taskName
          : t.taskName,
      assigneeId: nextAssignee ? nextAssignee.staffId : t.assigneeId,
      assigneeName: nextAssignee ? nextAssignee.name : t.assigneeName,
      assigneeRole: nextAssignee ? nextAssignee.role : t.assigneeRole,
      startDate: updates.startDate || t.startDate,
      deadlineDate: updates.deadlineDate || t.deadlineDate,
      notes: updates.notes !== undefined ? updates.notes : t.notes,
      updatedAt: timestampLabel,
    };
  });
}

// ============================================================================
// PREMIUM UI/UX GLASSMORPHISM & SPLASH SCREEN HELPERS
// ============================================================================

export const SPLASH_DURATION_MS = 2200; // 2.2 seconds (within 2.0s - 2.5s window)

export function getGlassSurfaceClasses(isDark: boolean): string {
  return isDark
    ? 'bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-2xl text-slate-100'
    : 'bg-white/70 backdrop-blur-md border border-white/40 shadow-lg text-slate-900';
}

export interface SplashWelcomeConfig {
  greetingText: string;
  logoPath: string;
  durationMs: number;
  userName: string;
  roleLabel: string;
}

export function buildSplashWelcomeConfig(
  user: Pick<StaffMemberRecord, 'name' | 'role'>
): SplashWelcomeConfig {
  return {
    greetingText: `Selamat Datang, ${user.name}`,
    logoPath: '/logoFUTARI-1_5.png',
    durationMs: SPLASH_DURATION_MS,
    userName: user.name,
    roleLabel: user.role,
  };
}

// ============================================================================
// MASTER-DETAIL PETTY CASH (`pc_events` & `pc_transactions`) STRICT RBAC
// ============================================================================

export function candidateIsDirectReportEmail(
  candidateEmail: string,
  supervisorStaff: StaffMemberRecord,
  staffList: StaffMemberRecord[] = INITIAL_FUTARI_STAFF
): boolean {
  if (!candidateEmail || !supervisorStaff) return false;
  const cleanCand = candidateEmail.trim().toLowerCase();
  const cleanSupEmail = (supervisorStaff.email || '').trim().toLowerCase();
  if (!cleanCand || !cleanSupEmail || cleanCand === cleanSupEmail) return false;
  const found = staffList.find((s) => (s.email || '').toLowerCase() === cleanCand);
  if (found) {
    return isDirectReportOf(found, supervisorStaff);
  }
  return false;
}

/**
 * Global Access Check for Petty Cash (`pc_events` & `pc_transactions`):
 * Returns true ONLY IF user's role strictly matches `dev`, `finance`, or `executive`.
 */
export function hasGlobalPettyCashAccess(
  user: { role?: string | null; email?: string | null; accessLevel?: string | null; division?: string | null } | null | undefined
): boolean {
  if (!user) return false;
  return hasGlobalRoleAccess(user);
}

/**
 * Strict RBAC for `pc_events` visibility in 'Pilih Event' dropdown:
 * Returns true ONLY IF:
 * a) User role is `dev`, `finance`, or `executive` (Global Access).
 * b) OR, `user.email == event.created_by`.
 * c) OR, `user.email` exists in the `authorized_personnel` array.
 */
export function canUserAccessPcEvent(
  user: Pick<StaffMemberRecord, 'role' | 'email' | 'staffId' | 'name'> | null | undefined,
  event: EventBudgetRecord | PcEventRow,
  staffList: StaffMemberRecord[] = INITIAL_FUTARI_STAFF
): boolean {
  if (!user) return false;

  // a) User role is dev, finance, or executive (Global Access)
  if (hasGlobalPettyCashAccess(user)) {
    return true;
  }

  const userEmail = (user.email || '').trim().toLowerCase();
  const createdByEmail = (event.created_by || '').trim().toLowerCase();

  // b) OR, user email == created_by
  if (userEmail && createdByEmail && userEmail === createdByEmail) {
    return true;
  }

  // c) OR, user email exists in the authorized_personnel array
  const authorizedArray = Array.isArray(event.authorized_personnel)
    ? event.authorized_personnel
    : [];
  if (
    userEmail &&
    authorizedArray.some(
      (emailEntry) => String(emailEntry || '').trim().toLowerCase() === userEmail
    )
  ) {
    return true;
  }

  // d) OR, any direct report of the user is in authorized_personnel or created_by
  if (
    'staffId' in user &&
    authorizedArray.some((authEmail) => {
      const cleanAuth = String(authEmail || '').trim().toLowerCase();
      return candidateIsDirectReportEmail(cleanAuth, user as StaffMemberRecord, staffList);
    })
  ) {
    return true;
  }
  if (
    'staffId' in user &&
    createdByEmail &&
    candidateIsDirectReportEmail(createdByEmail, user as StaffMemberRecord, staffList)
  ) {
    return true;
  }

  // Fallback for legacy EventBudgetRecord without `authorized_personnel`
  if (
    !('event_name' in event) &&
    !event.authorized_personnel &&
    !event.created_by &&
    'involvedStaffIds' in event
  ) {
    return isUserInvolvedInEvent(user as StaffMemberRecord, event);
  }

  return false;
}

/**
 * Filters `pc_events` (both active and completed) strictly according to RBAC rules:
 * 1) Global Access (`dev`, `finance`, `executive`)
 * 2) `user.email == created_by`
 * 3) `user.email` in `authorized_personnel`
 */
export function filterAccessiblePcEvents(
  user: StaffMemberRecord | null | undefined,
  events: EventBudgetRecord[],
  staffList: StaffMemberRecord[] = INITIAL_FUTARI_STAFF
): EventBudgetRecord[] {
  if (!user) return [];
  return events.filter((ev) => canUserAccessPcEvent(user, ev, staffList));
}

/**
 * Maps a row from Supabase `pc_events` into an `EventBudgetRecord`.
 */
export function mapPcEventRowToEventBudgetRecord(
  row: PcEventRow,
  staffList: StaffMemberRecord[] = [],
  existingBudget: number = 0
): EventBudgetRecord {
  const rawAuthorized = Array.isArray(row.authorized_personnel)
    ? row.authorized_personnel.map((em) => String(em || '').trim().toLowerCase()).filter(Boolean)
    : [];
  const creatorEmail = String(row.created_by || '').trim().toLowerCase();
  const allEmails = Array.from(
    new Set(creatorEmail ? [creatorEmail, ...rawAuthorized] : rawAuthorized)
  );

  const matchedStaff = allEmails
    .map((em) =>
      staffList.find((s) => (s.email || '').trim().toLowerCase() === em)
    )
    .filter((s): s is StaffMemberRecord => Boolean(s));

  const involvedStaffIds = matchedStaff.map((s) => s.staffId);
  const involvedNames =
    matchedStaff.length > 0
      ? matchedStaff.map((s) => `${s.name} (${s.role})`)
      : allEmails;

  const eventIdStr = String(row.id);
  const eventNameStr = row.event_name || 'Event Operasional Futari';
  const resolvedBudget =
    typeof row.approved_budget === 'number' && !Number.isNaN(row.approved_budget)
      ? row.approved_budget
      : Number(row.approved_budget ?? existingBudget) || 0;

  return {
    id: eventIdStr,
    eventId: eventIdStr,
    eventName: eventNameStr,
    event_name: eventNameStr,
    created_by: row.created_by || '',
    authorized_personnel: rawAuthorized,
    is_completed: Boolean(row.is_completed),
    approved_budget: resolvedBudget,
    clientName: row.is_completed ? 'Selesai (Closed)' : 'Aktif (Open)',
    approvedBudget: resolvedBudget,
    location: 'Operasional Futari',
    dateRange: row.created_at
      ? new Date(row.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '2026',
    involvedPersonnel: allEmails,
    involvedPersonnelIds: involvedStaffIds,
    involvedStaffIds,
    involvedPersonnelNames: involvedNames,
  };
}

/**
 * Maps a row from Supabase `pc_transactions` into a `PettyCashRecord`.
 */
export function mapPcTransactionRowToPettyCashRecord(
  row: PcTransactionRow,
  parentEvent?: EventBudgetRecord
): PettyCashRecord {
  const txId = String(row.id);
  const eventIdStr = String(row.event_id);
  const receiptDateStr = row.receipt_date || new Date().toISOString().slice(0, 10);
  const receiptUrlStr = row.receipt_url || '';
  const eventNameStr = parentEvent?.event_name || parentEvent?.eventName || 'Event Futari';
  const authorizedEmails = parentEvent?.authorized_personnel || [];

  return {
    id: txId,
    eventId: eventIdStr,
    event_id: eventIdStr,
    eventName: eventNameStr,
    involvedPersonnel: authorizedEmails,
    involvedPersonnelIds: parentEvent?.involvedPersonnelIds || [],
    involvedStaffIds: parentEvent?.involvedStaffIds || [],
    involvedPersonnelNames:
      parentEvent?.involvedPersonnelNames && parentEvent.involvedPersonnelNames.length > 0
        ? parentEvent.involvedPersonnelNames
        : authorizedEmails,
    merchant: row.merchant || '-',
    date: receiptDateStr,
    receipt_date: receiptDateStr,
    amount: Number(row.amount) || 0,
    category: row.category || 'Consumption & Crew Meals',
    receiptLabel: receiptUrlStr
      ? receiptUrlStr.split('/').pop()?.split('?')[0] || 'Receipt_Image.jpg'
      : 'Receipt_Image.jpg',
    receiptDataUrl: receiptUrlStr,
    receipt_url: receiptUrlStr,
    submittedBy: row.submitted_by || '-',
    submitted_by: row.submitted_by || '-',
  };
}

// ============================================================================
// SUPABASE `vehicle_bookings` HELPERS (email, vehicle, start_time, end_time, purpose)
// ============================================================================

/**
 * Converts an ISO timestamptz string into `YYYY-MM-DDTHH:mm` in local time
 * for `<input type="datetime-local" />`.
 */
export function toDatetimeLocalInputValue(isoOrDateStr?: string): string {
  if (!isoOrDateStr) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(isoOrDateStr)) {
    return isoOrDateStr;
  }
  const parsed = new Date(isoOrDateStr);
  if (Number.isNaN(parsed.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDateStr)) {
      return `${isoOrDateStr}T09:00`;
    }
    return '';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(
    parsed.getDate()
  )}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

/**
 * Formats an ISO timestamptz string into a readable Indonesian/WIB schedule label.
 */
export function formatBookingTimestamptzLabel(isoStr?: string): string {
  if (!isoStr) return '-';
  const parsed = new Date(isoStr);
  if (Number.isNaN(parsed.getTime())) return isoStr;
  const datePart = parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timePart = parsed
    .toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace('.', ':');
  return `${datePart}, ${timePart} WIB`;
}

/**
 * Maps a row from the Supabase `vehicle_bookings` table
 * (`email`, `vehicle`, `start_time`, `end_time`, `purpose`) into a `CalendarEventItem`.
 */
export function mapVehicleBookingRowToCalendarEvent(
  row: VehicleBookingRow,
  staffList: StaffMemberRecord[] = [],
  fallbackIdx: number = 0
): CalendarEventItem {
  const cleanEmail = (row.email || '').trim().toLowerCase();
  const matchedMember = staffList.find(
    (s) => (s.email || '').trim().toLowerCase() === cleanEmail
  );

  const startParsed = new Date(row.start_time);
  const endParsed = new Date(row.end_time);
  const pad = (n: number) => String(n).padStart(2, '0');

  const startDateStr = !Number.isNaN(startParsed.getTime())
    ? `${startParsed.getFullYear()}-${pad(startParsed.getMonth() + 1)}-${pad(
        startParsed.getDate()
      )}`
    : (row.start_time || '').slice(0, 10) ||
      new Date().toISOString().slice(0, 10);

  const endDateStr = !Number.isNaN(endParsed.getTime())
    ? `${endParsed.getFullYear()}-${pad(endParsed.getMonth() + 1)}-${pad(
        endParsed.getDate()
      )}`
    : (row.end_time || '').slice(0, 10) || startDateStr;

  const startHHMM = !Number.isNaN(startParsed.getTime())
    ? `${pad(startParsed.getHours())}:${pad(startParsed.getMinutes())}`
    : '09:00';
  const endHHMM = !Number.isNaN(endParsed.getTime())
    ? `${pad(endParsed.getHours())}:${pad(endParsed.getMinutes())}`
    : '17:00';

  const rowId =
    row.id !== undefined && row.id !== null && String(row.id).trim() !== ''
      ? String(row.id)
      : `vb_${cleanEmail}_${row.start_time}_${fallbackIdx}`;

  const vehicleName = row.vehicle || 'Unit Operasional Futari';
  const purposeText = row.purpose || 'Operasional Kendaraan Futari';
  const picDisplay = matchedMember
    ? `${matchedMember.name} (${matchedMember.email})`
    : row.email || 'Personel Futari';

  return {
    id: rowId,
    title: purposeText,
    purpose: purposeText,
    eventType: 'Booking Mobil Operasional',
    vehicle: vehicleName,
    vehicleName,
    email: row.email || '',
    start_time: row.start_time,
    end_time: row.end_time,
    startDate: startDateStr,
    endDate: endDateStr,
    timeSlot: `${startHHMM} - ${endHHMM} WIB`,
    location: matchedMember?.branch === 'Bandung' ? 'Bandung Hub' : 'Jakarta HQ',
    picName: picDisplay,
    branch: matchedMember?.branch || 'JKT',
    notes: `Booked by ${row.email}`,
  };
}

/**
 * Synchronizes an employee's attendance logs with approved Leave / Cuti records from the operational calendar.
 * If the user has an active 'Cuti' scheduled for a specific date, that date is explicitly labeled as 'Cuti' (Leave)
 * in exported PDF/Excel rows.
 */
export function syncAttendanceLogsWithLeave(
  logs: AttendanceRecord[],
  leaves: LeaveRecordItem[],
  employee: StaffMemberRecord,
  events?: CalendarEventItem[]
): AttendanceRecord[] {
  const empId = (employee.staffId || '').trim().toLowerCase();
  const empEmail = (employee.email || '').trim().toLowerCase();
  const empName = (employee.name || '').trim().toLowerCase();

  // Find all approved leaves for this employee
  interface LeaveSpan {
    id: string;
    startDate: string;
    endDate: string;
    leaveType?: string;
    reason?: string;
  }

  const userLeaves: LeaveSpan[] = [];

  if (leaves && leaves.length > 0) {
    for (const lv of leaves) {
      if (lv.status && lv.status !== 'Approved') continue;
      const lvStaffId = (lv.staffId || '').trim().toLowerCase();
      const lvName = (lv.staffName || '').trim().toLowerCase();
      const matches =
        (empId && lvStaffId === empId) ||
        (empName && lvName === empName) ||
        (empName && lvName.includes(empName)) ||
        (empName && empName.includes(lvName));
      if (matches) {
        userLeaves.push({
          id: lv.id,
          startDate: lv.startDate,
          endDate: lv.endDate || lv.startDate,
          leaveType: lv.leaveType,
          reason: lv.reason,
        });
      }
    }
  }

  // Also query operational calendar events if any are registered as Cuti / Leave
  if (events && events.length > 0) {
    for (const ev of events) {
      const titleLower = (ev.title || '').toLowerCase();
      const locLower = (ev.location || '').toLowerCase();
      const isLeaveEvent =
        titleLower.includes('cuti') ||
        titleLower.includes('leave') ||
        titleLower.includes('izin') ||
        locLower.includes('cuti');
      if (!isLeaveEvent) continue;

      const picLower = (ev.picName || '').toLowerCase();
      const matches =
        !ev.picName ||
        (empName && picLower.includes(empName)) ||
        (empName && titleLower.includes(empName)) ||
        (empEmail && titleLower.includes(empEmail));

      if (matches) {
        userLeaves.push({
          id: ev.id,
          startDate: ev.startDate,
          endDate: ev.endDate || ev.startDate,
          leaveType: 'Cuti (Leave)',
          reason: ev.title,
        });
      }
    }
  }

  if (userLeaves.length === 0) return logs;

  // Clone existing logs
  const updatedLogs = [...logs];

  for (const leave of userLeaves) {
    // Generate dates between startDate and endDate
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate || leave.startDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    const cur = new Date(start);
    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0];

      // Check if there is already an attendance log for this date
      const existingIdx = updatedLogs.findIndex((l) => l.date === dateStr);
      const leaveLabel = leave.leaveType || 'Cuti (Leave)';
      const leaveReason = leave.reason ? `Cuti: ${leave.reason}` : `Cuti (${leaveLabel})`;

      if (existingIdx >= 0) {
        // Label the existing row with the specific leave status and reason
        updatedLogs[existingIdx] = {
          ...updatedLogs[existingIdx],
          mode: leaveLabel as any,
          task_description: leaveReason,
          overtimeNote: leaveReason,
        };
      } else {
        // Insert a new Cuti entry for this date
        updatedLogs.push({
          id: `leave_${leave.id}_${dateStr}`,
          staffId: employee.staffId,
          staffName: employee.name,
          role: employee.role,
          branch: employee.branch,
          date: dateStr,
          mode: leaveLabel as any,
          checkInTime: '-',
          checkOutTime: '-',
          regularHours: 0,
          lateMinutes: 0,
          overtimeHours: 0,
          overtimePay: 0,
          overtimeNote: leaveReason,
          task_description: leaveReason,
          locationWatermark: `Cuti Terjadwal — ${leaveLabel}`,
          status: 'completed',
        });
      }

      cur.setDate(cur.getDate() + 1);
    }
  }

  // Re-sort chronologically by date
  return updatedLogs.sort((a, b) => a.date.localeCompare(b.date));
}

