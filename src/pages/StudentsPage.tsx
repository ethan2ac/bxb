import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Archive, RotateCcw, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useUiStore } from '../store/ui';
import { PageSkeleton } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { StudentForm } from '../components/StudentForm';
import { PageHeader } from '../components/PageHeader';
import { GroupToggle } from '../components/GroupToggle';
import { displayName, initials, groupLabel, editableNameFields } from '../utils/students';
import { BY_LEVELS } from '../types';
import type { Student, StudentFormData, GroupName } from '../types';

function StudentInitials({ student }: { student: Student }) {
  return (
    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-500">
      {initials(student)}
    </div>
  );
}

type GroupFilter = 'ALL' | GroupName;

export function StudentsPage() {
  const { addToast } = useUiStore();
  const [showArchived, setShowArchived] = useState(false);
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('ALL');
  const [levelFilter, setLevelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const params = new URLSearchParams();
  if (showArchived) params.set('includeArchived', 'true');
  if (groupFilter !== 'ALL') params.set('group', groupFilter);
  if (levelFilter) params.set('level', levelFilter);
  const url = `/api/students?${params.toString()}`;
  const { data: students, loading, refetch } = useApi<Student[]>(url);

  const filtered = (students || []).filter((s) => {
    const matchesSearch =
      (s.english_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.chinese_name || '').includes(search);
    if (showArchived) return matchesSearch && s.active === 0;
    return matchesSearch && s.active === 1;
  });

  const handleGroupFilterChange = (group: GroupFilter) => {
    setGroupFilter(group);
    setLevelFilter('');
  };

  const handleAdd = async (data: StudentFormData) => {
    await api.post('/api/students', data);
    addToast('Student added', 'success');
    setShowAddModal(false);
    await refetch();
  };

  const handleEdit = async (data: StudentFormData) => {
    if (!editingStudent) return;
    await api.put(`/api/students/${editingStudent.id}`, data);
    addToast('Student updated', 'success');
    setEditingStudent(null);
    await refetch();
  };

  const handleArchive = async (student: Student) => {
    await api.post(`/api/students/${student.id}/archive`);
    addToast(`${displayName(student)} archived`, 'success');
    await refetch();
  };

  const handleRestore = async (student: Student) => {
    await api.post(`/api/students/${student.id}/restore`);
    addToast(`${displayName(student)} restored`, 'success');
    await refetch();
  };

  const DELETE_CONFIRM_PHRASE = 'ICONFIRM';

  const handleDelete = async () => {
    if (!deletingStudent || deleteConfirmText !== DELETE_CONFIRM_PHRASE) return;
    setDeleting(true);
    try {
      await api.delete(`/api/students/${deletingStudent.id}`, { confirm: deleteConfirmText });
      addToast(`${displayName(deletingStudent)} permanently deleted`, 'success');
      setDeletingStudent(null);
      setDeleteConfirmText('');
      await refetch();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Students"
        description={showArchived ? `${filtered.length} archived` : `${filtered.length} enrolled`}
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-pill bg-accent-charcoal px-5 py-2.5 text-sm font-medium text-white shadow-pill transition-colors hover:bg-accent-dark"
          >
            <Plus className="h-4 w-4" />
            Add Student
          </button>
        }
      />

      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <GroupToggle value={groupFilter} onChange={handleGroupFilterChange} />
        {groupFilter === 'BY' && (
          <>
            <span className="mx-1 h-5 w-px flex-none bg-ink-200" />
            <button
              onClick={() => setLevelFilter('')}
              className={`flex-none rounded-pill border px-3 py-2 text-xs font-medium transition-colors ${
                levelFilter === ''
                  ? 'border-ink-300 bg-ink-200 text-ink-700'
                  : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50'
              }`}
            >
              All Levels
            </button>
            {BY_LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`flex-none rounded-pill border px-3 py-2 text-xs font-medium transition-colors ${
                  levelFilter === lvl
                    ? 'border-ink-300 bg-ink-200 text-ink-700'
                    : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50'
                }`}
              >
                {lvl}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input
            type="search"
            placeholder="Search students"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-10 pr-4 text-sm text-ink-700 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
          />
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          aria-pressed={showArchived}
          className={`flex h-10 flex-none items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors ${
            showArchived
              ? 'border-accent-charcoal bg-accent-charcoal text-white'
              : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50'
          }`}
        >
          <Archive className="h-3.5 w-3.5" />
          Archived
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No matches' : 'No students yet'}
          description={search ? 'Try a different search term' : 'Add your first student to get started'}
          action={
            !search && (
              <button
                onClick={() => setShowAddModal(true)}
                className="rounded-pill bg-accent-charcoal px-6 py-2.5 text-sm font-medium text-white shadow-pill hover:bg-accent-dark"
              >
                Add Student
              </button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
          <div className="divide-y divide-ink-100">
            {filtered.map((student) => (
              <div
                key={student.id}
                className="group flex items-center gap-2 pr-2 transition-colors hover:bg-ink-50/60 sm:pr-4"
              >
                {/* The whole name block is the link, not just the name text —
                    a full-row target instead of a few characters of text. */}
                <Link
                  to={`/students/${student.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4 py-3.5 pl-4 sm:pl-6"
                >
                  <StudentInitials student={student} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-800 group-hover:text-ink-900">
                      {displayName(student)}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-400">
                      <span>{student.level}</span>
                      {!!student.age && <span>Age {student.age}</span>}
                      <span>{student.gender}</span>
                      {student.phone && <span className="hidden sm:inline">{student.phone}</span>}
                    </div>
                  </div>
                </Link>
                <div className="flex flex-none items-center gap-2 sm:gap-3">
                  <Badge variant={groupLabel(student) === 'JDY' ? 'JDY' : 'BY'}>{groupLabel(student)}</Badge>
                  {/* Only the exception is labelled — an "Active" pill on
                      every row of an active list is noise. */}
                  {!student.active && <Badge variant="archived">Archived</Badge>}
                  <div className="flex items-center gap-1 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
                    <button
                      onClick={() => setEditingStudent(student)}
                      className="flex items-center gap-1 rounded-pill p-2 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700 sm:px-3 sm:py-1.5"
                      aria-label={`Edit ${displayName(student)}`}
                    >
                      <Pencil className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    {student.active ? (
                      <button
                        onClick={() => handleArchive(student)}
                        className="flex items-center gap-1 rounded-pill p-2 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700 sm:px-3 sm:py-1.5"
                        aria-label={`Archive ${displayName(student)}`}
                      >
                        <Archive className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                        <span className="hidden sm:inline">Archive</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRestore(student)}
                          className="flex items-center gap-1 rounded-pill p-2 text-xs font-medium text-status-success transition-colors hover:bg-status-success-soft sm:px-3 sm:py-1.5"
                          aria-label={`Restore ${displayName(student)}`}
                        >
                          <RotateCcw className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                          <span className="hidden sm:inline">Restore</span>
                        </button>
                        <button
                          onClick={() => { setDeletingStudent(student); setDeleteConfirmText(''); }}
                          className="flex items-center gap-1 rounded-pill p-2 text-xs font-medium text-status-danger transition-colors hover:bg-status-danger-soft sm:px-3 sm:py-1.5"
                          aria-label={`Delete ${displayName(student)}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Student">
        <StudentForm onSubmit={handleAdd} onCancel={() => setShowAddModal(false)} submitLabel="Add Student" />
      </Modal>

      <Modal
        open={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        title="Edit Student"
      >
        {editingStudent && (
          <StudentForm
            initial={{
              ...editableNameFields(editingStudent),
              group_name: editingStudent.group_name,
              level: editingStudent.level,
              age: editingStudent.age || '',
              gender: editingStudent.gender,
              birthday: editingStudent.birthday ?? '',
              phone: editingStudent.phone ?? '',
              description: editingStudent.description ?? '',
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditingStudent(null)}
            submitLabel="Update"
          />
        )}
      </Modal>

      <Modal
        open={!!deletingStudent}
        onClose={() => { setDeletingStudent(null); setDeleteConfirmText(''); }}
        title="Permanently Delete Student"
      >
        {deletingStudent && (
          <div className="space-y-5">
            <div className="flex gap-3 rounded-card-sm border border-status-danger/30 bg-status-danger-soft p-4">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-status-danger" />
              <p className="text-sm text-ink-700">
                This will permanently delete <span className="font-semibold">{displayName(deletingStudent)}</span>{' '}
                and all of their attendance and forecast history. This action cannot be undone.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink-400">
                Type <span className="font-semibold text-ink-600">{DELETE_CONFIRM_PHRASE}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="mt-1.5 block w-full rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-800 shadow-sm focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setDeletingStudent(null); setDeleteConfirmText(''); }}
                className="rounded-pill border border-ink-200 bg-white px-5 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirmText !== DELETE_CONFIRM_PHRASE}
                className="rounded-pill bg-status-danger px-5 py-2.5 text-sm font-medium text-white shadow-pill transition-all hover:opacity-90 disabled:opacity-40"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
