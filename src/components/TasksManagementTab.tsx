import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckSquare,
  Square,
  PlusCircle,
  UserCheck,
  ShieldCheck,
  Lock,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  WorkTaskItem,
  StaffMemberRecord,
  canModifyWorkTask,
  isDirectReportOf,
  hasGlobalRoleAccess,
  toLocalDateKey,
} from '../utils/futariLogic';

interface TasksManagementTabProps {
  currentUser: StaffMemberRecord;
  staffList: StaffMemberRecord[];
  tasks: WorkTaskItem[];
  onAddTask: (input: {
    title: string;
    assigned_to: string;
    description: string;
    due_date: string;
    taskName?: string;
    assigneeId?: string;
    startDate?: string;
    deadlineDate?: string;
    notes?: string;
  }) => void;
  onToggleTask: (taskId: string) => void;
  onUpdateTask: (
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
  ) => void;
  onOpenCalendarTab?: () => void;
  isDark: boolean;
}

export const TasksManagementTab: React.FC<TasksManagementTabProps> = ({
  currentUser,
  staffList,
  tasks,
  onAddTask,
  onToggleTask,
  onUpdateTask,
  isDark,
}) => {
  // Dynamically fetch users from Supabase `personnel` table
  const [personnelUsers, setPersonnelUsers] = useState<
    Array<{ id: any; name: string; email: string; role: string; division?: string }>
  >([]);

  useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        const { data, error } = await supabase
          .from('personnel')
          .select('id, name, email, role, division')
          .order('name', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          setPersonnelUsers(data);
          if (!assignedToInput && data[0]?.email) {
            setAssignedToInput(data[0].email);
          }
        }
      } catch (err) {
        console.warn('Error fetching personnel for tasks:', err);
      }
    };
    fetchPersonnel();
  }, []);

  const availableAssignees = useMemo(() => {
    if (personnelUsers.length > 0) {
      return personnelUsers.map((p) => ({
        id: String(p.id),
        email: p.email,
        name: p.name,
        role: p.role,
      }));
    }
    return staffList.map((s) => ({
      id: s.staffId,
      email: s.email,
      name: s.name,
      role: s.role,
    }));
  }, [personnelUsers, staffList]);

  // Real-time default deadline = 2 days from now
  const defaultDeadline = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return toLocalDateKey(d);
  })();

  // Form State mapped directly to Supabase `tasks` schema:
  // 'Nama Pekerjaan' -> title
  // 'Personel Pelaksana' -> assigned_to (email)
  // 'Catatan' -> description
  // 'Tenggat Waktu' -> due_date
  const [taskTitleInput, setTaskTitleInput] = useState<string>('');
  const [assignedToInput, setAssignedToInput] = useState<string>(
    currentUser.email || ''
  );
  const [dueDateInput, setDueDateInput] = useState<string>(defaultDeadline);
  const [descriptionInput, setDescriptionInput] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    if (!assignedToInput && availableAssignees.length > 0) {
      const match = availableAssignees.find(
        (a) => a.email.toLowerCase() === (currentUser.email || '').toLowerCase()
      );
      setAssignedToInput(match?.email || availableAssignees[0].email);
    }
  }, [availableAssignees, currentUser.email, assignedToInput]);

  // Task Editing State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAssignedTo, setEditAssignedTo] = useState<string>('');
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');

  // Filter state
  const [filterMode, setFilterMode] = useState<'ACTIVE' | 'ALL' | 'COMPLETED' | 'MINE'>(
    'ACTIVE'
  );

  const surfaceCard = isDark
    ? 'bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-2xl text-slate-100'
    : 'bg-white/70 backdrop-blur-md border border-white/40 shadow-lg text-slate-900';
  const mutedText = isDark ? 'text-slate-300' : 'text-slate-600';

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const title = taskTitleInput.trim();
    if (!title) {
      setFormError('Nama Pekerjaan wajib diisi.');
      return;
    }
    if (!assignedToInput) {
      setFormError('Personel Pelaksana wajib dipilih.');
      return;
    }
    if (!dueDateInput) {
      setFormError('Tenggat Waktu wajib diisi.');
      return;
    }

    onAddTask({
      title,
      assigned_to: assignedToInput,
      description: descriptionInput.trim(),
      due_date: dueDateInput,
      taskName: title,
      assigneeId: assignedToInput,
      deadlineDate: dueDateInput,
      notes: descriptionInput.trim(),
    });

    setTaskTitleInput('');
    setDescriptionInput('');
  };

  const handleStartEdit = (task: WorkTaskItem) => {
    if (!canModifyWorkTask(currentUser, task, staffList)) return;
    setEditingTaskId(task.id);
    setEditTitle(task.title || task.taskName);
    setEditAssignedTo(task.assigned_to || task.assigneeId);
    setEditDueDate(task.due_date ? task.due_date.split('T')[0] : task.deadlineDate);
    setEditDescription(task.description || task.notes || '');
  };

  const handleSaveEdit = (taskId: string) => {
    if (!editTitle.trim()) return;
    onUpdateTask(taskId, {
      title: editTitle.trim(),
      assigned_to: editAssignedTo,
      due_date: editDueDate,
      description: editDescription.trim(),
      taskName: editTitle.trim(),
      assigneeId: editAssignedTo,
      deadlineDate: editDueDate,
      notes: editDescription.trim(),
    });
    setEditingTaskId(null);
  };

  const getEditPermissionReason = (task: WorkTaskItem): string => {
    const userEmail = (currentUser.email || '').trim().toLowerCase();
    const taskAssigned = (task.assigned_to || task.assigneeId || '').toLowerCase();
    if (userEmail === taskAssigned || currentUser.staffId === task.assigneeId) {
      return 'Personel Pelaksana';
    }
    if (currentUser.staffId === task.creatorId) {
      return 'Pembuat Tugas';
    }
    const assignee = staffList.find(
      (s) => s.staffId === task.assigneeId || s.email.toLowerCase() === taskAssigned
    );
    if (assignee && isDirectReportOf(assignee, currentUser)) {
      return `Direct Supervisor`;
    }
    return 'Read-Only';
  };

  const isGlobalUser = hasGlobalRoleAccess(currentUser);

  // Strict RBAC: Global roles (Executive, Finance, Digital) see all tasks.
  // Restricted roles (PM, Design, Multimedia, TL, PIC) see ONLY tasks assigned to themselves, created by them, or assigned to direct reports.
  const rbacVisibleTasks = useMemo(() => {
    if (isGlobalUser) return tasks;

    const userEmail = (currentUser.email || '').trim().toLowerCase();
    return tasks.filter((t) => {
      const taskEmail = (t.assigned_to || '').trim().toLowerCase();
      // Assigned to self or created by self
      if (t.assigneeId === currentUser.staffId || t.creatorId === currentUser.staffId) return true;
      if (taskEmail && taskEmail === userEmail) return true;

      // Assigned to a direct report
      const assignee = staffList.find(
        (s) => s.staffId === t.assigneeId || (taskEmail && s.email.toLowerCase() === taskEmail)
      );
      if (assignee && isDirectReportOf(assignee, currentUser)) {
        return true;
      }
      return false;
    });
  }, [tasks, currentUser, staffList, isGlobalUser]);

  const filteredTasks = rbacVisibleTasks.filter((t) => {
    if (filterMode === 'ACTIVE') {
      return !t.completed && !t.is_completed;
    }
    if (filterMode === 'COMPLETED') {
      return t.completed || Boolean(t.is_completed);
    }
    if (filterMode === 'MINE') {
      const userEmail = (currentUser.email || '').trim().toLowerCase();
      const taskEmail = (t.assigned_to || '').trim().toLowerCase();
      return (
        t.assigneeId === currentUser.staffId ||
        t.creatorId === currentUser.staffId ||
        (taskEmail && taskEmail === userEmail)
      );
    }
    return true;
  });

  const activeCount = rbacVisibleTasks.filter((t) => !t.completed && !t.is_completed).length;
  const completedCount = rbacVisibleTasks.filter((t) => t.completed || Boolean(t.is_completed)).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
      data-testid="tasks-management-tab"
    >
      {/* Clean Header Banner */}
      <div className={`p-4 md:p-6 rounded-2xl border min-w-0 ${surfaceCard}`}>
        <h1 className="text-lg md:text-2xl font-bold font-display break-words">
          Jobdesk
        </h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Add New Task Form */}
        <form
          onSubmit={handleCreateTaskSubmit}
          data-testid="create-work-task-form"
          className={`xl:col-span-5 p-4 md:p-6 rounded-2xl border ${surfaceCard} space-y-4 min-w-0`}
        >
          <div className="flex items-center justify-between border-b border-slate-700/40 pb-3">
            <h2 className="text-sm sm:text-base font-bold font-display flex items-center gap-2 text-[#00B4D8]">
              <PlusCircle className="w-4 h-4" />
              <span>Tambah Pekerjaan</span>
            </h2>
          </div>

          {/* 1. Nama Pekerjaan (title) */}
          <div>
            <label
              htmlFor="work-task-title-input"
              className="block text-xs font-semibold text-[#00B4D8] mb-1"
            >
              Nama Pekerjaan
            </label>
            <input
              id="work-task-title-input"
              data-testid="work-task-name-input"
              type="text"
              value={taskTitleInput}
              onChange={(e) => setTaskTitleInput(e.target.value)}
              placeholder="Contoh: Finalisasi Stage Blueprint & Lighting JCC"
              className={`w-full px-3 py-2.5 rounded-lg text-xs border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* 2. Personel Pelaksana (assigned_to) - Dynamically fetched from Supabase personnel table */}
          <div>
            <label
              htmlFor="work-task-assignee-select"
              className="block text-xs font-semibold text-[#00B4D8] mb-1"
            >
              Personel Pelaksana
            </label>
            <select
              id="work-task-assignee-select"
              data-testid="work-task-assignee-select"
              value={assignedToInput}
              onChange={(e) => setAssignedToInput(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="">-- Pilih Personel Pelaksana --</option>
              {availableAssignees.map((s) => (
                <option key={s.id || s.email} value={s.email}>
                  {s.name} ({s.email}) — {s.role}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Tenggat Waktu (due_date) */}
          <div>
            <label
              htmlFor="work-task-due-date"
              className="block text-xs font-semibold text-amber-400 mb-1"
            >
              Tenggat Waktu
            </label>
            <input
              id="work-task-due-date"
              data-testid="work-task-deadline-date"
              type="date"
              value={dueDateInput}
              onChange={(e) => setDueDateInput(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg text-xs font-mono border ${
                isDark
                  ? 'bg-slate-950 border-amber-500/50 text-white'
                  : 'bg-slate-50 border-amber-400 text-slate-900'
              }`}
            />
          </div>

          {/* 4. Catatan (description) */}
          <div>
            <label
              htmlFor="work-task-description-input"
              className="block text-xs font-medium mb-1"
            >
              Catatan
            </label>
            <textarea
              id="work-task-description-input"
              rows={2}
              value={descriptionInput}
              onChange={(e) => setDescriptionInput(e.target.value)}
              placeholder="Catatan atau detail pekerjaan..."
              className={`w-full px-3 py-2 rounded-lg text-xs border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {formError && (
            <p className="text-xs text-rose-400 font-medium">{formError}</p>
          )}

          <button
            type="submit"
            data-testid="submit-work-task-btn"
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white shadow-md transition-all bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 cursor-pointer"
          >
            + Simpan Pekerjaan
          </button>
        </form>

        {/* RIGHT COLUMN: Task List */}
        <div
          className={`xl:col-span-7 p-4 md:p-6 rounded-2xl border ${surfaceCard} space-y-4 min-w-0`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-700/40 pb-3">
            <div>
              <h2 className="text-base font-bold font-display flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#00B4D8]" />
                <span>Daftar Pekerjaan ({filteredTasks.length})</span>
              </h2>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: 'ACTIVE', label: `Aktif (${activeCount})` },
                  { id: 'COMPLETED', label: `Selesai (${completedCount})` },
                  { id: 'MINE', label: 'Tugas Saya' },
                  { id: 'ALL', label: `Semua (${tasks.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filterMode === tab.id
                      ? 'bg-[#0277BD] text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div data-testid="work-tasks-list" className="space-y-3">
            {filteredTasks.length === 0 && (
              <div
                data-testid="tasks-empty-state"
                className={`p-6 rounded-xl border border-dashed text-center text-xs ${
                  isDark
                    ? 'border-slate-700 bg-slate-950/40 text-slate-400'
                    : 'border-slate-300 bg-slate-50 text-slate-600'
                }`}
              >
                Belum ada pekerjaan yang dijadwalkan.
              </div>
            )}
            {filteredTasks.map((task) => {
              const canModify = canModifyWorkTask(
                currentUser,
                task,
                staffList
              );
              const permissionLabel = getEditPermissionReason(task);
              const isDone = task.completed || Boolean(task.is_completed);
              const dueDisplay = task.due_date
                ? task.due_date.split('T')[0]
                : task.deadlineDate;

              return (
                <div
                  key={task.id}
                  data-testid={`work-task-card-${task.id}`}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    isDone ? 'opacity-50 grayscale-[25%]' : 'opacity-100'
                  } ${
                    canModify
                      ? isDark
                        ? 'bg-slate-950/80 border-[#00B4D8]/40'
                        : 'bg-sky-50/40 border-[#00B4D8]/40'
                      : isDark
                      ? 'bg-slate-950/40 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {editingTaskId === task.id && canModify ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#00B4D8] mb-1">
                          Nama Pekerjaan
                        </label>
                        <input
                          type="text"
                          data-testid={`edit-task-name-input-${task.id}`}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                            isDark
                              ? 'bg-slate-900 border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#00B4D8] mb-1">
                            Personel Pelaksana
                          </label>
                          <select
                            value={editAssignedTo}
                            onChange={(e) => setEditAssignedTo(e.target.value)}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs border ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white'
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          >
                            {availableAssignees.map((s) => (
                              <option key={s.id || s.email} value={s.email}>
                                {s.name} ({s.email}) — {s.role}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-amber-400 mb-1">
                            Tenggat Waktu
                          </label>
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono border ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white'
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-1">
                          Catatan
                        </label>
                        <textarea
                          rows={2}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className={`w-full px-3 py-1.5 rounded-lg text-xs border ${
                            isDark
                              ? 'bg-slate-900 border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(task.id)}
                          data-testid={`save-edit-task-btn-${task.id}`}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Simpan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                          className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Batal</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          disabled={!canModify}
                          data-testid={`toggle-work-task-btn-${task.id}`}
                          onClick={() => {
                            if (!canModify) return;
                            onToggleTask(task.id);
                          }}
                          className={`flex items-start gap-2.5 text-left ${
                            canModify
                              ? 'cursor-pointer'
                              : 'cursor-not-allowed opacity-75'
                          }`}
                        >
                          {isDone ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <Square
                              className={`w-4 h-4 shrink-0 mt-0.5 ${
                                canModify ? 'text-[#00B4D8]' : 'text-slate-500'
                              }`}
                            />
                          )}
                          <div>
                            <p
                              className={`text-sm font-bold leading-snug ${
                                isDone ? 'line-through text-slate-400' : ''
                              }`}
                            >
                              {task.title || task.taskName}
                            </p>
                            {(task.description || task.notes) && (
                              <p className={`text-xs mt-0.5 ${mutedText}`}>
                                {task.description || task.notes}
                              </p>
                            )}
                            {task.completed_at && (
                              <p className="text-[10px] text-emerald-400/90 font-mono mt-0.5">
                                Selesai pada: {new Date(task.completed_at).toLocaleString('id-ID')}
                              </p>
                            )}
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            data-testid={`task-permission-badge-${task.id}`}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold inline-flex items-center gap-1 ${
                              canModify
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {canModify ? (
                              <ShieldCheck className="w-3 h-3" />
                            ) : (
                              <Lock className="w-3 h-3" />
                            )}
                            <span>{permissionLabel}</span>
                          </span>

                          {canModify && (
                            <button
                              type="button"
                              data-testid={`edit-work-task-btn-${task.id}`}
                              onClick={() => handleStartEdit(task)}
                              className="p-1.5 rounded-lg bg-[#00B4D8]/15 text-[#00B4D8] hover:bg-[#00B4D8]/25 cursor-pointer"
                              title="Edit Tugas"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/50 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex flex-wrap items-center gap-3">
                          <span>
                            Pelaksana:{' '}
                            <strong className="text-[#00B4D8]">
                              {task.assigned_to || task.assigneeName}
                            </strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono">
                          <span
                            data-testid={`task-deadline-badge-${task.id}`}
                            className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                          >
                            Tenggat: {dueDisplay || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
