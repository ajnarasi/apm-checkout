const NAV = [
  { section: 'Explore', items: [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'chain', label: 'Mapping Chain', icon: '🔗' },
    { id: 'mapping', label: 'Field Mapping', icon: '📋' },
    { id: 'prd', label: 'PRD', icon: '📄' },
  ]},
  { section: 'Technical', items: [
    { id: 'adapter', label: 'Adapter Spec', icon: '🔌' },
    { id: 'config', label: 'Config JSON', icon: '⚙️' },
    { id: 'fixtures', label: 'Test Fixtures', icon: '🧪' },
    { id: 'safety', label: 'Safety Report', icon: '🛡️' },
    { id: 'unmappable', label: 'Unmappable Fields', icon: '⚠️' },
    { id: 'swagger', label: 'API Docs', icon: '📡' },
  ]},
  { section: 'Testing', items: [
    { id: 'matrix', label: 'E2E Matrix', icon: '✅' },
  ]},
  // JTBD covered in Overview — no separate nav item
];

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <h1>APM Mapping Engine</h1>
        <div className="brand-sub">Commerce Hub — Fiserv</div>
      </div>

      {NAV.map(section => (
        <div key={section.section} className="sidebar-section">
          <div className="sidebar-section-label">{section.section}</div>
          <ul className="sidebar-nav">
            {section.items.map(item => (
              <li
                key={item.id}
                className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="sidebar-footer">
        <div className="sidebar-stats">
          <span className="sidebar-stat">52 APMs</span>
          <span className="sidebar-stat">4 Regions</span>
          <span className="sidebar-stat">18 Currencies</span>
        </div>
      </div>
    </div>
  );
}
