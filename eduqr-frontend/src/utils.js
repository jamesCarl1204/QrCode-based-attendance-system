export const pad2 = (n) => String(n).padStart(2, '0');

export function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  let H = parseInt(h, 10);
  const ap = H >= 12 ? 'PM' : 'AM';
  H = H % 12 || 12;
  return `${H}:${m} ${ap}`;
}

export const phNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
export const toDateInput = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const toTimeInput = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
export const fmtClock = (d) => {
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} ${ap}`;
};

export const BANNER = {
  blue: 'linear-gradient(135deg, #1e3a8a 0%, #0f1f4b 100%)',
  green: 'linear-gradient(135deg, #14532d 0%, #052e14 100%)',
  pink: 'linear-gradient(135deg, #9d174d 0%, #4a0f28 100%)',
  orange: 'linear-gradient(135deg, #9a3412 0%, #431a09 100%)',
  purple: 'linear-gradient(135deg, #5b21b6 0%, #2c0f5c 100%)',
  teal: 'linear-gradient(135deg, #0f766e 0%, #063a36 100%)',
};

export const colorClass = (s, c) => s['color' + ((c || 'blue')[0].toUpperCase() + (c || 'blue').slice(1))];

export function timeAgo(d) {
  if (!d) return '';
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}
