import React from 'react';
import { APMS, REGIONS } from '../data/apmList';

export default function TestMatrix({ results, onRunMatrix, running }) {
  const total = results?.length || 0;
  const passed = results?.filter(r => r.pass)?.length || 0;
  const failed = total - passed;
  const rate = total > 0 ? Math.round(passed / total * 100) : 0;

  // Group results by APM code for quick lookup
  const resultMap = {};
  (results || []).forEach(r => {
    const key = `${r.apm}-${r.provider}-${r.platform}`;
    resultMap[key] = r;
  });

  const getCell = (code, provider, platform) => {
    const r = resultMap[`${code}-${provider}-${platform}`];
    if (!r) return <td className="cell pending">⏳</td>;
    return (
      <td className={`cell ${r.pass ? 'pass' : 'fail'}`} title={r.chargeId || r.error || ''}>
        {r.pass ? '✅' : '❌'}
      </td>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <button className="btn primary" onClick={onRunMatrix} disabled={running}>
          {running ? 'Running...' : 'Run Full Matrix (110 combinations)'}
        </button>
        {running && <span style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>Testing all APMs across all platforms...</span>}
      </div>

      {total > 0 && (
        <div className="summary-stats">
          <div className="stat total"><div className="num">{total}</div><div className="label">Tested</div></div>
          <div className="stat pass"><div className="num">{passed}</div><div className="label">Pass</div></div>
          <div className="stat fail"><div className="num">{failed}</div><div className="label">Fail</div></div>
          <div className="stat" style={{ borderColor: rate >= 90 ? 'var(--pass)' : 'var(--fail)' }}>
            <div className="num" style={{ color: rate >= 90 ? 'var(--pass)' : 'var(--fail)' }}>{rate}%</div>
            <div className="label">Rate</div>
          </div>
        </div>
      )}

      {running && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '100%', animation: 'pulse 1.5s infinite' }} />
        </div>
      )}

      <div className="matrix-grid">
        <table>
          <thead>
            <tr>
              <th colSpan={4}></th>
              <th colSpan={2} className="matrix-col-group provider">Provider</th>
              <th colSpan={2} className="matrix-col-group platform">Platform</th>
            </tr>
            <tr>
              <th>APM</th><th>Code</th><th>CC</th><th>Cur</th>
              <th>PPRO</th><th>Direct</th><th>Ucom</th><th>SnapPay</th>
            </tr>
          </thead>
          <tbody>
            {REGIONS.map(region => (
              <React.Fragment key={`region-${region}`}>
                <tr className="region-header">
                  <td colSpan={8}>
                    {region} ({APMS.filter(a => a.region === region).length})
                  </td>
                </tr>
                {APMS.filter(a => a.region === region).map(apm => (
                  <tr key={apm.code}>
                    <td><strong>{apm.name}</strong></td>
                    <td className="apm-code">{apm.code}</td>
                    <td>{apm.country}</td>
                    <td>{apm.currency}</td>
                    {getCell(apm.code, 'ppro', 'none')}
                    {getCell(apm.code, 'direct', 'none')}
                    {getCell(apm.code, 'ppro', 'ucom')}
                    {getCell(apm.code, 'ppro', 'snappay')}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
