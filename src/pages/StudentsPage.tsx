import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Archive, RotateCcw, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useUiStore } from '../store/ui';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { StudentForm } from '../components/StudentForm';
import { displayName, initials, groupLabel, editableNameFields } from '../utils/students';
import { BY_LEVELS, JDY_ROLES } from '../types';
import type { Student, StudentFormData, GroupName } from '../types';

function StudentInitials({ student }: { student: Student }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-500">
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

  const levelOptions = groupFilter === 'JDY' ? JDY_ROLES : BY_LEVELS;

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

  const handleDelete = async () => {
    if (!deletingStudent || deleteConfirmText !== displayName(deletingStudent)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/students/${deletingStudent.id}`);
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">Students</h1>
          <p className="mt-2 text-base text-ink-400">
            {showArchived ? `${filtered.length} archived students` : `${filtered.length} enrolled students`}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-pill bg-accent-charcoal px-6 py-2.5 text-sm font-medium text-white shadow-pill transition-all hover:bg-accent-dark"
        >
          <Plus className="h-4 w-4" />
          Add Student
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['ALL', 'BY', 'JDY'] as GroupFilter[]).map((g) => (
          <button
            key={g}
            onClick={() => handleGroupFilterChange(g)}
            className={`rounded-pill border px-4 py-2 text-sm font-medium transition-colors ${
              groupFilter === g
                ? 'border-accent-charcoal bg-accent-charcoal text-white'
                : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50'
            }`}
          >
            {g === 'ALL' ? 'All Groups' : g}
          </button>
        ))}
        {groupFilter !== 'ALL' && (
          <>
            <span className="mx-1 h-5 w-px bg-ink-200" />
            <button
              onClick={() => setLevelFilter('')}
              className={`rounded-pill border px-3 py-2 text-xs font-medium transition-colors ${
                levelFilter === ''
                  ? 'border-ink-300 bg-ink-200 text-ink-700'
                  : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50'
              }`}
            >
              All {groupFilter === 'JDY' ? 'Roles' : 'Levels'}
            </button>
            {levelOptions.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`rounded-pill border px-3 py-2 text-xs font-medium transition-colors ${
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-card-sm border border-ink-200 bg-white py-3 pl-11 pr-4 text-sm text-ink-700 shadow-card placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
          />
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`rounded-pill border px-4 py-2.5 text-sm font-medium transition-colors ${
            showArchived
              ? 'border-ink-300 bg-ink-200 text-ink-700'
              : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50'
          }`}
        >
          {showArchived ? 'Showing archived' : 'Show archived'}
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
                className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-ink-50/50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="flex items-center gap-4">
                  <StudentInitials student={student} />
                  <div className="min-w-0">
                    <Link
                      to={`/students/${student.id}`}
                      className="text-sm font-medium text-ink-800 hover:text-ink-900"
                    >
                      {displayName(student)}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-400">
                      <span>{student.level}</span>
                      {!!student.age && <span>Age {student.age}</span>}
                      <span>{student.gender}</span>
                      {student.phone && <span>{student.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-14 sm:gap-3 sm:pl-0">
                  <Badge variant={groupLabel(student) === 'JDY' ? 'JDY' : 'BY'}>{groupLabel(student)}</Badge>
                  <Badge variant={student.active ? 'active' : 'archived'}>
                    {student.active ? 'Active' : 'Archived'}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingStudent(student)}
                      className="rounded-pill px-3 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
                    >
                      Edit
                    </button>
                    {student.active ? (
                      <button
                        onClick={() => handleArchive(student)}
                        className="flex items-center gap-1 rounded-pill px-3 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
                      >
                        <Archive className="h-3 w-3" />
                        Archive
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRestore(student)}
                          className="flex items-center gap-1 rounded-pill px-3 py-1.5 text-xs font-medium text-status-success transition-colors hover:bg-status-success-soft"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore
                        </button>
                        <button
                          onClick={() => { setDeletingStudent(student); setDeleteConfirmText(''); }}
                          className="flex items-center gap-1 rounded-pill px-3 py-1.5 text-xs font-medium text-status-danger transition-colors hover:bg-status-danger-soft"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </>
                    )}
                    <Link
                      to={`/students/${student.id}`}
                      className="rounded-full p-1.5 text-ink-300 transition-colors hover:bg-ink-100 hover:text-ink-600"
                      aria-label={`View ${displayName(student)}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
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
                Type <span className="font-semibold text-ink-600">{displayName(deletingStudent)}</span> to confirm
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
                disabled={deleting || deleteConfirmText !== displayName(deletingStudent)}
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
