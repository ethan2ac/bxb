import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Archive, RotateCcw, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useUiStore } from '../store/ui';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { StudentForm } from '../components/StudentForm';
import type { Student, StudentFormData } from '../types';

export function StudentsPage() {
  const { addToast } = useUiStore();
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const url = showArchived ? '/api/students?includeArchived=true' : '/api/students';
  const { data: students, loading, refetch } = useApi<Student[]>(url);

  const filtered = (students || []).filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    if (showArchived) return matchesSearch;
    return matchesSearch && s.active === 1;
  });

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
    addToast(`${student.name} archived`, 'success');
    await refetch();
  };

  const handleRestore = async (student: Student) => {
    await api.post(`/api/students/${student.id}/restore`);
    addToast(`${student.name} restored`, 'success');
    await refetch();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Students</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Add Student
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-slate-300"
          />
          Show archived
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search ? 'No matches' : 'No students yet'}
          description={search ? 'Try a different search term' : 'Add your first student to get started'}
          action={
            !search && (
              <button
                onClick={() => setShowAddModal(true)}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Add Student
              </button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="hidden px-4 py-3 font-medium text-slate-600 sm:table-cell">Age</th>
                <th className="hidden px-4 py-3 font-medium text-slate-600 md:table-cell">Gender</th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/students/${student.id}`}
                      className="font-medium text-brand-600 hover:text-brand-700"
                    >
                      {student.name}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{student.age}</td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{student.gender}</td>
                  <td className="px-4 py-3">
                    <Badge variant={student.active ? 'active' : 'archived'}>
                      {student.active ? 'Active' : 'Archived'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingStudent(student)}
                        className="rounded px-2 py-1 text-xs text-brand-600 hover:bg-brand-50"
                      >
                        Edit
                      </button>
                      {student.active ? (
                        <button
                          onClick={() => handleArchive(student)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        >
                          <Archive className="h-3 w-3" />
                          Archive
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(student)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-green-600 hover:bg-green-50"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore
                        </button>
                      )}
                      <Link
                        to={`/students/${student.id}`}
                        className="rounded p-1 text-slate-400 hover:text-slate-600"
                        aria-label={`View ${student.name}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            initial={editingStudent}
            onSubmit={handleEdit}
            onCancel={() => setEditingStudent(null)}
            submitLabel="Update"
          />
        )}
      </Modal>
    </div>
  );
}
