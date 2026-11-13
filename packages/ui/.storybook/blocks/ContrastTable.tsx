import data from '../generated/contrast.json';

type Row = (typeof data.rows)[number];

function Result({ row, theme }: { row: Row; theme: 'dark' | 'light' }) {
  const value = row[theme];
  if (!row.enforced) return <span>{value}:1 (decorative, not enforced)</span>;
  return row.pass[theme] ? <span>{value}:1 pass</span> : <strong>{value}:1 BELOW {row.min}:1</strong>;
}

// Documentation helper: every colour pair the system uses, measured from tokens.css in both themes.
export function ContrastTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-label">
        <caption className="pb-group text-left text-meta text-muted-foreground">
          Text needs {data.text}:1 (WCAG 1.4.3). Interface elements need {data.ui}:1 (WCAG 1.4.11). Measured by
          scripts/contrast.mjs from the saved token values.
        </caption>
        <thead>
          <tr className="border-b border-border text-left text-headline">
            <th scope="col" className="py-group pr-between-groups">Pair</th>
            <th scope="col" className="py-group pr-between-groups">Used for</th>
            <th scope="col" className="py-group pr-between-groups">Dark</th>
            <th scope="col" className="py-group">Light</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={`${row.fg}/${row.bg}`} className="border-b border-border align-top">
              <th scope="row" className="py-group pr-between-groups text-left font-normal">
                <code className="text-code">{row.fg}</code> on <code className="text-code">{row.bg}</code>
              </th>
              <td className="py-group pr-between-groups text-muted-foreground">{row.use}</td>
              <td className="py-group pr-between-groups"><Result row={row} theme="dark" /></td>
              <td className="py-group"><Result row={row} theme="light" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
