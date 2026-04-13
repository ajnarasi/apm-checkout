import { useState } from 'react';
import ConfigPanel from './components/ConfigPanel';
import MappingTable from './components/MappingTable';
import DeliverableViewer from './components/DeliverableViewer';
import TestMatrix from './components/TestMatrix';
import AdapterChain from './components/AdapterChain';
import { APMS } from './data/apmList';
import './App.css';

const API = 'http://localhost:3848/api';
const TABS = [
  { id: 'chain', label: 'Chain' },
  { id: 'mapping', label: 'Mapping' },
  { id: 'prd', label: 'PRD' },
  { id: 'adapter', label: 'Adapter' },
  { id: 'config', label: 'Config' },
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'safety', label: 'Safety' },
  { id: 'unmappable', label: 'Unmappable' },
  { id: 'matrix', label: 'E2E Matrix' },
];

function App() {
  const [activeTab, setActiveTab] = useState('chain');
  const [config, setConfig] = useState({
    apm: 'IDEAL', platform: 'all', provider: 'ppro',
    capabilities: ['auth', 'capture']
  });
  const [deliverables, setDeliverables] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [matrixResults, setMatrixResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [matrixRunning, setMatrixRunning] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          country: selectedApm?.country,
          currency: selectedApm?.currency
        })
      });
      const data = await resp.json();
      setDeliverables(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleTest = async () => {
    setLoading(true);
    const apmData = APMS.find(a => a.code === config.apm);
    try {
      const resp = await fetch(`${API}/test/sandbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apm: config.apm, provider: config.provider,
          amount: 10.00, currency: apmData?.currency || 'USD',
          country: apmData?.country || 'US'
        })
      });
      const data = await resp.json();
      setTestResult(data);
      setActiveTab('chain');
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleRunMatrix = async () => {
    setMatrixRunning(true);
    setActiveTab('matrix');
    try {
      const resp = await fetch(`${API}/test/matrix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'full' })
      });
      const data = await resp.json();
      setMatrixResults(data.results || data);
    } catch (err) { console.error(err); }
    setMatrixRunning(false);
  };

  const selectedApm = APMS.find(a => a.code === config.apm);

  return (
    <div className="app">
      <header className="header">
        <h1>APM Mapping Dashboard</h1>
        <span className="subtitle">Commerce Hub — Alternative Payment Method Integration Engine | 52 APMs | 4 Regions | 18 Currencies</span>
      </header>

      <ConfigPanel config={config} onChange={setConfig} onGenerate={handleGenerate} onTest={handleTest} loading={loading} />

      <div className="tabs">
        {TABS.map(tab => (
          <button key={tab.id} className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="content">
        {activeTab === 'chain' && <AdapterChain apm={selectedApm} platform={config.platform} provider={config.provider} testResult={testResult} />}
        {activeTab === 'mapping' && <MappingTable data={deliverables?.mapping} />}
        {activeTab === 'prd' && <DeliverableViewer content={deliverables?.prd} type="markdown" title="PRD" />}
        {activeTab === 'adapter' && <DeliverableViewer content={deliverables?.adapterSpec} type="markdown" title={`Adapter Spec — ${config.platform === 'all' ? 'Ucom' : config.platform}`} />}
        {activeTab === 'config' && <DeliverableViewer content={deliverables?.config} type="json" title="config.json" />}
        {activeTab === 'fixtures' && <DeliverableViewer content={deliverables?.testFixtures} type="json" title="test-fixtures.json" />}
        {activeTab === 'safety' && <DeliverableViewer content={deliverables?.safetyCheck} type="markdown" title="Safety Check Report" />}
        {activeTab === 'unmappable' && <DeliverableViewer content={deliverables?.unmappableFields} type="markdown" title="Unmappable Fields" />}
        {activeTab === 'matrix' && <TestMatrix results={matrixResults} onRunMatrix={handleRunMatrix} running={matrixRunning} />}
      </div>
    </div>
  );
}

export default App;
