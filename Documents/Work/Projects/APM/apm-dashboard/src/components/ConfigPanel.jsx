import { APMS, REGIONS, CAPABILITIES, DIRECT_PROVIDERS } from '../data/apmList';

export default function ConfigPanel({ config, onChange, onGenerate, onTest, loading }) {
  const update = (key, val) => onChange({ ...config, [key]: val });
  const toggleCap = (cap) => {
    const caps = config.capabilities.includes(cap)
      ? config.capabilities.filter(c => c !== cap)
      : [...config.capabilities, cap];
    update('capabilities', caps);
  };
  const isDirect = DIRECT_PROVIDERS.includes(config.apm);

  return (
    <div className="config-panel">
      <div className="config-row">
        <div className="config-group">
          <label>APM</label>
          <select value={config.apm} onChange={e => update('apm', e.target.value)}>
            {REGIONS.map(r => (
              <optgroup key={r} label={r}>
                {APMS.filter(a => a.region === r).map(a => (
                  <option key={a.code} value={a.code}>{a.name} ({a.country}/{a.currency})</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="config-group">
          <label>Platform</label>
          <div className="radio-group">
            {['ucom', 'snappay', 'all'].map(p => (
              <label key={p} className={`radio ${config.platform === p ? 'active' : ''}`}>
                <input type="radio" name="platform" value={p} checked={config.platform === p}
                  onChange={() => update('platform', p)} />
                {p === 'all' ? 'All' : p === 'ucom' ? 'Ucom' : 'SnapPay'}
              </label>
            ))}
          </div>
        </div>
        <div className="config-group">
          <label>Provider</label>
          <div className="radio-group">
            {['direct', 'ppro'].map(p => (
              <label key={p} className={`radio ${config.provider === p ? 'active' : ''} ${p === 'direct' && !isDirect ? 'disabled' : ''}`}>
                <input type="radio" name="provider" value={p} checked={config.provider === p}
                  disabled={p === 'direct' && !isDirect}
                  onChange={() => update('provider', p)} />
                {p === 'direct' ? 'Direct' : 'via PPRO'}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="config-row">
        <div className="config-group">
          <label>Capabilities</label>
          <div className="checkbox-group">
            {CAPABILITIES.map(c => (
              <label key={c} className={`checkbox ${config.capabilities.includes(c) ? 'active' : ''}`}>
                <input type="checkbox" checked={config.capabilities.includes(c)} onChange={() => toggleCap(c)} />
                {c}
              </label>
            ))}
          </div>
        </div>
        <div className="config-actions">
          <button className="btn primary" onClick={onGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Mapping'}
          </button>
          <button className="btn success" onClick={onTest} disabled={loading}>
            {loading ? 'Testing...' : 'Test Sandbox'}
          </button>
        </div>
      </div>
    </div>
  );
}
