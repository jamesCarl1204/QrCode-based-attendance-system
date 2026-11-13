import { useEffect } from 'react';

export function useReveal(rootRef, ready) {
  useEffect(() => {
    if (!ready) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;
    const els = root.querySelectorAll('[data-reveal]');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.setAttribute('data-in', ''));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.setAttribute('data-in', ''); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef, ready]);
}
