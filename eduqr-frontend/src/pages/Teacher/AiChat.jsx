import { Fragment, useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';
import s from '../../styles/Portal.module.css';

const GREETING = 'Hi! How can I help you?';

// Strip markdown the chat can't render (tables, headers, backticks); keep **bold**.
function clean(text) {
  return text
    .split('\n')
    .filter((l) => !/^[\s|:\-]+$/.test(l))
    .map((l) => (l.trim().startsWith('|') ? l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()).filter(Boolean).join(', ') : l))
    .join('\n')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/\|/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

function Rich({ text }) {
  return clean(text).split('\n').map((line, i) => (
    <Fragment key={i}>
      {line.split(/(\*\*.+?\*\*)/g).map((p, j) =>
        p.length > 4 && p.startsWith('**') && p.endsWith('**') ? <strong key={j}>{p.slice(2, -2)}</strong> : p)}
      <br />
    </Fragment>
  ));
}

export default function AiChat() {
  const [msgs, setMsgs] = useState([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef(null);

  useEffect(() => {
    api('/api/ai/history').then((d) => {
      if (d.success && d.messages.length) setMsgs([{ role: 'assistant', content: GREETING }, ...d.messages.map((m) => ({ role: m.role, content: m.content }))]);
    });
  }, []);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [msgs, sending]);

  const send = async () => {
    const q = input.trim();
    setError('');
    if (!q || sending) return;
    setMsgs((m) => [...m, { role: 'user', content: q }]);
    setInput(''); setSending(true);
    try {
      const d = await api('/api/ai/ask', { method: 'POST', body: { question: q } });
      if (!d.success) setMsgs((m) => [...m, { role: 'error', content: d.generalError || 'The AI assistant could not respond right now.' }]);
      else setMsgs((m) => [...m, { role: 'assistant', content: d.answer }]);
    } catch {
      setMsgs((m) => [...m, { role: 'error', content: 'Something went wrong. Please try again.' }]);
    } finally { setSending(false); }
  };

  const clear = async () => {
    if (!window.confirm('Clear your AI assistant conversation history? This cannot be undone.')) return;
    const d = await api('/api/ai/clear', { method: 'POST' });
    if (d.success) setMsgs([{ role: 'assistant', content: 'History cleared. Ask me about attendance in your own classes — for example, "Who was absent in Mathematics?"' }]);
  };

  const cls = { assistant: s.aiAssistant, user: s.aiUser, error: s.aiError };

  return (
    <>
      <div className={s.sectionHeader}><h2>Class Attendance Assistant</h2><p>Ask about attendance across your own classes.</p></div>
      <div className={s.panel}>
        <div className={s.aiLog} ref={logRef}>
          {msgs.map((m, i) => (
            <div key={i} className={`${s.aiMsg} ${cls[m.role]}`}>{m.role === 'assistant' ? <Rich text={m.content} /> : m.content}</div>
          ))}
          {sending && <div className={`${s.aiMsg} ${s.aiAssistant}`}>Thinking…</div>}
        </div>
        <p className={s.fieldError}>{error}</p>
        <div className={s.aiInputRow}>
          <input placeholder="Ask about attendance in your classes…" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()} />
          <button className={`${s.btn} ${s.btnPrimary}`} disabled={sending} onClick={send}>Send</button>
        </div>
        <div className={s.aiFooter}><button className={`${s.btn} ${s.btnOutline}`} onClick={clear}>Clear history</button></div>
      </div>
    </>
  );
}
