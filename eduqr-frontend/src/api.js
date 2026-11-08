// Tiny fetch wrapper. All calls are same-origin (/api/...) so the session
// cookie works. In production Vercel rewrites /api/* to the Render backend.
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok && !data.generalError && !data.errors) {
  data = { success: false, generalError: res.status === 429
    ? 'Too many attempts. Please try again later.'
    : `Server error (${res.status}). Please try again.` };
}
return data;
}

export const homeFor = (role) => (role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student');
