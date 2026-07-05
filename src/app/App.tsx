import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { AttendancePage } from '../pages/AttendancePage';
import { StudentsPage } from '../pages/StudentsPage';
import { StudentDetailPage } from '../pages/StudentDetailPage';
import { WeeklyReportPage } from '../pages/WeeklyReportPage';
import { NoShowsPage } from '../pages/NoShowsPage';
import { SchedulePage } from '../pages/SchedulePage';
import { EventAttendancePage } from '../pages/EventAttendancePage';
import { ForecastPage } from '../pages/ForecastPage';
import { SettingsPage } from '../pages/SettingsPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function App() {
  const { checkAuth, initialized } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-shell-bg">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/:studentId" element={<StudentDetailPage />} />
          <Route path="reports/weekly" element={<WeeklyReportPage />} />
          <Route path="no-shows" element={<NoShowsPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="schedule/:eventId" element={<EventAttendancePage />} />
          <Route path="forecast" element={<ForecastPage />} />
          <Route path="forecast/:eventId" element={<ForecastPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
