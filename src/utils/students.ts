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
