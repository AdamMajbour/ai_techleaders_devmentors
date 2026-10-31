import data from '../generated/contrast.json';

// Documentation helper: every colour token with its resolved value in both themes.
export function ThemeTokens() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-label">
        <thead>
          <tr className="border-b border-border text-left text-headline">
            <th scope="col" className="py-group pr-between-groups">Token</th>
            <th scope="col" className="py-group pr-between-groups">Dark</th>
            <th scope="col" className="py-group">Light</th>
          </tr>
        </thead>
        <tbody>
          {data.themeTokens.map((token) => (
            <tr key={token.name} className="border-b border-border align-top">
              <th scope="row" className="py-group pr-between-groups text-left font-normal">
                <code className="text-code">--{token.name}</code>
              </th>
              <td className="py-group pr-between-groups"><code className="text-code">{token.dark}</code></td>
              <td className="py-group"><code className="text-code">{token.light}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
