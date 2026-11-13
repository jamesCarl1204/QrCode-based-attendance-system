import { fmt12 } from '../../utils.js';

export const mapClass = (c) => ({ id: c.id, subject: c.subject_name, section: c.section, code: c.class_code, color: c.color, archived: !!c.archived });

export const timeRange = (x) => \`${fmt12(x.start_time)} – \`${fmt12(x.end_time)} · Late after \`${fmt12(x.late_after)}\`;

export const statusClass = (st, styles) =>
  st === 'Present' ? styles.recordStatusPresent : st === 'Late' ? styles.recordStatusLate : st === 'Absent' ? styles.recordStatusAbsent : styles.recordStatusPending;

export const rateClass = (r, styles) => (r === null ? '' : r >= 85 ? styles.rateGood : r >= 75 ? styles.rateWarn : styles.rateLow);

// Strip markdown the chat can't render (tables, headers, backticks); keep **bold**.
export function clean(text) {
  return text
    .split('\n')
    .filter((l) => !/^[\s|:\-]+$/.test(l))
    .map((l) => (l.trim().startsWith('|') ? l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()).filter(Boolean).join(', ') : l))
    .join('\n')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\`{1,3}([^\`]*)\`{1,3}/g, '$1')
    .replace(/\|/g, '')
    .replace(/\n{3,}/g, '\n\n');
}
