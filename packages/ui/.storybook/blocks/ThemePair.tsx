import type { ReactNode } from 'react';

// Documentation helper: renders the children twice, once per theme, side by side.
// [data-theme] on an element scopes the tokens to it (tokens.css), so both themes are visible at once.
export function ThemePair({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-between-groups md:grid-cols-2">
      {(['dark', 'light'] as const).map((theme) => (
        <section
          key={theme}
          data-theme={theme}
          aria-label={`${theme} theme`}
          className="rounded-lg border border-input bg-background p-panel-roomy text-foreground"
        >
          <p className="mb-between-groups text-label font-strong text-headline">{theme === 'dark' ? 'Dark' : 'Light'}</p>
          <div className="flex flex-col gap-between-groups">{children}</div>
        </section>
      ))}
    </div>
  );
}
