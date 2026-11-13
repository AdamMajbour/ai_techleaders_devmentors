import type { ReactNode } from 'react';

// Documentation helper: a link to another Storybook page. The docs render inside an iframe, so a plain
// "?path=" link would open the iframe alone. This builds the address of the Storybook shell from the
// top window and opens the page there.
export function managerUrl(id: string, kind: 'docs' | 'story' = 'docs'): string {
  if (typeof window === 'undefined') return `?path=/${kind}/${id}`;
  const top = (() => {
    try {
      return window.top ?? window;
    } catch {
      return window;
    }
  })();
  const base = `${top.location.origin}${top.location.pathname.replace(/iframe\.html$/, '')}`;
  return `${base}?path=/${kind}/${id}`;
}

export function DocLink({ id, kind = 'docs', children }: { id: string; kind?: 'docs' | 'story'; children: ReactNode }) {
  return (
    <a href={managerUrl(id, kind)} target="_top" className="text-link underline decoration-1 underline-offset-4 hover:decoration-2">
      {children}
    </a>
  );
}
