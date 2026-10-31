// Documentation helper (not exported from the package): a sample of one colour token.
export function Swatch({ token, note }: { token: string; note?: string }) {
  return (
    <div className="flex items-center gap-group">
      <span
        aria-hidden="true"
        className="size-8 shrink-0 rounded-md border border-input"
        style={{ background: `var(--${token})` }}
      />
      <code className="text-code">--{token}</code>
      {note ? <span className="text-meta text-muted-foreground">{note}</span> : null}
    </div>
  );
}
