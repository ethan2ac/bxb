import { BY_LEVELS, JDY_ROLES } from '../types';
import type { Student } from '../types';

export function displayName(student: Pick<Student, 'english_name' | 'chinese_name'>): string {
  if (student.english_name && student.chinese_name) {
    return `${student.english_name}/${student.chinese_name}`;
  }
  return student.english_name || student.chinese_name || '';
}

export function initials(student: Pick<Student, 'english_name' | 'chinese_name'>): string {
  const name = student.english_name || student.chinese_name || '';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function groupLabel(student: Pick<Student, 'group_name'>): string {
  return student.group_name === 'JDY' ? 'JDY' : 'BY';
}

// P4-S4 for BY, Coordinator/JDY Member/Mentor for JDY — sorted in the order
// each group's real-world progression follows, not alphabetically (which
// would wrongly put e.g. "Coordinator" before "JDY Member").
export function levelSortIndex(student: Pick<Student, 'group_name' | 'level'>): number {
  const order: readonly string[] = student.group_name === 'JDY' ? JDY_ROLES : BY_LEVELS;
  const idx = order.indexOf(student.level);
  return idx === -1 ? order.length : idx;
}

const CJK_REGEX = /[㐀-鿿]/;

// Historical records with only one name on file store it in english_name (the
// only NOT NULL name column). If that text is actually Chinese, show it in the
// Chinese Name field when editing instead of mislabeling it as the English name.
export function editableNameFields(
  student: Pick<Student, 'english_name' | 'chinese_name'>,
): { english_name: string; chinese_name: string } {
  const english = student.english_name ?? '';
  const chinese = student.chinese_name ?? '';
  if (!chinese && english && CJK_REGEX.test(english)) {
    return { english_name: '', chinese_name: english };
  }
  return { english_name: english, chinese_name: chinese };
}
