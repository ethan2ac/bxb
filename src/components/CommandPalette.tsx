import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft, User } from 'lucide-react';
import { api } from '../lib/api';
import { displayName } from '../utils/students';
import type { Student } from '../types';
import type { NavEntry } from './navigation';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  pages: NavEntry[];
}

interface PaletteItem {
  key: string;
  label: string;
  hint?: string;
  to: string;
  icon: NavEntry['icon'];
  group: 'Pages' | 'Students';
}

const MAX_STUDENT_RESULTS = 8;

// Ctrl/⌘K jump-to-anything — the Linear/Vercel/GitHub pattern. Finding one
// student among dozens otherwise means opening Students, typing in its
// search box, then clicking through; this gets there in a keystroke from
// any page.
export function CommandPalette({ open, onClose, pages }: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [students, setStudents] = useState<Student[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    // Fetched fresh per open (cheap, one request) so a student added a minute
    // ago is findable without a page reload.
    api
      .get<Student[]>('/api/students')
      .then(setStudents)
      .catch(() => setStudents([]));
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const pageItems: PaletteItem[] = pages
      .filter((p) => !q || p.label.toLowerCase().includes(q))
      .map((p) => ({ key: `page:${p.to}`, label: p.label, to: p.to, icon: p.icon, group: 'Pages' }));
    const studentItems: PaletteItem[] = q
      ? (students || [])
          .filter((s) => displayName(s).toLowerCase().includes(q))
          .slice(0, MAX_STUDENT_RESULTS)
          .map((s) => ({
            key: `student:${s.id}`,
            label: displayName(s),
            hint: [s.group_name, s.level !== s.group_name ? s.level : null].filter(Boolean).join(' · '),
            to: `/students/${s.id}`,
            icon: User,
            group: 'Students',
          }))
      : [];
    // Students first once the user is typing — a name is the more likely
    // target than a page they can already see in the sidebar.
    return q ? [...studentItems, ...pageItems] : pageItems;
  }, [query, students, pages]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const select = (item: PaletteItem | undefined) => {
    if (!item) return;
    onClose();
    navigate(item.to);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(items[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup: PaletteItem['group'] | null = null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="relative w-full max-w-xl overflow-hidden rounded-card-sm border border-ink-200 bg-white shadow-shell"
      >
        <div className="flex items-center gap-3 border-b border-ink-100 px-4">
          <Search className="h-4 w-4 flex-none text-ink-400" />
          <input
            ref={inputRef}
            // autoFocus rather than focusing in an effect: the input mounts
            // with the palette, so this focuses synchronously and keys typed
            // straight after Ctrl+K aren't dropped.
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students or jump to a page…"
            className="h-14 w-full bg-transparent text-[15px] text-ink-800 placeholder:text-ink-300 focus:outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
          />
          <kbd className="hidden flex-none rounded border border-ink-200 px-1.5 py-0.5 font-mono text-[10px] text-ink-400 sm:block">
            ESC
          </kbd>
        </div>

        <div ref={listRef} id="command-palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-400">
              {students === null ? 'Loading…' : `No results for "${query}"`}
            </p>
          ) : (
            items.map((item, index) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              const active = index === activeIndex;
              return (
                <div key={item.key}>
                  {showGroup && (
                    <p className="px-3 pb-1 pt-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-400 first:pt-1">
                      {item.group}
                    </p>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-index={index}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => select(item)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      active ? 'bg-ink-100 text-ink-900' : 'text-ink-600'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 flex-none ${active ? 'text-ink-700' : 'text-ink-400'}`} />
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                    {item.hint && <span className="flex-none text-xs text-ink-400">{item.hint}</span>}
                    {active && <CornerDownLeft className="h-3.5 w-3.5 flex-none text-ink-400" />}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden items-center gap-4 border-t border-ink-100 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-ink-400 sm:flex">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
