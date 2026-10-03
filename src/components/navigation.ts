import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  History,
  CalendarDays,
  TrendingUp,
  UserX,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavSection {
  label: string;
  items: NavEntry[];
}

// Grouped by task rather than by when each feature shipped: Attendance leads
// "Session" since live check-in is the highest-frequency, most time-pressured
// action in the app; Schedule and Forecast are the prep work for that same
// session. Students is roster upkeep. History and No Shows are reviewed
// after the fact. Section labels double as the eyebrow on each page header,
// so the sidebar and the page you land on use the same vocabulary.
export const navSections: NavSection[] = [
  { label: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    label: 'Session',
    items: [
      { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
      { to: '/schedule', label: 'Schedule', icon: CalendarDays },
      { to: '/forecast', label: 'Forecast', icon: TrendingUp },
    ],
  },
  { label: 'People', items: [{ to: '/students', label: 'Students', icon: Users }] },
  {
    label: 'Insights',
    items: [
      { to: '/reports/weekly', label: 'History', icon: History },
      { to: '/no-shows', label: 'No Shows', icon: UserX },
    ],
  },
];

export const settingsEntry: NavEntry = { to: '/settings', label: 'Settings', icon: Settings };
export const adminEntry: NavEntry = { to: '/admin/users', label: 'Manage Users', icon: ShieldCheck };

// The four destinations that earn a slot in the phone tab bar — the rest
// live behind "More". Attendance sits in the middle-left where the thumb
// rests, since that's the screen people open mid-session.
export const mobileTabs: NavEntry[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { to: '/forecast', label: 'Forecast', icon: TrendingUp },
  { to: '/students', label: 'Students', icon: Users },
];

export function allPages(isOwner: boolean): NavEntry[] {
  return [...navSections.flatMap((s) => s.items), settingsEntry, ...(isOwner ? [adminEntry] : [])];
}
