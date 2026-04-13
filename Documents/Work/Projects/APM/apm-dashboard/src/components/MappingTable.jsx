export default function MappingTable({ data }) {
  if (!data) return <div className="empty-state"><p>Generate mapping to see field-level CH ↔ APM correspondence</p></div>;

  // If data is string (markdown), extract tables
  if (typeof data === 'string') {
    const sections = data.split(/^#{2,3}\s+/m).filter(Boolean);
    return (
      <div className="md-content">
        {sections.map((section, i) => {
          const lines = section.trim().split('\n');
          const title = lines[0];
          const tableLines = lines.filter(l => l.includes('|') && !l.match(/^\|[\s-|]+\|$/));
          if (tableLines.length < 2) return (
            <div key={i} className="md-section">
              <h3 className="md-h3">{title}</h3>
              <pre className="code-block"><code>{lines.slice(1).join('\n')}</code></pre>
            </div>
          );
          const headers = tableLines[0].split('|').map(h => h.trim()).filter(Boolean);
          const rows = tableLines.slice(1).map(l => l.split('|').map(c => c.trim()).filter(Boolean));
          return (
            <div key={i} className="md-section" style={{ marginBottom: 24 }}>
              <h3 className="md-h3">{title}</h3>
              <div className="table-wrap">
                <table className="md-table">
                  <thead><tr>{headers.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
                  <tbody>
                    {rows.map((row, ri) => {
                      const tier = row.find(c => c === '1' || c === '**T1**' || c.includes('Tier 1')) ? 1 : 2;
                      return (
                        <tr key={ri} style={{ borderLeft: `3px solid ${tier === 1 ? 'var(--accent)' : 'var(--border)'}` }}>
                          {row.map((cell, ci) => {
                            // Tier badges
                            if (cell === '1' || cell === '**T1**' || cell.includes('Tier 1')) {
                              return <td key={ci}><span className="badge tier1" style={{ background: 'var(--accent)', color: 'white' }}>T1</span></td>;
                            }
                            if (cell === '2' || cell === '**T2**' || cell.includes('Tier 2')) {
                              return <td key={ci}><span className="badge tier2" style={{ background: '#333', color: 'var(--text-muted)' }}>T2</span></td>;
                            }
                            // Transform badges
                            if (['MULTIPLY_100','DIVIDE_100','PASSTHROUGH','MAP_ENUM','CONCAT','NONE','AUTH_INJECT','CUSTOM'].some(t => cell.includes(t))) {
                              const badgeClass = cell.includes('MULTIPLY') || cell.includes('DIVIDE') ? 'warn' : cell.includes('PASS') ? 'info' : 'default';
                              return <td key={ci}><span className={`badge ${badgeClass}`}>{cell}</span></td>;
                            }
                            // Field path cells (monospace for first two columns and columns 3-4)
                            const isMonospace = ci < 2 || (ci > 2 && ci < 5);
                            return (
                              <td key={ci} style={isMonospace ? { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '0.8em' } : undefined}>
                                {cell}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return <pre className="json-viewer">{JSON.stringify(data, null, 2)}</pre>;
}
