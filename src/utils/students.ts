import type { Student } from '../types';

export function displayName(student: Pick<Student, 'english_name' | 'chinese_name'>): string {
  return student.chinese_name ? `${student.english_name}/${student.chinese_name}` : student.english_name;
}

export function initials(student: Pick<Student, 'english_name'>): string {
  return student.english_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
