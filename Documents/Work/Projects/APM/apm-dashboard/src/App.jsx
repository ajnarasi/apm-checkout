import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import ConfigPanel from './components/ConfigPanel';
import MappingTable from './components/MappingTable';
import DeliverableViewer from './components/DeliverableViewer';
import TestMatrix from './components/TestMatrix';
import AdapterChain from './components/AdapterChain';
import SwaggerView from './components/SwaggerView';
import AuthFlowDiagram from './components/AuthFlowDiagram';
import { APMS } from './data/apmList';
import './App.css';

const API = window.location.hostname === 'localhost' ? 'http://localhost:3848/api' : '/api';

function App() {
  const [activePage, setActivePage] = useState('overview');
  const [config, setConfig] = useState({
    apm: 'IDEAL', platform: 'all', provider: 'ppro',
    capabilities: ['auth', 'capture']
  });
  const [deliverables, setDeliverables] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [matrixResults, setMatrixResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [matrixRunning, setMatrixRunning] = useState(false);

  const selectedApm = APMS.find(a => a.code === config.apm);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, country: selectedApm?.country, currency: selectedApm?.currency })
      });
      setDeliverables(await resp.json());
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API}/test/sandbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apm: config.apm, provider: config.provider,
          amount: 10.00, currency: selectedApm?.currency || 'USD',
          country: selectedApm?.country || 'US'
        })
      });
      setTestResult(await resp.json());
      setActivePage('chain');
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleRunMatrix = async () => {
    setMatrixRunning(true);
    setActivePage('matrix');
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

  // Pages that need the config panel with generate/test buttons
  const generatePages = ['mapping', 'prd', 'adapter', 'config', 'fixtures', 'safety', 'unmappable'];
  const showGenerateConfig = generatePages.includes(activePage);

  return (
    <div className="app">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="main-content">
        {activePage === 'overview' && <Overview />}

        {/* JTBD removed — covered in Overview */}

        {activePage === 'swagger' && (
          <div className="page">
            <SwaggerView />
          </div>
        )}

        {activePage === 'matrix' && (
          <div className="page">
            <h3 className="md-h3" style={{ marginBottom: 16 }}>E2E Test Matrix</h3>
            <TestMatrix results={matrixResults} onRunMatrix={handleRunMatrix} running={matrixRunning} />
          </div>
        )}

        {activePage === 'chain' && (
          <div className="page">
            <ConfigPanel config={config} onChange={setConfig} onGenerate={handleGenerate} onTest={handleTest} loading={loading} hideActions />
            <AdapterChain apm={selectedApm} platform={config.platform} provider={selectedApm?.provider || config.provider} testResult={testResult} />
            <div style={{ marginTop: 16 }}>
              <button className="btn success" onClick={handleTest} disabled={loading}>
                {loading ? 'Testing...' : 'Test Sandbox'}
              </button>
            </div>
          </div>
        )}

        {showGenerateConfig && (
          <div className="page">
            <ConfigPanel config={config} onChange={setConfig} onGenerate={handleGenerate} onTest={handleTest} loading={loading} />

            {activePage === 'mapping' && <MappingTable data={deliverables?.mapping} />}
            {activePage === 'prd' && <DeliverableViewer content={deliverables?.prd} type="markdown" title="Product Requirements Document" />}
            {activePage === 'adapter' && (
              <>
                <AuthFlowDiagram apm={selectedApm} provider={selectedApm?.provider || config.provider} capabilities={config.capabilities} />
                <DeliverableViewer content={deliverables?.adapterSpec} type="markdown" title={`Adapter Spec — ${config.platform === 'all' ? 'Ucom' : config.platform}`} />
              </>
            )}
            {activePage === 'config' && <DeliverableViewer content={deliverables?.config} type="json" title="config.json" />}
            {activePage === 'fixtures' && <DeliverableViewer content={deliverables?.testFixtures} type="json" title="test-fixtures.json" />}
            {activePage === 'safety' && <DeliverableViewer content={deliverables?.safetyCheck} type="markdown" title="Safety Check Report" />}
            {activePage === 'unmappable' && <DeliverableViewer content={deliverables?.unmappableFields} type="markdown" title="Unmappable Fields" />}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
