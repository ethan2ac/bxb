import { BY_LEVELS } from '../types';
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

// P4-S4 progression for BY; JDY has a single level so everyone ties and falls
// back to the name sort applied alongside this.
export function levelSortIndex(student: Pick<Student, 'group_name' | 'level'>): number {
  if (student.group_name === 'JDY') return 0;
  const idx = BY_LEVELS.indexOf(student.level as (typeof BY_LEVELS)[number]);
  return idx === -1 ? BY_LEVELS.length : idx;
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
