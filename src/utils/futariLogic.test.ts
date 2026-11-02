import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_FUTARI_STAFF,
  INITIAL_PERSONNEL,
  SEED_FUTARI_STAFF_FIXTURE,
  INITIAL_EVENT_BUDGETS,
  SEED_EVENT_BUDGETS_FIXTURE,
  INITIAL_ATTENDANCE_LOGS,
  SEED_ATTENDANCE_LOGS_FIXTURE,
  INITIAL_CHAT_MESSAGES,
  SEED_CHAT_MESSAGES_FIXTURE,
  INITIAL_LEAVE_RECORDS,
  SEED_LEAVE_RECORDS_FIXTURE,
  INITIAL_CALENDAR_EVENTS,
  SEED_CALENDAR_EVENTS_FIXTURE,
  VIRTUAL_OFFICE_ROOMS,
  filterActiveWfoPersonnel,
  groupActiveWfoByRoom,
  calculateLateMinutes,
  calculateOvertime,
  getActivePayrollCycle,
  calculatePettyCashSummary,
  buildMonthlyCalendarGrid,
  canViewAllPettyCash,
  filterVisibleEventsForUser,
  filterVisiblePettyCashExpenses,
  canViewAllAttendance,
  canViewOtherStaffAttendance,
  canUserViewStaffAttendance,
  getAccessibleAttendancePersonnel,
  filterAttendanceLogsForUser,
  OVERTIME_RATE_PER_HOUR,
  FUTARI_HQ_ADDRESS,
  FUTARI_CYAN_HIGHLIGHT_HEX,
  formatCheckInWib,
  getHighlightedAvatarHudData,
  resolveNextHighlightedStaffId,
  DEVELOPER_SUPERADMIN_EMAIL,
  DEVELOPER_SUPERADMIN_PASSWORD,
  isDeveloperSuperadmin,
  authenticateStaffCredentials,
  updateStaffRoleAndDivision,
  toggleStaffSuspensionStatus,
  deleteStaffMember,
  registerNewGoogleWorkspaceAccount,
  isDirectReportOf,
  getDirectReportsForSupervisor,
  INITIAL_DAILY_CHECKLISTS,
  SEED_DAILY_CHECKLISTS_FIXTURE,
  canModifyDailyChecklist,
  getDailyChecklistsGroupedByPersonnel,
  toggleDailyChecklistItem,
  addDailyChecklistItem,
  editDailyChecklistItem,
  deleteDailyChecklistItem,
  getStaffAvatar3DConfig,
  updateOwnProfileSelfService,
  superadminUpdateAnyProfile,
  PITI_PERSONA_SYSTEM_INSTRUCTION,
  buildPitiSystemInstruction,
  mapFirebaseUserToStaffProfile,
  VIRTUAL_OFFICE_BUILDINGS,
  isBandungPersonnel,
  getDayNightLightingConfig,
  calculateRegularWorkingHours,
  calculateAttendanceExportTotals,
  transitionStaffWfoToWfe,
  EventBudgetRecord,
  AttendanceRecord,
  INITIAL_PETTY_CASH_EVENTS,
  INITIAL_PETTY_CASH_EXPENSES,
  SEED_PETTY_CASH_EXPENSES_FIXTURE,
  INITIAL_COMPANY_SOPS,
  SEED_COMPANY_SOPS_FIXTURE,
  canManageCompanySops,
  addCompanySop,
  updateCompanySop,
  deleteCompanySop,
  INITIAL_FLEET_VEHICLES,
  SEED_FLEET_VEHICLES_FIXTURE,
  canManageFleetVehicles,
  formatFleetVehicleOptionLabel,
  addFleetVehicle,
  updateFleetVehicle,
  deleteFleetVehicle,
  INITIAL_WORK_TASKS,
  SEED_WORK_TASKS_FIXTURE,
  canModifyWorkTask,
  addWorkTask,
  toggleWorkTaskCompletion,
  updateWorkTask,
  SPLASH_DURATION_MS,
  getGlassSurfaceClasses,
  buildSplashWelcomeConfig,
  canAccessTeamAttendanceTab,
  getTeamDashboardPersonnel,
  buildTeamDashboardExportLogs,
} from './futariLogic';

test('Database updates: Dina Pratiwi is completely removed, Andri and Tohir (Talent Leaders, JKT) are added', () => {
  const names = SEED_FUTARI_STAFF_FIXTURE.map((s) => s.name);

  // Verify Dina Pratiwi is completely removed
  assert.ok(!names.includes('Dina Pratiwi'));
  assert.ok(!SEED_FUTARI_STAFF_FIXTURE.some((s) => s.name.toLowerCase().includes('dina')));

  // Verify Andri (Role: Talent Leader, Location: JKT)
  const andri = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.name === 'Andri');
  assert.ok(andri, 'Andri must exist in SEED_FUTARI_STAFF_FIXTURE');
  assert.equal(andri.role, 'Talent Leader');
  assert.equal(andri.branch, 'JKT');
  assert.equal(andri.roomName, 'Ruangan Creative/Design');

  // Verify Tohir (Role: Talent Leader, Location: JKT)
  const tohir = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.name === 'Tohir');
  assert.ok(tohir, 'Tohir must exist in SEED_FUTARI_STAFF_FIXTURE');
  assert.equal(tohir.role, 'Talent Leader');
  assert.equal(tohir.branch, 'JKT');
  assert.equal(tohir.roomName, 'Ruangan Production & HRD');

  // Verify 23 total personnel in fixture across the 9 exact rooms
  assert.equal(SEED_FUTARI_STAFF_FIXTURE.length, 23);
});

test('3D Virtual Office & Avatar Grid: Strict WFO-only visibility and exact 9-Room grouping', () => {
  // 1. Strict WFO-only filter excludes WFE (e.g. Gusman, Bobby, Tiara) and OFFLINE users
  const activeWfo = filterActiveWfoPersonnel(SEED_FUTARI_STAFF_FIXTURE);
  assert.ok(activeWfo.length > 0);
  assert.ok(activeWfo.every((s) => s.workMode === 'WFO'));
  assert.ok(!activeWfo.some((s) => s.name === 'Bobby')); // Bobby is WFE
  assert.ok(!activeWfo.some((s) => s.name === 'Gusman Razak')); // Gusman is WFE
  assert.ok(!activeWfo.some((s) => s.name === 'Tiara')); // Tiara is WFE

  // Test that if a user is set to OFFLINE or WFE, they are strictly hidden
  const modifiedStaff = SEED_FUTARI_STAFF_FIXTURE.map((s) =>
    s.name === 'Nugi Nugroho' ? { ...s, workMode: 'OFFLINE' as const } : s
  );
  const modifiedWfo = filterActiveWfoPersonnel(modifiedStaff);
  assert.ok(!modifiedWfo.some((s) => s.name === 'Nugi Nugroho'));

  // 2. Verify exact 9 rooms and their assigned rosters
  assert.equal(VIRTUAL_OFFICE_ROOMS.length, 9);
  const groupedRooms = groupActiveWfoByRoom(SEED_FUTARI_STAFF_FIXTURE);
  assert.equal(groupedRooms.length, 9);

  const byRoomName = Object.fromEntries(
    groupedRooms.map((r) => [r.roomName, r])
  );

  // Ruangan Creative/Design: Ulian, Raul, Nugi Nugroho, Andri
  assert.deepEqual(byRoomName['Ruangan Creative/Design'].expectedRosterNames, [
    'Ulian',
    'Raul',
    'Nugi Nugroho',
    'Andri',
  ]);
  assert.deepEqual(
    byRoomName['Ruangan Creative/Design'].activeWfoMembers.map((m) => m.name),
    ['Ulian', 'Raul', 'Nugi Nugroho', 'Andri']
  );

  // Ruangan PM (Team Bu Ade): Ade Yenny, Ferdy, Sesil
  assert.deepEqual(
    byRoomName['Ruangan PM (Team Bu Ade)'].activeWfoMembers.map((m) => m.name),
    ['Ade Yenny', 'Ferdy', 'Sesil']
  );

  // Ruangan PM (Team Pak Ristanto): Ristanto, Bobby (WFE -> hidden), Salima
  assert.deepEqual(
    byRoomName['Ruangan PM (Team Pak Ristanto)'].activeWfoMembers.map(
      (m) => m.name
    ),
    ['Ristanto', 'Salima']
  );

  // Ruangan PM (Team Mas Gusman): Gusman (WFE -> hidden), Novita (PIC)
  assert.deepEqual(
    byRoomName['Ruangan PM (Team Mas Gusman)'].activeWfoMembers.map(
      (m) => m.name
    ),
    ['Novita (PIC)']
  );

  // Ruangan Executive (Team Bu Hilda): Hildasari Umami, Nana, Zahra
  assert.deepEqual(
    byRoomName['Ruangan Executive (Team Bu Hilda)'].activeWfoMembers.map(
      (m) => m.name
    ),
    ['Hildasari Umami', 'Nana', 'Zahra']
  );

  // Ruangan Production & HRD: Tiara (WFE -> hidden), Iza, Tohir
  assert.deepEqual(
    byRoomName['Ruangan Production & HRD'].activeWfoMembers.map((m) => m.name),
    ['Iza', 'Tohir']
  );

  // Ruangan Finance: Erlita, Novita (Finance)
  assert.deepEqual(
    byRoomName['Ruangan Finance'].activeWfoMembers.map((m) => m.name),
    ['Erlita', 'Novita (Finance)']
  );

  // Ruangan Operational: M Rio Antoni
  assert.deepEqual(
    byRoomName['Ruangan Operational'].activeWfoMembers.map((m) => m.name),
    ['M Rio Antoni']
  );

  // Cabang Bandung: Alfian, Yanti
  assert.deepEqual(
    byRoomName['Cabang Bandung'].activeWfoMembers.map((m) => m.name),
    ['Alfian', 'Yanti']
  );
});

test('Strict Petty Cash Privacy (RBAC): Executive, Finance, and Digital (Nugi) see ALL events globally; PIC/PM/TL only see events in involvedPersonnelIds', () => {
  const hildasari = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'exec_hildasari')!;
  const rio = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'exec_rio')!;
  const erlita = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'fin_erlita')!;
  const novitaFin = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'fin_novita')!;
  const nugi = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'des_nugi')!;
  const ade = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pm_ade')!;
  const ferdy = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pic_ferdy')!;
  const alfian = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'tl_alfian')!;

  // Blank Slate check: INITIAL_EVENT_BUDGETS starts as []
  assert.deepEqual(INITIAL_EVENT_BUDGETS, []);

  const sampleEventBudgets: EventBudgetRecord[] = [
    {
      eventId: 'evt_jkt_activation',
      eventName: 'Telkomsel NextGen Brand Activation JKT',
      clientName: 'PT Telekomunikasi Selular',
      approvedBudget: 35000000,
      location: 'JCC Senayan',
      dateRange: '18 Okt – 22 Okt 2026',
      involvedPersonnelIds: ['des_nugi', 'pm_ade', 'pic_ferdy'],
      involvedStaffIds: ['des_nugi', 'pm_ade', 'pic_ferdy'],
      involvedPersonnelNames: ['Nugi Nugroho', 'Ade Yenny', 'Ferdy'],
    },
    {
      eventId: 'evt_bdg_fest',
      eventName: 'Bandung Creative Experience Summit',
      clientName: 'Pemprov Jabar',
      approvedBudget: 25000000,
      location: 'Trans Luxury Hotel Bandung',
      dateRange: '20 Okt – 24 Okt 2026',
      involvedPersonnelIds: ['tl_alfian', 'rec_yanti'],
      involvedStaffIds: ['tl_alfian', 'rec_yanti'],
      involvedPersonnelNames: ['Alfian', 'Yanti'],
    },
    {
      eventId: 'evt_exec_gala',
      eventName: 'Mandiri Private Wealth Gala Dinner',
      clientName: 'Bank Mandiri',
      approvedBudget: 40000000,
      location: 'The Langham Jakarta',
      dateRange: '21 Okt – 23 Okt 2026',
      involvedPersonnelIds: ['pm_ristanto', 'pic_salima'],
      involvedStaffIds: ['pm_ristanto', 'pic_salima'],
      involvedPersonnelNames: ['Ristanto', 'Salima'],
    },
  ];

  // Exception Rule: Executive, Finance, and Digital (Nugi Nugroho) bypass restriction
  assert.equal(canViewAllPettyCash(hildasari), true);
  assert.equal(canViewAllPettyCash(rio), true);
  assert.equal(canViewAllPettyCash(erlita), true);
  assert.equal(canViewAllPettyCash(novitaFin), true);
  assert.equal(canViewAllPettyCash(nugi), true);

  // Standard users (PM, PIC, TL) are restricted to involvedPersonnelIds
  assert.equal(canViewAllPettyCash(ade), false);
  assert.equal(canViewAllPettyCash(ferdy), false);
  assert.equal(canViewAllPettyCash(alfian), false);

  assert.equal(filterVisibleEventsForUser(hildasari, sampleEventBudgets).length, 3);
  assert.equal(filterVisibleEventsForUser(erlita, sampleEventBudgets).length, 3);
  assert.equal(filterVisibleEventsForUser(nugi, sampleEventBudgets).length, 3);

  const adeEvents = filterVisibleEventsForUser(ade, sampleEventBudgets);
  assert.equal(adeEvents.length, 1);
  assert.equal(adeEvents[0].eventId, 'evt_jkt_activation');

  const alfianEvents = filterVisibleEventsForUser(alfian, sampleEventBudgets);
  assert.equal(alfianEvents.length, 1);
  assert.equal(alfianEvents[0].eventId, 'evt_bdg_fest');

  const sampleExpenses = [
    {
      id: 'exp_1',
      eventId: 'evt_jkt_activation',
      eventName: 'Telkomsel NextGen Brand Activation JKT',
      involvedPersonnelIds: ['des_nugi', 'pm_ade'],
      involvedStaffIds: ['des_nugi', 'pm_ade'],
      involvedPersonnelNames: ['Nugi Nugroho', 'Ade Yenny'],
      merchant: 'Kopi Kenangan',
      date: '2026-10-20',
      amount: 345000,
      category: 'Consumption',
      receiptLabel: 'struk1.jpg',
      submittedBy: 'Zahra',
    },
    {
      id: 'exp_2',
      eventId: 'evt_bdg_fest',
      eventName: 'Bandung Creative Experience Summit',
      involvedPersonnelIds: ['tl_alfian', 'rec_yanti'],
      involvedStaffIds: ['tl_alfian', 'rec_yanti'],
      involvedPersonnelNames: ['Alfian', 'Yanti'],
      merchant: 'Catering Braga',
      date: '2026-10-20',
      amount: 500000,
      category: 'Consumption',
      receiptLabel: 'struk2.jpg',
      submittedBy: 'Alfian',
    },
  ];

  assert.equal(
    filterVisiblePettyCashExpenses(hildasari, sampleEventBudgets, sampleExpenses).length,
    2
  );
  assert.equal(
    filterVisiblePettyCashExpenses(nugi, sampleEventBudgets, sampleExpenses).length,
    2
  );
  assert.equal(
    filterVisiblePettyCashExpenses(ade, sampleEventBudgets, sampleExpenses).length,
    1
  );
  assert.equal(
    filterVisiblePettyCashExpenses(alfian, sampleEventBudgets, sampleExpenses).length,
    1
  );
});

test('Strict Attendance RBAC (Global vs Team Access): Executive, Finance & Digital have Global Access; PMs/PICs/Admins have Team Access (own + same division + direct reports)', () => {
  const nugi = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'des_nugi')!;
  const hildasari = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'exec_hildasari')!;
  const rio = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'exec_rio')!;
  const erlita = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'fin_erlita')!;
  const novitaFin = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'fin_novita')!;
  const ade = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pm_ade')!;
  const ristanto = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pm_ristanto')!;
  const ferdy = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pic_ferdy')!;
  const sesil = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'adm_sesil')!;
  const salima = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pic_salima')!;

  // Blank Slate check: INITIAL_ATTENDANCE_LOGS starts as []
  assert.deepEqual(INITIAL_ATTENDANCE_LOGS, []);

  // 1. Global Access: Executive (Hildasari, Rio), Finance (Erlita, Novita), and Digital (Nugi Nugroho)
  assert.equal(canViewAllAttendance(hildasari), true);
  assert.equal(canViewAllAttendance(rio), true);
  assert.equal(canViewAllAttendance(erlita), true);
  assert.equal(canViewAllAttendance(novitaFin), true);
  assert.equal(canViewAllAttendance(nugi), true);
  assert.equal(canViewOtherStaffAttendance(nugi), true);
  assert.equal(
    getAccessibleAttendancePersonnel(nugi, SEED_FUTARI_STAFF_FIXTURE).length,
    SEED_FUTARI_STAFF_FIXTURE.length
  );

  // 2. Team Access: PMs, PICs, Admins do NOT have global access
  assert.equal(canViewAllAttendance(ade), false);
  assert.equal(canViewAllAttendance(ferdy), false);
  assert.equal(canViewAllAttendance(sesil), false);

  // Ade Yenny (PM) can view: herself (pm_ade), same division PMs (pm_ristanto, pm_gusman), and direct reports (pic_ferdy, adm_sesil)
  assert.equal(canUserViewStaffAttendance(ade, ade), true);
  assert.equal(canUserViewStaffAttendance(ade, ristanto), true); // same division 'PM'
  assert.equal(canUserViewStaffAttendance(ade, ferdy), true); // direct report (supervisor = Ade Yenny)
  assert.equal(canUserViewStaffAttendance(ade, sesil), true); // direct report (supervisor = Ade Yenny)
  // Ade CANNOT view Executive (Hildasari), Finance (Erlita), or Ristanto's PIC (Salima)
  assert.equal(canUserViewStaffAttendance(ade, hildasari), false);
  assert.equal(canUserViewStaffAttendance(ade, erlita), false);
  assert.equal(canUserViewStaffAttendance(ade, salima), false);

  const sampleAttendanceLogs: AttendanceRecord[] = [
    {
      id: 'att_1',
      staffId: 'des_nugi',
      staffName: 'Nugi Nugroho',
      role: 'Digital',
      branch: 'JKT',
      date: '2026-10-20',
      mode: 'WFO',
      checkInTime: '09:45',
      checkOutTime: '21:00',
      lateMinutes: 0,
      overtimeHours: 1,
      overtimePay: 7000,
      overtimeNote: 'Pengembangan sistem 3D Virtual Office & Piti AI',
      locationWatermark: FUTARI_HQ_ADDRESS,
      status: 'checked_out',
    },
    {
      id: 'att_2',
      staffId: 'exec_hildasari',
      staffName: 'Hildasari Umami',
      role: 'Founder & CEO',
      branch: 'JKT',
      date: '2026-10-20',
      mode: 'WFO',
      checkInTime: '09:30',
      checkOutTime: '18:30',
      lateMinutes: 0,
      overtimeHours: 0,
      overtimePay: 0,
      overtimeNote: 'Review strategi kuartal Q4',
      locationWatermark: FUTARI_HQ_ADDRESS,
      status: 'checked_out',
    },
    {
      id: 'att_3',
      staffId: 'pic_ferdy',
      staffName: 'Ferdy',
      role: 'Person In Charge (PIC)',
      branch: 'JKT',
      date: '2026-10-20',
      mode: 'WFO',
      checkInTime: '09:50',
      checkOutTime: '19:00',
      lateMinutes: 0,
      overtimeHours: 0,
      overtimePay: 0,
      overtimeNote: 'Koordinasi vendor lapangan bersama Bu Ade',
      locationWatermark: FUTARI_HQ_ADDRESS,
      status: 'checked_out',
    },
  ];

  // Nugi (Global Access) can inspect Hildasari's logs
  const nugiInspectingHilda = filterAttendanceLogsForUser(
    nugi,
    sampleAttendanceLogs,
    'exec_hildasari',
    SEED_FUTARI_STAFF_FIXTURE
  );
  assert.equal(nugiInspectingHilda.length, 1);
  assert.equal(nugiInspectingHilda[0].staffId, 'exec_hildasari');

  // Ade (Team Access) CAN inspect her direct report Ferdy's logs
  const adeInspectingFerdy = filterAttendanceLogsForUser(
    ade,
    sampleAttendanceLogs,
    'pic_ferdy',
    SEED_FUTARI_STAFF_FIXTURE
  );
  assert.equal(adeInspectingFerdy.length, 1);
  assert.equal(adeInspectingFerdy[0].staffId, 'pic_ferdy');

  // Ade (Team Access) CANNOT inspect Hildasari's logs (outside Ade's team)
  const adeBlockedFromHilda = filterAttendanceLogsForUser(
    ade,
    sampleAttendanceLogs,
    'exec_hildasari',
    SEED_FUTARI_STAFF_FIXTURE
  );
  assert.equal(adeBlockedFromHilda.length, 0);
});

test('Late logic respects 10:00 standard start and 10:05 tolerance', () => {
  assert.equal(calculateLateMinutes('09:45'), 0);
  assert.equal(calculateLateMinutes('10:00'), 0);
  assert.equal(calculateLateMinutes('10:05'), 0);
  assert.equal(calculateLateMinutes('10:06'), 6);
  assert.equal(calculateLateMinutes('10:20'), 20);
});

test('Mandatory Daily Description applies at ANY clock-out time while IDR 7,000/hr overtime strictly starts at 20:00+', () => {
  const r1700 = calculateOvertime('17:00');
  assert.equal(r1700.isOvertime, false);
  assert.equal(r1700.requiresMandatoryDailyDescription, true);
  assert.equal(r1700.overtimePay, 0);

  const r1930 = calculateOvertime('19:30');
  assert.equal(r1930.isOvertime, false);
  assert.equal(r1930.requiresMandatoryDailyDescription, true);
  assert.equal(r1930.overtimePay, 0);

  const r2100 = calculateOvertime('21:00');
  assert.equal(r2100.isOvertime, true);
  assert.equal(r2100.requiresMandatoryDailyDescription, true);
  assert.equal(r2100.overtimeHours, 1);
  assert.equal(r2100.overtimePay, OVERTIME_RATE_PER_HOUR);
});

test('Active payroll cycle, Petty Cash summary, and Calendar Grid work accurately', () => {
  const cycle = getActivePayrollCycle(new Date(2026, 9, 20));
  assert.equal(cycle.startDate, '2026-09-26');
  assert.equal(cycle.endDate, '2026-10-25');

  const summary = calculatePettyCashSummary(35000000, [
    { amount: 5000000 },
    { amount: 2500000 },
  ]);
  assert.equal(summary.remainingBalance, 27500000);

  const grid = buildMonthlyCalendarGrid(
    2026,
    9,
    SEED_LEAVE_RECORDS_FIXTURE,
    SEED_CALENDAR_EVENTS_FIXTURE
  );
  assert.ok(grid.length === 35 || grid.length === 42);
  assert.ok(SEED_CHAT_MESSAGES_FIXTURE.length >= 5);
});

test('3D Virtual Office: Interactive Avatar Highlight (#00B4D8) and Live Attendance Info Overlay (HUD)', () => {
  // 1. Formatting Jam Check-In with WIB
  assert.equal(formatCheckInWib('09:55'), '09:55 WIB');
  assert.equal(formatCheckInWib('09:42 WIB'), '09:42 WIB');

  // 2. Selecting an active WFO avatar returns full HUD info with Futari Cyan #00B4D8
  const selectedId = resolveNextHighlightedStaffId(null, 'des_nugi', SEED_FUTARI_STAFF_FIXTURE);
  assert.equal(selectedId, 'des_nugi');

  const nugiHud = getHighlightedAvatarHudData(SEED_FUTARI_STAFF_FIXTURE, selectedId);
  assert.ok(nugiHud, 'Active WFO staff must produce Live Attendance HUD data');
  assert.equal(nugiHud.name, 'Nugi Nugroho');
  assert.equal(nugiHud.roomName, 'Ruangan Creative/Design');
  assert.equal(nugiHud.statusText, 'Sedang WFO (Hadir)');
  assert.equal(nugiHud.checkInWib, '09:44 WIB');
  assert.equal(nugiHud.highlightEmissiveHex, FUTARI_CYAN_HIGHLIGHT_HEX);
  assert.equal(nugiHud.highlightEmissiveHex, '#00B4D8');

  // 3. Clicking another active WFO avatar switches the highlight to the new avatar (single highlight only)
  const switchedId = resolveNextHighlightedStaffId(selectedId, 'tl_andri', SEED_FUTARI_STAFF_FIXTURE);
  assert.equal(switchedId, 'tl_andri');
  const andriHud = getHighlightedAvatarHudData(SEED_FUTARI_STAFF_FIXTURE, switchedId);
  assert.ok(andriHud);
  assert.equal(andriHud.name, 'Andri');
  assert.equal(andriHud.role, 'Talent Leader');
  assert.equal(andriHud.roomName, 'Ruangan Creative/Design');
  assert.equal(andriHud.statusText, 'Sedang WFO (Hadir)');

  // 4. Clicking outside (null) removes the highlight and hides the HUD
  const clearedId = resolveNextHighlightedStaffId(switchedId, null, SEED_FUTARI_STAFF_FIXTURE);
  assert.equal(clearedId, null);
  assert.equal(getHighlightedAvatarHudData(SEED_FUTARI_STAFF_FIXTURE, clearedId), null);

  // 5. WFE or OFFLINE staff cannot be highlighted in the 3D scene and return null HUD
  const wfeAttempt = resolveNextHighlightedStaffId(null, 'pic_bobby', SEED_FUTARI_STAFF_FIXTURE);
  assert.equal(wfeAttempt, null);
  assert.equal(getHighlightedAvatarHudData(SEED_FUTARI_STAFF_FIXTURE, 'pic_bobby'), null);
});

test('Futari HQ Address: Exact Cipete Selatan Cilandak address is used on all Jakarta WFO attendance logs and watermarks', () => {
  const expectedAddress =
    'Jl. Nusa Indah No.33, RT.14/RW.5, Cipete Sel., Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12410';
  assert.equal(FUTARI_HQ_ADDRESS, expectedAddress);

  assert.deepEqual(INITIAL_ATTENDANCE_LOGS, []);
  const jakartaWfoLogs = SEED_ATTENDANCE_LOGS_FIXTURE.filter(
    (log) => log.branch === 'JKT' && log.mode === 'WFO'
  );
  assert.ok(jakartaWfoLogs.length > 0);
  for (const log of jakartaWfoLogs) {
    assert.equal(log.locationWatermark, expectedAddress);
    assert.ok(!log.locationWatermark.includes('Kemang Raya'));
  }
});

test('Developer/Superadmin Backdoor: Nugi Nugroho profile has role Digital, exact credentials, and accessLevel developer', () => {
  const nugi = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'des_nugi');
  assert.ok(nugi, 'Nugi Nugroho must exist in SEED_FUTARI_STAFF_FIXTURE');
  assert.equal(nugi.name, 'Nugi Nugroho');
  assert.equal(nugi.role, 'Digital');
  assert.equal(nugi.email, 'nuginugroho2005@gmail.com');
  assert.equal(nugi.password, 'nug1d1d1');
  assert.equal(nugi.accessLevel, 'developer');
  assert.equal(DEVELOPER_SUPERADMIN_EMAIL, 'nuginugroho2005@gmail.com');
  assert.equal(DEVELOPER_SUPERADMIN_PASSWORD, 'nug1d1d1');
});

test('Exclusive Developer Dashboard Visibility & Mock Authentication: Strictly restricted to nuginugroho2005@gmail.com', () => {
  const nugi = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'des_nugi')!;
  const hildasari = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'exec_hildasari')!;
  const ade = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pm_ade')!;
  const ferdy = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pic_ferdy')!;
  const zahra = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'adm_zahra')!;
  const erlita = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'fin_erlita')!;

  // Strict Visibility: ONLY true for Nugi (nuginugroho2005@gmail.com + accessLevel === 'developer')
  assert.equal(isDeveloperSuperadmin(nugi), true);
  assert.equal(isDeveloperSuperadmin(hildasari), false);
  assert.equal(isDeveloperSuperadmin(ade), false);
  assert.equal(isDeveloperSuperadmin(ferdy), false);
  assert.equal(isDeveloperSuperadmin(zahra), false);
  assert.equal(isDeveloperSuperadmin(erlita), false);
  assert.equal(isDeveloperSuperadmin(null), false);

  // Authentication: Nugi requires exact password 'nug1d1d1'
  const badAuth = authenticateStaffCredentials(
    'nuginugroho2005@gmail.com',
    'wrongpassword',
    SEED_FUTARI_STAFF_FIXTURE
  );
  assert.equal(badAuth.success, false);

  const validDevAuth = authenticateStaffCredentials(
    'nuginugroho2005@gmail.com',
    'nug1d1d1',
    SEED_FUTARI_STAFF_FIXTURE
  );
  assert.equal(validDevAuth.success, true);
  assert.equal(validDevAuth.user?.staffId, 'des_nugi');
  assert.equal(validDevAuth.user?.role, 'Digital');
  assert.equal(validDevAuth.user?.accessLevel, 'developer');
});

test('User Management Superadmin Panel: Dynamic role/division updates, account suspension toggle, and Google Workspace account registration', () => {
  // 1. Change user role and division on the fly (e.g. changing Zahra from Admin to Person In Charge (PIC) and PIC_TL)
  const afterRoleChange = updateStaffRoleAndDivision(
    SEED_FUTARI_STAFF_FIXTURE,
    'adm_zahra',
    {
      role: 'Person In Charge (PIC)',
      division: 'PIC_TL',
    }
  );
  const updatedZahra = afterRoleChange.find((s) => s.staffId === 'adm_zahra')!;
  assert.equal(updatedZahra.role, 'Person In Charge (PIC)');
  assert.equal(updatedZahra.division, 'PIC_TL');
  assert.equal(updatedZahra.divisionLabel, 'PICs/TLs');

  // 2. Toggle Deactivate / Suspend account
  const afterSuspend = toggleStaffSuspensionStatus(afterRoleChange, 'adm_zahra');
  const suspendedZahra = afterSuspend.find((s) => s.staffId === 'adm_zahra')!;
  assert.equal(suspendedZahra.isSuspended, true);

  // Suspended user is excluded from active WFO Virtual Office & blocked from login
  const activeWfo = filterActiveWfoPersonnel(afterSuspend);
  assert.ok(!activeWfo.some((s) => s.staffId === 'adm_zahra'));
  const suspendedLoginAttempt = authenticateStaffCredentials(
    'zahra@futari.id',
    'futari2026',
    afterSuspend
  );
  assert.equal(suspendedLoginAttempt.success, false);

  // Toggle again to reactivate
  const afterReactivate = toggleStaffSuspensionStatus(afterSuspend, 'adm_zahra');
  assert.equal(
    afterReactivate.find((s) => s.staffId === 'adm_zahra')!.isSuspended,
    false
  );

  // 3. Register New Google Workspace Account with initial Password & Supervisor (Report To)
  const { updatedList, createdStaff } = registerNewGoogleWorkspaceAccount(
    SEED_FUTARI_STAFF_FIXTURE,
    {
      name: 'Dimas Prakoso',
      email: 'dimas.prakoso@futari.id',
      password: 'dimasPassword99',
      supervisor: 'Ade Yenny',
      role: 'Person In Charge (PIC)',
      division: 'PIC_TL',
      branch: 'JKT',
      roomName: 'Ruangan PM (Team Bu Ade)',
      workMode: 'WFO',
    }
  );
  assert.equal(updatedList.length, SEED_FUTARI_STAFF_FIXTURE.length + 1);
  assert.equal(createdStaff.name, 'Dimas Prakoso');
  assert.equal(createdStaff.email, 'dimas.prakoso@futari.id');
  assert.equal(createdStaff.password, 'dimasPassword99');
  assert.equal(createdStaff.supervisor, 'Ade Yenny');
  assert.equal(createdStaff.role, 'Person In Charge (PIC)');
  assert.equal(createdStaff.division, 'PIC_TL');
  assert.equal(createdStaff.divisionLabel, 'PICs/TLs');
  assert.equal(createdStaff.accessLevel, 'standard');
  assert.equal(isDeveloperSuperadmin(createdStaff), false);

  // Verify newly added user can authenticate with their initial password (and fails with wrong password)
  const newUserBadPass = authenticateStaffCredentials(
    'dimas.prakoso@futari.id',
    'wrongPass',
    updatedList
  );
  assert.equal(newUserBadPass.success, false);

  const newUserGoodPass = authenticateStaffCredentials(
    'dimas.prakoso@futari.id',
    'dimasPassword99',
    updatedList
  );
  assert.equal(newUserGoodPass.success, true);
  assert.equal(newUserGoodPass.user?.name, 'Dimas Prakoso');

  // 4. Profile Hierarchy Display: Supervisor & Direct Reports (Team Members)
  const adeSupervisor = updatedList.find((s) => s.staffId === 'pm_ade')!;
  const adeDirectReports = getDirectReportsForSupervisor(updatedList, adeSupervisor);
  const adeReportNames = adeDirectReports.map((r) => r.name);
  assert.ok(adeReportNames.includes('Ferdy'), 'Ferdy must report to Ade Yenny');
  assert.ok(adeReportNames.includes('Sesil'), 'Sesil must report to Ade Yenny');
  assert.ok(
    adeReportNames.includes('Dimas Prakoso'),
    'Newly added Dimas Prakoso must appear in Ade Yenny direct reports'
  );
  assert.equal(isDirectReportOf(createdStaff, adeSupervisor), true);

  // 5. Delete User Action: Permanently removes user from mock database state
  const afterDelete = deleteStaffMember(updatedList, createdStaff.staffId);
  assert.equal(afterDelete.length, SEED_FUTARI_STAFF_FIXTURE.length);
  assert.ok(!afterDelete.some((s) => s.staffId === createdStaff.staffId));
});

test('Multi-Type Calendar & Daily Checklists: 3 Event Types (Cuti, Event Kantor, Booking Mobil Operasional) & Owner-Only Checklist Permission Lock', () => {
  // 1. Multi-type calendar cell on 2026-10-20 contains both Event Kantor and Booking Mobil Operasional
  const oct2026Grid = buildMonthlyCalendarGrid(
    2026,
    9, // October (0-indexed)
    SEED_LEAVE_RECORDS_FIXTURE,
    SEED_CALENDAR_EVENTS_FIXTURE
  );
  const oct20Cell = oct2026Grid.find((c) => c.dateStr === '2026-10-20')!;
  assert.ok(oct20Cell, '2026-10-20 cell must exist in October 2026 grid');
  assert.ok(
    oct20Cell.officeEvents.some((e) => e.title.includes('Telkomsel NextGen JKT')),
    'Must include Event Kantor on 2026-10-20'
  );
  assert.ok(
    oct20Cell.carBookings.length >= 2,
    'Must include Booking Mobil Operasional entries on 2026-10-20 for Pak Rio'
  );

  // 2. Daily Checklists grouped by personnel on 2026-10-20
  const groupedForRio = getDailyChecklistsGroupedByPersonnel(
    SEED_DAILY_CHECKLISTS_FIXTURE,
    '2026-10-20',
    SEED_FUTARI_STAFF_FIXTURE,
    'exec_rio'
  );
  assert.ok(groupedForRio.length >= 5, 'Everyone can view all personnel checklists');
  assert.equal(
    groupedForRio[0].staffId,
    'exec_rio',
    'Logged-in user checklist is sorted to the top'
  );
  assert.equal(groupedForRio[0].isOwner, true);
  const hildaGroupViewedByRio = groupedForRio.find(
    (g) => g.staffId === 'exec_hildasari'
  )!;
  assert.equal(
    hildaGroupViewedByRio.isOwner,
    false,
    'Other personnel checklists are read-only (isOwner === false)'
  );

  // 3. Permission Lock: Non-owner CANNOT toggle, add, edit, or delete another user's checklist items
  assert.equal(canModifyDailyChecklist('exec_rio', 'exec_hildasari'), false);
  assert.equal(canModifyDailyChecklist('exec_rio', 'exec_rio'), true);

  const blockedToggle = toggleDailyChecklistItem(
    SEED_DAILY_CHECKLISTS_FIXTURE,
    '2026-10-20',
    'exec_hildasari',
    'exec_rio', // Rio trying to toggle Hilda's item
    'chk_hilda_2'
  );
  const hildaAfterBlocked = blockedToggle.find(
    (r) => r.dateStr === '2026-10-20' && r.staffId === 'exec_hildasari'
  )!;
  assert.equal(
    hildaAfterBlocked.items.find((i) => i.id === 'chk_hilda_2')!.completed,
    false,
    'Non-owner toggle must be rejected'
  );

  // 4. Owner CAN toggle, add, edit, and delete their own checklist items
  const allowedToggle = toggleDailyChecklistItem(
    SEED_DAILY_CHECKLISTS_FIXTURE,
    '2026-10-20',
    'exec_hildasari',
    'exec_hildasari', // Hilda toggling her own item
    'chk_hilda_2'
  );
  assert.equal(
    allowedToggle
      .find((r) => r.dateStr === '2026-10-20' && r.staffId === 'exec_hildasari')!
      .items.find((i) => i.id === 'chk_hilda_2')!.completed,
    true
  );

  const afterAdd = addDailyChecklistItem(
    allowedToggle,
    '2026-10-20',
    'exec_hildasari',
    'exec_hildasari',
    'Finalisasi dokumen MOU klien baru'
  );
  const hildaItemsAfterAdd = afterAdd.find(
    (r) => r.dateStr === '2026-10-20' && r.staffId === 'exec_hildasari'
  )!.items;
  assert.equal(hildaItemsAfterAdd.length, 3);
  const addedItem = hildaItemsAfterAdd[2];
  assert.equal(addedItem.text, 'Finalisasi dokumen MOU klien baru');

  const afterEdit = editDailyChecklistItem(
    afterAdd,
    '2026-10-20',
    'exec_hildasari',
    'exec_hildasari',
    addedItem.id,
    'Finalisasi dokumen MOU klien baru (Signed)'
  );
  assert.equal(
    afterEdit
      .find((r) => r.dateStr === '2026-10-20' && r.staffId === 'exec_hildasari')!
      .items.find((i) => i.id === addedItem.id)!.text,
    'Finalisasi dokumen MOU klien baru (Signed)'
  );

  const afterRemoveItem = deleteDailyChecklistItem(
    afterEdit,
    '2026-10-20',
    'exec_hildasari',
    'exec_hildasari',
    addedItem.id
  );
  assert.equal(
    afterRemoveItem.find(
      (r) => r.dateStr === '2026-10-20' && r.staffId === 'exec_hildasari'
    )!.items.length,
    2
  );
});

test('Self-Service Profile Editing, 3D Avatar Customization & Superadmin Any-Profile Power', () => {
  // 1. Self-Service: User edits their own Name, Supervisor, Password, and 3D Avatar Config (Shirt Color, Hair Style/Color, Hijab toggle)
  const afterSelfEdit = updateOwnProfileSelfService(
    SEED_FUTARI_STAFF_FIXTURE,
    'pic_ferdy',
    {
      name: 'Ferdy Pratama',
      password: 'ferdyNewPassword2026',
      supervisor: 'Ristanto',
      avatarColor: '#10b981',
      avatar3DConfig: {
        shirtColor: '#10b981',
        hairStyle: 'parted',
        hairColor: '#78350f',
        useHijab: false,
      },
    }
  );
  const updatedFerdy = afterSelfEdit.find((s) => s.staffId === 'pic_ferdy')!;
  assert.equal(updatedFerdy.name, 'Ferdy Pratama');
  assert.equal(updatedFerdy.initials, 'FP');
  assert.equal(updatedFerdy.password, 'ferdyNewPassword2026');
  assert.equal(updatedFerdy.supervisor, 'Ristanto');
  const ferdy3D = getStaffAvatar3DConfig(updatedFerdy);
  assert.equal(ferdy3D.shirtColor, '#10b981');
  assert.equal(ferdy3D.hairStyle, 'parted');
  assert.equal(ferdy3D.hairColor, '#78350f');
  assert.equal(ferdy3D.useHijab, false);

  // 2. Superadmin Power: Nugi Nugroho can edit ANY user profile & 3D avatar settings
  const nugiAdmin = afterSelfEdit.find((s) => s.staffId === 'des_nugi')!;
  const afterSuperadminEdit = superadminUpdateAnyProfile(
    afterSelfEdit,
    nugiAdmin,
    'adm_sesil',
    {
      name: 'Sesil Maharani',
      role: 'Person In Charge (PIC)',
      division: 'PIC_TL',
      supervisor: 'Gusman Razak',
      roomName: 'Ruangan PM (Team Mas Gusman)',
      avatar3DConfig: {
        shirtColor: '#ec4899',
        useHijab: true,
        hijabColor: '#f43f5e',
      },
    }
  );
  const updatedSesil = afterSuperadminEdit.find((s) => s.staffId === 'adm_sesil')!;
  assert.equal(updatedSesil.name, 'Sesil Maharani');
  assert.equal(updatedSesil.role, 'Person In Charge (PIC)');
  assert.equal(updatedSesil.division, 'PIC_TL');
  assert.equal(updatedSesil.supervisor, 'Gusman Razak');
  assert.equal(updatedSesil.roomName, 'Ruangan PM (Team Mas Gusman)');
  assert.equal(getStaffAvatar3DConfig(updatedSesil).useHijab, true);
  assert.equal(getStaffAvatar3DConfig(updatedSesil).shirtColor, '#ec4899');
});

test('Firebase Auth User Mapping & Piti AI Persona Prompting', () => {
  // 1. Existing 22-person email match (Nugi Nugroho via Google / Email login)
  const nugiMapping = mapFirebaseUserToStaffProfile(
    'nuginugroho2005@gmail.com',
    'Nugi Nugroho',
    SEED_FUTARI_STAFF_FIXTURE
  );
  assert.equal(nugiMapping.isNewRegistration, false);
  assert.equal(nugiMapping.matchedStaff.staffId, 'des_nugi');
  assert.equal(nugiMapping.matchedStaff.role, 'Digital');
  assert.equal(nugiMapping.matchedStaff.division, 'Design_Talent_Production');
  assert.equal(nugiMapping.matchedStaff.supervisor, 'Ulian (Head of Design)');
  assert.equal(nugiMapping.matchedStaff.accessLevel, 'developer');

  // 2. Existing 22-person email match (CEO Hildasari Umami)
  const hildaMapping = mapFirebaseUserToStaffProfile(
    'hildasari@futari.id',
    null,
    SEED_FUTARI_STAFF_FIXTURE
  );
  assert.equal(hildaMapping.isNewRegistration, false);
  assert.equal(hildaMapping.matchedStaff.staffId, 'exec_hildasari');
  assert.equal(hildaMapping.matchedStaff.role, 'Founder & CEO');
  assert.equal(hildaMapping.matchedStaff.division, 'Executive');

  // 3. Brand-new email registered via createUserWithEmailAndPassword or external Google account defaults to 'Unassigned'
  const newRegMapping = mapFirebaseUserToStaffProfile(
    'reza.pratama@futari.id',
    'Reza Pratama',
    SEED_FUTARI_STAFF_FIXTURE,
    'rezaPass123'
  );
  assert.equal(newRegMapping.isNewRegistration, true);
  assert.equal(newRegMapping.updatedStaffList.length, SEED_FUTARI_STAFF_FIXTURE.length + 1);
  assert.equal(newRegMapping.matchedStaff.name, 'Reza Pratama');
  assert.equal(newRegMapping.matchedStaff.email, 'reza.pratama@futari.id');
  assert.equal(newRegMapping.matchedStaff.role, 'Unassigned');
  assert.equal(newRegMapping.matchedStaff.division, 'Design_Talent_Production');

  // 4. Piti Persona System Instruction injection
  assert.equal(
    PITI_PERSONA_SYSTEM_INSTRUCTION,
    'Kamu adalah Piti, asisten virtual cerdas dan ramah untuk portal operasional Futari. Jawablah dalam bahasa Indonesia yang profesional namun santai.'
  );
  const fullSystemPrompt = buildPitiSystemInstruction(
    { name: 'Nugi Nugroho', role: 'Digital', division: 'Design/Talent/Prod', branch: 'JKT' },
    '22 personel aktif'
  );
  assert.ok(fullSystemPrompt.includes(PITI_PERSONA_SYSTEM_INSTRUCTION));
  assert.ok(fullSystemPrompt.includes('Nugi Nugroho'));
});

test('3D Architecture (Two Separate Branches: Jakarta HQ & Bandung Branch) and Dynamic Day/Night Lighting Cycle', () => {
  const jkt = VIRTUAL_OFFICE_BUILDINGS.JAKARTA_HQ;
  const bdg = VIRTUAL_OFFICE_BUILDINGS.BANDUNG_BRANCH;

  // Two distinct buildings separated by distance in 3D space
  assert.ok(Math.abs(bdg.centerX - jkt.centerX) >= 20);
  assert.ok(jkt.entranceDoor.width > 0 && jkt.exitDoor.width > 0);
  assert.ok(bdg.entranceDoor.width > 0 && bdg.exitDoor.width > 0);

  // Bandung personnel strictly Alfian & Yanti positioned inside Bandung Branch platform
  const bandungStaff = SEED_FUTARI_STAFF_FIXTURE.filter((s) => isBandungPersonnel(s));
  assert.deepEqual(
    bandungStaff.map((s) => s.name),
    ['Alfian', 'Yanti']
  );
  for (const person of bandungStaff) {
    assert.equal(person.location, 'Bandung');
    assert.ok(person.deskCoords.x > 22, `${person.name} desk must be in Bandung 3D building`);
  }

  // Dynamic Day/Night Lighting Cycle for Morning (06-09), Day (10-15), Afternoon (16-18), Night (19-05)
  const morning = getDayNightLightingConfig(7);
  assert.equal(morning.phase, 'Morning');
  assert.equal(morning.timeRangeLabel, '06:00 - 09:00');

  const day = getDayNightLightingConfig(13);
  assert.equal(day.phase, 'Day');
  assert.equal(day.timeRangeLabel, '10:00 - 15:00');

  const afternoon = getDayNightLightingConfig(17);
  assert.equal(afternoon.phase, 'Afternoon');
  assert.equal(afternoon.timeRangeLabel, '16:00 - 18:00');

  const night = getDayNightLightingConfig(21);
  assert.equal(night.phase, 'Night');
  assert.equal(night.timeRangeLabel, '19:00 - 05:00');
});

test('Hybrid Attendance System (WFO <-> WFE) & Mba Erlita Finance Export Totals (Regular Working Hours vs Overtime Hours >= 20:00)', () => {
  // 1. Verify Blank Slate initial states with Root Superadmin only (length === 1)
  assert.equal(INITIAL_FUTARI_STAFF.length, 1);
  assert.equal(INITIAL_ATTENDANCE_LOGS.length, 0);
  assert.equal(INITIAL_EVENT_BUDGETS.length, 0);

  // 2. Test Hybrid WFO -> WFE transition
  const initialCheckInRecord: AttendanceRecord = {
    id: 'att_hybrid_1',
    staffId: 'des_nugi',
    staffName: 'Nugi Nugroho',
    role: 'Digital',
    branch: 'JKT',
    date: '2026-10-20',
    mode: 'WFO',
    initialMode: 'WFO',
    isHybridTransition: false,
    checkInTime: '09:30',
    checkOutTime: '',
    regularHours: 0,
    lateMinutes: 0,
    overtimeHours: 0,
    overtimePay: 0,
    overtimeNote: 'Checked-In (WFO) pukul 09:30 WIB',
    locationWatermark: FUTARI_HQ_ADDRESS,
    status: 'checked_in',
  };

  const { updatedStaff, updatedLogs, updatedRecord } = transitionStaffWfoToWfe(
    SEED_FUTARI_STAFF_FIXTURE,
    [initialCheckInRecord],
    'des_nugi',
    '14:15'
  );

  const nugiAfterTransition = updatedStaff.find((s) => s.staffId === 'des_nugi')!;
  assert.equal(
    nugiAfterTransition.workMode,
    'WFE',
    'User status must change to WFE after clicking Pindah WFE'
  );
  assert.ok(
    !filterActiveWfoPersonnel(updatedStaff).some((s) => s.staffId === 'des_nugi'),
    'User must be removed from active WFO list so 3D avatar exits HQ'
  );
  assert.ok(updatedRecord);
  assert.equal(updatedRecord.mode, 'WFE');
  assert.equal(updatedRecord.initialMode, 'WFO');
  assert.equal(updatedRecord.isHybridTransition, true);
  assert.equal(updatedRecord.wfeTransitionTime, '14:15');
  assert.equal(updatedLogs[0].wfeTransitionTime, '14:15');

  // 3. Test Mba Erlita Finance Export Calculations:
  //    - Total Jam Kerja (Regular Working Hours, capped at 20:00 WIB)
  //    - Total Jam Lembur (Overtime Hours strictly >= 20:00 WIB)
  assert.equal(calculateRegularWorkingHours('10:00', '18:00'), 8);
  assert.equal(calculateRegularWorkingHours('09:30', '21:30'), 10.5); // 09:30 to 20:00 regular = 10.5 hrs

  const completedLogs: AttendanceRecord[] = [
    {
      ...updatedRecord,
      checkOutTime: '22:00', // 09:30 -> 20:00 = 10.5 regular hrs; 20:00 -> 22:00 = 2 overtime hrs
      regularHours: calculateRegularWorkingHours('09:30', '22:00'),
      overtimeHours: 2,
      overtimePay: 14000,
      status: 'checked_out',
    },
    {
      id: 'att_day_2',
      staffId: 'des_nugi',
      staffName: 'Nugi Nugroho',
      role: 'Digital',
      branch: 'JKT',
      date: '2026-10-21',
      mode: 'WFO',
      checkInTime: '10:00',
      checkOutTime: '18:00', // 8 regular hrs, 0 overtime hrs
      regularHours: 8,
      lateMinutes: 0,
      overtimeHours: 0,
      overtimePay: 0,
      overtimeNote: 'Sprint development',
      locationWatermark: FUTARI_HQ_ADDRESS,
      status: 'checked_out',
    },
  ];

  const financeTotals = calculateAttendanceExportTotals(completedLogs);
  assert.equal(financeTotals.totalRegularHours, 18.5);
  assert.equal(financeTotals.totalOvertimeHours, 2);
  assert.equal(financeTotals.totalOvertimePay, 14000);
  assert.equal(financeTotals.totalHybridDays, 1);
});

test('ERP Requirement 1 — SOP Perusahaan: Strict RBAC (Executive & Digital ONLY can add/edit SOPs, read-only for all standard users)', () => {
  const hildasari = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'exec_hildasari')!;
  const rio = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'exec_rio')!;
  const nugi = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'des_nugi')!;
  const ade = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pm_ade')!;
  const ferdy = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pic_ferdy')!;
  const erlita = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'fin_erlita')!;

  assert.equal(INITIAL_COMPANY_SOPS.length, 0);
  assert.ok(SEED_COMPANY_SOPS_FIXTURE.length >= 3);
  for (const sop of SEED_COMPANY_SOPS_FIXTURE) {
    assert.ok(sop.title.length > 0);
    assert.ok(sop.content.length > 0);
    assert.ok(sop.date.length > 0);
  }

  // Strictly Executive (Hildasari, Rio) and Digital (Nugi) can manage SOPs
  assert.equal(canManageCompanySops(hildasari), true);
  assert.equal(canManageCompanySops(rio), true);
  assert.equal(canManageCompanySops(nugi), true);

  // Standard users (PM, PIC, Finance, etc.) are strictly read-only
  assert.equal(canManageCompanySops(ade), false);
  assert.equal(canManageCompanySops(ferdy), false);
  assert.equal(canManageCompanySops(erlita), false);

  // Standard user attempt to add SOP is blocked
  const blockedAdd = addCompanySop(SEED_COMPANY_SOPS_FIXTURE, ferdy, {
    title: 'SOP Unauthorized',
    content: 'Should not be added',
    date: '2026-10-20',
  });
  assert.equal(blockedAdd.length, SEED_COMPANY_SOPS_FIXTURE.length);

  // Executive user adds SOP successfully
  const afterExecAdd = addCompanySop(SEED_COMPANY_SOPS_FIXTURE, hildasari, {
    title: 'SOP Standar Keamanan Panggung Utama',
    content: 'Wajib menggunakan APD saat proses rigging di venue.',
    date: '2026-10-22',
  });
  assert.equal(afterExecAdd.length, SEED_COMPANY_SOPS_FIXTURE.length + 1);
  assert.equal(afterExecAdd[0].title, 'SOP Standar Keamanan Panggung Utama');

  // Digital user updates SOP successfully
  const afterDigitalEdit = updateCompanySop(
    afterExecAdd,
    nugi,
    afterExecAdd[0].id,
    {
      title: 'SOP Standar Keamanan Panggung Utama (Revisi v2)',
      content: 'Wajib menggunakan APD lengkap saat proses rigging.',
      date: '2026-10-23',
    }
  );
  assert.equal(
    afterDigitalEdit[0].title,
    'SOP Standar Keamanan Panggung Utama (Revisi v2)'
  );

  // Delete SOP
  const afterDelete = deleteCompanySop(
    afterDigitalEdit,
    rio,
    afterDigitalEdit[0].id
  );
  assert.equal(afterDelete.length, SEED_COMPANY_SOPS_FIXTURE.length);
});

test('ERP Requirement 2 — Fleet Management & Automotive Booking: Strict RBAC (M Rio Antoni & Nugi Nugroho ONLY) & Dynamic Vehicle Dropdown', () => {
  const rio = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'exec_rio')!;
  const nugi = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'des_nugi')!;
  const hildasari = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'exec_hildasari')!;
  const ade = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pm_ade')!;
  const ferdy = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pic_ferdy')!;

  assert.equal(INITIAL_FLEET_VEHICLES.length, 0);
  assert.ok(SEED_FLEET_VEHICLES_FIXTURE.length >= 4);

  // ONLY Operational (M Rio Antoni), Executive, and Digital (Nugi Nugroho) can manage fleet vehicles
  assert.equal(canManageFleetVehicles(rio), true);
  assert.equal(canManageFleetVehicles(nugi), true);
  assert.equal(canManageFleetVehicles(hildasari), true);
  assert.equal(canManageFleetVehicles(ade), false);
  assert.equal(canManageFleetVehicles(ferdy), false);

  // Unauthorized user cannot add vehicle
  const blockedAdd = addFleetVehicle(SEED_FLEET_VEHICLES_FIXTURE, ferdy, {
    model: 'Honda CR-V',
    licensePlate: 'B 1234 XYZ',
    status: 'Tersedia',
  });
  assert.equal(blockedAdd.length, SEED_FLEET_VEHICLES_FIXTURE.length);

  // M Rio Antoni adds a new car to fleetVehicles
  const afterRioAdd = addFleetVehicle(SEED_FLEET_VEHICLES_FIXTURE, rio, {
    model: 'Mitsubishi Xpander Cross',
    licensePlate: 'B 7788 FTR',
    status: 'Tersedia',
    branch: 'JKT',
  });
  assert.equal(afterRioAdd.length, SEED_FLEET_VEHICLES_FIXTURE.length + 1);
  assert.equal(
    formatFleetVehicleOptionLabel(afterRioAdd[0]),
    'Mitsubishi Xpander Cross B 7788 FTR'
  );

  // Nugi Nugroho updates vehicle status
  const afterNugiUpdate = updateFleetVehicle(
    afterRioAdd,
    nugi,
    afterRioAdd[0].id,
    { status: 'Digunakan' }
  );
  assert.equal(afterNugiUpdate[0].status, 'Digunakan');

  // Delete vehicle
  const afterDelete = deleteFleetVehicle(
    afterNugiUpdate,
    rio,
    afterNugiUpdate[0].id
  );
  assert.equal(afterDelete.length, SEED_FLEET_VEHICLES_FIXTURE.length);
});

test('ERP Requirement 3 — Strict Petty Cash Filtering (involvedPersonnel Functional RBAC)', () => {
  const erlita = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'fin_erlita')!;
  const hildasari = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'exec_hildasari')!;
  const nugi = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'des_nugi')!;
  const ade = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pm_ade')!;
  const alfian = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'tl_alfian')!;

  assert.equal(INITIAL_PETTY_CASH_EVENTS.length, 0);
  assert.equal(INITIAL_PETTY_CASH_EXPENSES.length, 0);

  // Verify every event in SEED_EVENT_BUDGETS_FIXTURE has `involvedPersonnel`
  assert.ok(SEED_EVENT_BUDGETS_FIXTURE.length >= 3);
  for (const ev of SEED_EVENT_BUDGETS_FIXTURE) {
    assert.ok(Array.isArray(ev.involvedPersonnel));
    assert.ok(ev.involvedPersonnel!.length > 0);
  }

  // Finance, Executive, and Digital see ALL events
  assert.equal(
    filterVisibleEventsForUser(erlita, SEED_EVENT_BUDGETS_FIXTURE).length,
    SEED_EVENT_BUDGETS_FIXTURE.length
  );
  assert.equal(
    filterVisibleEventsForUser(hildasari, SEED_EVENT_BUDGETS_FIXTURE).length,
    SEED_EVENT_BUDGETS_FIXTURE.length
  );
  assert.equal(
    filterVisibleEventsForUser(nugi, SEED_EVENT_BUDGETS_FIXTURE).length,
    SEED_EVENT_BUDGETS_FIXTURE.length
  );

  // Ade Yenny is only in evt_jkt_activation's involvedPersonnel
  const adeVisible = filterVisibleEventsForUser(ade, SEED_EVENT_BUDGETS_FIXTURE);
  assert.equal(adeVisible.length, 1);
  assert.equal(adeVisible[0].eventId, 'evt_jkt_activation');

  // Alfian is only in evt_bdg_fest's involvedPersonnel
  const alfianVisible = filterVisibleEventsForUser(
    alfian,
    SEED_EVENT_BUDGETS_FIXTURE
  );
  assert.equal(alfianVisible.length, 1);
  assert.equal(alfianVisible[0].eventId, 'evt_bdg_fest');

  // Expenses are also strictly filtered by involvedPersonnel
  const alfianExpenses = filterVisiblePettyCashExpenses(
    alfian,
    SEED_EVENT_BUDGETS_FIXTURE,
    SEED_PETTY_CASH_EXPENSES_FIXTURE
  );
  assert.equal(alfianExpenses.length, 1);
  assert.equal(alfianExpenses[0].eventId, 'evt_bdg_fest');
});

test('ERP Requirement 4 — Split Calendar & Advanced Task Checklist: Task Form, Deadline Date Calendar Sync, and Assignee/Creator/Direct Supervisor Edit Lock', () => {
  const ferdy = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pic_ferdy')!;
  const ade = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pm_ade')!; // Ferdy's Direct Supervisor
  const ristanto = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pm_ristanto')!;
  const salima = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pic_salima')!; // Reports to Ristanto, NOT Ade

  assert.equal(INITIAL_WORK_TASKS.length, 0);

  // 1. Add a new task where Creator = Ristanto, Assignee = Ferdy (whose Direct Supervisor is Ade Yenny)
  const tasksAfterAdd = addWorkTask(
    SEED_WORK_TASKS_FIXTURE,
    ristanto,
    SEED_FUTARI_STAFF_FIXTURE,
    {
      taskName: 'Siapkan Laporan Produksi Vendor Sound System',
      assigneeId: 'pic_ferdy',
      startDate: '2026-10-20',
      deadlineDate: '2026-10-25',
    }
  );
  assert.equal(tasksAfterAdd.length, SEED_WORK_TASKS_FIXTURE.length + 1);
  const createdTask = tasksAfterAdd[0];
  assert.equal(createdTask.taskName, 'Siapkan Laporan Produksi Vendor Sound System');
  assert.equal(createdTask.assigneeId, 'pic_ferdy');
  assert.equal(createdTask.creatorId, 'pm_ristanto');
  assert.equal(createdTask.startDate, '2026-10-20');
  assert.equal(createdTask.deadlineDate, '2026-10-25');

  // 2. Task Edit Logic: ONLY Assignee (Ferdy), Task Creator (Ristanto), or Assignee's Direct Supervisor (Ade Yenny) can modify
  assert.equal(
    canModifyWorkTask(ferdy, createdTask, SEED_FUTARI_STAFF_FIXTURE),
    true,
    'Assignee (Ferdy) must be allowed to check/edit task'
  );
  assert.equal(
    canModifyWorkTask(ristanto, createdTask, SEED_FUTARI_STAFF_FIXTURE),
    true,
    'Task Creator (Ristanto) must be allowed to check/edit task'
  );
  assert.equal(
    canModifyWorkTask(ade, createdTask, SEED_FUTARI_STAFF_FIXTURE),
    true,
    "Assignee's Direct Supervisor (Ade Yenny) must be allowed to check/edit task"
  );
  assert.equal(
    canModifyWorkTask(salima, createdTask, SEED_FUTARI_STAFF_FIXTURE),
    false,
    'Unrelated user (Salima) must NOT be allowed to check/edit task'
  );

  // Verify unauthorized toggle is blocked while supervisor toggle succeeds
  const afterBlockedToggle = toggleWorkTaskCompletion(
    tasksAfterAdd,
    salima,
    SEED_FUTARI_STAFF_FIXTURE,
    createdTask.id
  );
  assert.equal(afterBlockedToggle[0].completed, false);

  const afterSupervisorToggle = toggleWorkTaskCompletion(
    tasksAfterAdd,
    ade,
    SEED_FUTARI_STAFF_FIXTURE,
    createdTask.id
  );
  assert.equal(afterSupervisorToggle[0].completed, true);

  // Verify task update by Assignee works
  const afterAssigneeEdit = updateWorkTask(
    afterSupervisorToggle,
    ferdy,
    SEED_FUTARI_STAFF_FIXTURE,
    createdTask.id,
    { taskName: 'Siapkan Laporan Produksi Vendor Sound System (Final)' }
  );
  assert.equal(
    afterAssigneeEdit[0].taskName,
    'Siapkan Laporan Produksi Vendor Sound System (Final)'
  );

  // 3. Calendar Sync: Task must render on the Calendar Grid specifically on its Deadline Date (2026-10-25)
  const gridWithTasks = buildMonthlyCalendarGrid(
    2026,
    9, // October 2026
    SEED_LEAVE_RECORDS_FIXTURE,
    SEED_CALENDAR_EVENTS_FIXTURE,
    afterAssigneeEdit
  );
  const startCell = gridWithTasks.find((c) => c.dateStr === '2026-10-20')!;
  const deadlineCell = gridWithTasks.find((c) => c.dateStr === '2026-10-25')!;
  assert.ok(
    !startCell.deadlineTasks.some((t) => t.id === createdTask.id),
    'Task must NOT render on startDate if startDate !== deadlineDate'
  );
  assert.ok(
    deadlineCell.deadlineTasks.some((t) => t.id === createdTask.id),
    'Task MUST render on the calendar grid specifically on its Deadline Date (2026-10-25)'
  );
});

test('UI/UX Overhaul — Glassmorphism Surface Classes & Splash Screen Welcome Config', () => {
  const lightGlass = getGlassSurfaceClasses(false);
  const darkGlass = getGlassSurfaceClasses(true);

  assert.ok(
    lightGlass.includes('bg-white/70 backdrop-blur-md border border-white/40 shadow-lg'),
    'Light Mode must include exact glassmorphism utility classes'
  );
  assert.ok(
    darkGlass.includes(
      'bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-2xl'
    ),
    'Dark Mode must include exact glassmorphism utility classes'
  );

  const hildasari = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'exec_hildasari')!;
  const splashCfg = buildSplashWelcomeConfig(hildasari);
  assert.equal(splashCfg.greetingText, 'Selamat Datang, Hildasari Umami');
  assert.equal(splashCfg.logoPath, '/logoFUTARI-1_5.png');
  assert.ok(
    SPLASH_DURATION_MS >= 2000 && SPLASH_DURATION_MS <= 2500,
    'Splash duration must be between 2000ms and 2500ms'
  );
});

test('User Management Detailed Edit Modal & "Tim & Absensi" (Team Dashboard) RBAC + Dynamic Export Calculations', () => {
  const hildasari = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'exec_hildasari')!;
  const rio = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'exec_rio')!;
  const erlita = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'fin_erlita')!;
  const nugi = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'des_nugi')!;
  const ade = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pm_ade')!;
  const ristanto = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pm_ristanto')!;
  const ferdy = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pic_ferdy')!;
  const nana = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'pic_nana')!;
  const ulian = SEED_FUTARI_STAFF_FIXTURE.find((s) => s.staffId === 'des_ulian')!;

  // 1. Open "Tim & Absensi" Tab to Everyone:
  //    The "Tim & Absensi" tab MUST be visible and accessible to ALL active personnel.
  assert.equal(canAccessTeamAttendanceTab(ade), true, 'PM Ade Yenny can access Tim & Absensi tab');
  assert.equal(canAccessTeamAttendanceTab(ristanto), true, 'PM Ristanto can access Tim & Absensi tab');
  assert.equal(canAccessTeamAttendanceTab(hildasari), true, 'Executive Hildasari can access Tim & Absensi tab');
  assert.equal(canAccessTeamAttendanceTab(rio), true, 'Executive Rio can access Tim & Absensi tab');
  assert.equal(canAccessTeamAttendanceTab(erlita), true, 'Finance Erlita can access Tim & Absensi tab');
  assert.equal(canAccessTeamAttendanceTab(nugi), true, 'Digital Nugi can access Tim & Absensi tab');
  assert.equal(canAccessTeamAttendanceTab(ferdy), true, 'PIC Ferdy can access Tim & Absensi tab');
  assert.equal(canAccessTeamAttendanceTab(nana), true, 'PIC Nana can access Tim & Absensi tab');
  assert.equal(canAccessTeamAttendanceTab(ulian), true, 'Head of Design Ulian can access Tim & Absensi tab');

  // 2. Dynamic RBAC Filtering Logic:
  //    - Global View: Executive, Finance, and Digital (nuginugroho2005@gmail.com) see ALL 23 company personnel.
  assert.equal(getTeamDashboardPersonnel(hildasari, SEED_FUTARI_STAFF_FIXTURE).length, 23);
  assert.equal(getTeamDashboardPersonnel(rio, SEED_FUTARI_STAFF_FIXTURE).length, 23);
  assert.equal(getTeamDashboardPersonnel(erlita, SEED_FUTARI_STAFF_FIXTURE).length, 23);
  assert.equal(getTeamDashboardPersonnel(nugi, SEED_FUTARI_STAFF_FIXTURE).length, 23);

  //    - Team View (For Everyone Else):
  //      PIC Ferdy sees ONLY his own data ('Ferdy') AND personnel sharing his exact supervisor 'Ade Yenny (Project Manager)' ('Sesil').
  const ferdyTeam = getTeamDashboardPersonnel(ferdy, SEED_FUTARI_STAFF_FIXTURE);
  assert.deepEqual(
    ferdyTeam.map((s) => s.name),
    ['Ferdy', 'Sesil'],
    'PIC Ferdy must see ONLY himself and Sesil (who shares supervisor Ade Yenny)'
  );

  //      PM Ade Yenny sees her own data ('Ade Yenny'), her direct reports ('Ferdy', 'Sesil'),
  //      and peers sharing her exact supervisor 'M Rio Antoni (Operational)', while excluding unrelated PICs (e.g., Bobby, Salima, Nana).
  const adeTeam = getTeamDashboardPersonnel(ade, SEED_FUTARI_STAFF_FIXTURE);
  assert.ok(adeTeam.some((s) => s.staffId === 'pm_ade'), 'Ade sees her own attendance');
  assert.ok(adeTeam.some((s) => s.staffId === 'pic_ferdy'), 'Ade sees direct report Ferdy');
  assert.ok(adeTeam.some((s) => s.staffId === 'adm_sesil'), 'Ade sees direct report Sesil');
  assert.ok(adeTeam.some((s) => s.staffId === 'pm_ristanto'), 'Ade sees peer Ristanto (same supervisor M Rio Antoni)');
  assert.ok(!adeTeam.some((s) => s.staffId === 'pic_bobby'), 'Ade does NOT see Bobby (reports to Ristanto)');
  assert.ok(!adeTeam.some((s) => s.staffId === 'pic_salima'), 'Ade does NOT see Salima (reports to Gusman)');
  assert.ok(!adeTeam.some((s) => s.staffId === 'pic_nana'), 'Ade does NOT see Nana (reports to Hildasari)');

  // 3. Developer Detailed Edit Modal:
  //    Edit Role, Division, Supervisor, Team Members Assignment, and Custom Attendance Viewers
  const updatedByNugi = superadminUpdateAnyProfile(
    SEED_FUTARI_STAFF_FIXTURE,
    nugi,
    'pm_ade',
    {
      role: 'Project Manager',
      division: 'PM',
      supervisor: 'Hildasari Umami (Founder & CEO)',
      teamMemberIds: ['pic_ferdy', 'adm_sesil', 'pic_nana'], // Assign Nana to Ade's team as well
      allowedAttendanceViewerIds: ['des_ulian'], // Explicitly allow Ulian to view Ade's attendance
    }
  );

  const adeUpdated = updatedByNugi.find((s) => s.staffId === 'pm_ade')!;
  const nanaUpdated = updatedByNugi.find((s) => s.staffId === 'pic_nana')!;
  assert.equal(adeUpdated.supervisor, 'Hildasari Umami (Founder & CEO)');
  assert.deepEqual(adeUpdated.allowedAttendanceViewerIds, ['des_ulian']);
  assert.equal(nanaUpdated.supervisor, 'Ade Yenny (Project Manager)');

  // Verify Ade's team in Team Dashboard now includes Nana (direct report) + Ade herself
  const adeTeamAfterAssign = getTeamDashboardPersonnel(adeUpdated, updatedByNugi);
  assert.ok(adeTeamAfterAssign.some((s) => s.staffId === 'pm_ade'));
  assert.ok(adeTeamAfterAssign.some((s) => s.staffId === 'pic_nana'));
  assert.ok(adeTeamAfterAssign.some((s) => s.staffId === 'pic_ferdy'));
  assert.ok(adeTeamAfterAssign.some((s) => s.staffId === 'adm_sesil'));

  // Verify Custom Attendance Viewer (Ulian) can now view Ade's attendance
  assert.equal(canUserViewStaffAttendance(ulian, adeUpdated), true);

  // 4. Export Features: Dynamically calculate Regular Hours vs Overtime (>= 20:00) ONLY for strictly filtered visible data
  const sampleLogs: AttendanceRecord[] = [
    {
      id: 'log_ferdy_ot',
      staffId: 'pic_ferdy',
      staffName: 'Ferdy',
      role: 'Person In Charge (PIC)',
      branch: 'JKT',
      date: '2026-10-20',
      mode: 'WFO',
      checkInTime: '10:00',
      checkOutTime: '22:00', // 10:00 -> 20:00 = 10h regular, 20:00 -> 22:00 = 2h overtime (IDR 14,000)
      regularHours: 10,
      lateMinutes: 0,
      overtimeHours: 2,
      overtimePay: 14000,
      overtimeNote: 'Loading panggung utama',
      locationWatermark: FUTARI_HQ_ADDRESS,
      status: 'completed',
    },
    {
      id: 'log_bobby_ot', // Bobby reports to Ristanto, NOT Ade Yenny
      staffId: 'pic_bobby',
      staffName: 'Bobby',
      role: 'Person In Charge (PIC)',
      branch: 'JKT',
      date: '2026-10-20',
      mode: 'WFE',
      checkInTime: '10:00',
      checkOutTime: '23:00', // 3h overtime
      regularHours: 10,
      lateMinutes: 0,
      overtimeHours: 3,
      overtimePay: 21000,
      overtimeNote: 'Supervisi JCC',
      locationWatermark: FUTARI_HQ_ADDRESS,
      status: 'completed',
    },
  ];

  // Ferdy (PIC) export logs must ONLY include himself (Ferdy) and Sesil (same supervisor) and strictly exclude Bobby
  const ferdyExportLogs = buildTeamDashboardExportLogs(
    ferdy,
    sampleLogs,
    SEED_FUTARI_STAFF_FIXTURE
  );
  assert.equal(ferdyExportLogs.length, 2);
  assert.ok(ferdyExportLogs.some((l) => l.staffId === 'pic_ferdy'));
  assert.ok(ferdyExportLogs.some((l) => l.staffId === 'adm_sesil'));
  assert.ok(!ferdyExportLogs.some((l) => l.staffId === 'pic_bobby'));

  const ferdyTotals = calculateAttendanceExportTotals(ferdyExportLogs);
  assert.equal(ferdyTotals.totalOvertimeHours, 2);
  assert.equal(ferdyTotals.totalOvertimePay, 14000);
  assert.ok(ferdyTotals.totalRegularWorkingHours > 10);

  // Executive / Finance / Digital global export logs include all 23 personnel (including both Ferdy and Bobby's overtime)
  const globalExportLogs = buildTeamDashboardExportLogs(
    erlita,
    sampleLogs,
    SEED_FUTARI_STAFF_FIXTURE
  );
  assert.equal(globalExportLogs.length, 23);
  const globalTotals = calculateAttendanceExportTotals(globalExportLogs);
  assert.equal(globalTotals.totalOvertimeHours, 5); // 2h (Ferdy) + 3h (Bobby)
  assert.equal(globalTotals.totalOvertimePay, 35000);
});

test('FINAL PRODUCTION PREPARATION — Complete Data Wipe, Root Superadmin Seed, Real Registration Flow (Unassigned), and Strict Fleet RBAC', () => {
  // 1. WIPE ALL TRANSACTIONAL MOCK DATA:
  //    Verify attendanceRecords, pettyCashEvents, fleetVehicles, sops, and tasks are ALL empty arrays `[]`
  assert.deepEqual(INITIAL_ATTENDANCE_LOGS, []);
  assert.deepEqual(INITIAL_PETTY_CASH_EVENTS, []);
  assert.deepEqual(INITIAL_PETTY_CASH_EXPENSES, []);
  assert.deepEqual(INITIAL_FLEET_VEHICLES, []);
  assert.deepEqual(INITIAL_COMPANY_SOPS, []);
  assert.deepEqual(INITIAL_WORK_TASKS, []);
  assert.deepEqual(INITIAL_CHAT_MESSAGES, []);
  assert.deepEqual(INITIAL_LEAVE_RECORDS, []);
  assert.deepEqual(INITIAL_CALENDAR_EVENTS, []);
  assert.deepEqual(INITIAL_DAILY_CHECKLISTS, []);

  // 2. SEED ROOT ADMIN (WIPE PERSONNEL DATA):
  //    Verify `personnel` (`INITIAL_FUTARI_STAFF` / `INITIAL_PERSONNEL`) contains EXACTLY ONE user object:
  //    { id: '1', name: 'Nugi Nugroho', email: 'nuginugroho2005@gmail.com', role: 'Digital', division: 'Design_Talent_Production', location: 'JKT', status: 'ACTIVE' }
  assert.equal(INITIAL_FUTARI_STAFF.length, 1);
  assert.equal(INITIAL_PERSONNEL.length, 1);
  const rootAdmin = INITIAL_FUTARI_STAFF[0];
  assert.equal(rootAdmin.id, '1');
  assert.equal(rootAdmin.staffId, '1');
  assert.equal(rootAdmin.name, 'Nugi Nugroho');
  assert.equal(rootAdmin.email, 'nuginugroho2005@gmail.com');
  assert.equal(rootAdmin.role, 'Digital');
  assert.equal(rootAdmin.division, 'Design_Talent_Production');
  assert.equal(rootAdmin.location, 'JKT');
  assert.equal(rootAdmin.status, 'ACTIVE');
  assert.equal(isDeveloperSuperadmin(rootAdmin), true);

  // 3. REAL REGISTRATION FLOW HANDLING:
  //    When a new user authenticates via Google/Email and does NOT exist in `personnel`,
  //    automatically append a new user object with their Display Name, Email, and default role of `Unassigned`
  const registrationResult = mapFirebaseUserToStaffProfile(
    'rio.antoni@futari.id',
    'M Rio Antoni',
    INITIAL_FUTARI_STAFF
  );
  assert.equal(registrationResult.isNewRegistration, true);
  assert.equal(registrationResult.updatedStaffList.length, 2);
  assert.equal(registrationResult.matchedStaff.name, 'M Rio Antoni');
  assert.equal(registrationResult.matchedStaff.email, 'rio.antoni@futari.id');
  assert.equal(registrationResult.matchedStaff.role, 'Unassigned');

  //    While role is 'Unassigned', the user CANNOT manage fleet vehicles
  assert.equal(canManageFleetVehicles(registrationResult.matchedStaff), false);

  //    Developer (Nugi) uses User Management to assign their proper Role ('Operational'), Division ('Executive'), and Supervisor
  const afterNugiAssignsRio = superadminUpdateAnyProfile(
    registrationResult.updatedStaffList,
    rootAdmin,
    registrationResult.matchedStaff.staffId,
    {
      role: 'Operational',
      division: 'Executive',
      supervisor: 'Hildasari Umami (Founder & CEO)',
    }
  );
  const assignedRio = afterNugiAssignsRio.find(
    (s) => s.staffId === registrationResult.matchedStaff.staffId
  )!;
  assert.equal(assignedRio.role, 'Operational');
  assert.equal(assignedRio.division, 'Executive');

  // 4. REINFORCE FLEET MANAGEMENT RBAC:
  //    ONLY users with the role `Operational` (M Rio Antoni, once assigned) or `Digital` (Nugi Nugroho)
  //    are authorized to see "Add Car" and "Delete Car" (`canManageFleetVehicles === true`).
  assert.equal(canManageFleetVehicles(rootAdmin), true, 'Digital (Nugi) can manage fleet');
  assert.equal(canManageFleetVehicles(assignedRio), true, 'Operational (Rio) can manage fleet');

  //    All other roles (including Founder & CEO, Finance, PM, PIC, Admin, Unassigned) are strictly blocked
  const ceoUser = { ...assignedRio, role: 'Founder & CEO', division: 'Executive' as const };
  const pmUser = { ...assignedRio, role: 'Project Manager', division: 'PM' as const };
  const financeUser = { ...assignedRio, role: 'Finance', division: 'Admin_Finance' as const };
  assert.equal(canManageFleetVehicles(ceoUser), true);
  assert.equal(canManageFleetVehicles(pmUser), false);
  assert.equal(canManageFleetVehicles(financeUser), false);
});



