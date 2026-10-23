import { useMemo, useState } from 'react';
import s from '../styles/Portal.module.css';

const PER_PAGE = 10;

// columns: [{ key, label, sortable? }]   rows: objects with `id` + the keys above
export default function DataTable({ columns, rows, searchKeys, placeholder, onView, onDelete, emptyText }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ field: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? rows.filter((r) => searchKeys.some((k) => String(r[k] || '').toLowerCase().includes(needle))) : [...rows];
    list.sort((a, b) => {
      const av = String(a[sort.field] || '').toLowerCase();
      const bv = String(b[sort.field] || '').toLowerCase();
      if (av === bv) return 0;
      return (av < bv ? -1 : 1) * (sort.dir === 'asc' ? 1 : -1);
    });
    return list;
  }, [rows, q, sort, searchKeys]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const cur = Math.min(page, pages);
  const pageRows = filtered.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);

  const toggleSort = (field) =>
    setSort((p) => (p.field === field ? { field, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' }));

  return (
    <>
      <div className={s.tableToolbar}>
        <input className={s.searchInput} placeholder={placeholder} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      <div className={s.tableWrap}>
        <table className={s.dataTable}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.sortable ? s.sortable : ''} onClick={c.sortable ? () => toggleSort(c.key) : undefined}>{c.label}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan={columns.length + 1} className={s.mutedText} style={{ padding: 20 }}>{emptyText}</td></tr>
            )}
            {pageRows.map((r) => (
              <tr key={r.id}>
                {columns.map((c) => <td key={c.key}>{r[c.key] || '—'}</td>)}
                <td>
                  <div className={s.tableActions}>
                    <button className={s.tableBtn} onClick={() => onView(r)}>View</button>
                    <button className={`${s.tableBtn} ${s.tableBtnDanger}`} onClick={() => onDelete(r)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={s.paginationRow}>
          <span className={s.mutedText}>
            {filtered.length === 0 ? '0 results' : `Page ${cur} of ${pages} · ${filtered.length} result${filtered.length === 1 ? '' : 's'}`}
          </span>
          <div className={s.tableActions}>
            <button className={s.tableBtn} disabled={cur <= 1} onClick={() => setPage(cur - 1)}>‹ Prev</button>
            <button className={s.tableBtn} disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Next ›</button>
          </div>
        </div>
      </div>
    </>
  );
}
