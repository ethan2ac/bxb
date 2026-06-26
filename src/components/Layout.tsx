import { Outlet } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ToastContainer } from './Toast';
import { useAuthStore } from '../store/auth';
import { useUiStore } from '../store/ui';

export function Layout() {
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUiStore();

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user?.name}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
