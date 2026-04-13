import { useState } from 'react';

const ENDPOINTS = [
  { method: 'GET', path: '/api/health', desc: 'Health check', request: null,
    response: '{\n  "status": "ok",\n  "port": 3848,\n  "timestamp": "2026-04-12T..."\n}' },
  { method: 'GET', path: '/api/apms', desc: 'List all 52 APMs with metadata',
    request: null,
    response: '[\n  { "name": "iDEAL", "code": "IDEAL", "region": "Europe",\n    "country": "NL", "currency": "EUR", "pattern": "bank-redirect" },\n  ...\n]' },
  { method: 'GET', path: '/api/platforms', desc: 'List available platforms',
    request: null,
    response: '[\n  { "id": "ucom", "name": "Ucom Payment Services", "version": "0.2.3" },\n  { "id": "snappay", "name": "SnapPay", "version": "3.0.9" }\n]' },
  { method: 'POST', path: '/api/generate', desc: 'Generate mapping deliverables for an APM',
    request: '{\n  "apm": "KLARNA",\n  "capabilities": ["auth", "capture", "refund"],\n  "platform": "ucom",\n  "provider": "ppro",\n  "country": "US",\n  "currency": "USD"\n}',
    response: '{\n  "apm": "klarna",\n  "generatedFrom": "pre-generated",\n  "mapping": "# CH to Klarna Mapping...",\n  "prd": "# PRD: Klarna Integration...",\n  "adapterSpec": "# Ucom Adapter...",\n  "config": { ... },\n  "testFixtures": { ... },\n  "safetyCheck": "# Safety Check Report...",\n  "unmappableFields": "# Unmappable Fields..."\n}' },
  { method: 'POST', path: '/api/test/sandbox', desc: 'Run sandbox test for an APM',
    request: '{\n  "apm": "IDEAL",\n  "provider": "ppro",\n  "amount": 10.00,\n  "currency": "EUR",\n  "country": "NL"\n}',
    response: '{\n  "success": true,\n  "chargeId": "charge_abc123...",\n  "status": "AUTHENTICATION_PENDING",\n  "amountSent": 1000,\n  "amountReceived": 1000,\n  "amountSymmetric": true,\n  "currencyPreserved": true,\n  "hasRedirect": true\n}' },
  { method: 'POST', path: '/api/test/matrix', desc: 'Run full 110-combination E2E matrix',
    request: '{ "scope": "full" }',
    response: '{\n  "summary": { "total": 110, "passed": 110, "failed": 0 },\n  "results": [\n    { "apm": "IDEAL", "provider": "ppro", "platform": "ucom", "pass": true },\n    ...\n  ]\n}' },
];

function Endpoint({ ep }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="swagger-endpoint">
      <div className="swagger-header" onClick={() => setOpen(!open)}>
        <span className={`swagger-method ${ep.method.toLowerCase()}`}>{ep.method}</span>
        <span className="swagger-path">{ep.path}</span>
        <span className="swagger-desc">{ep.desc}</span>
      </div>
      {open && (
        <div className="swagger-body">
          {ep.request && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.72em', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>REQUEST BODY</div>
              <pre className="json-viewer" style={{ maxHeight: 200 }}>{ep.request}</pre>
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.72em', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>RESPONSE</div>
            <pre className="json-viewer" style={{ maxHeight: 200 }}>{ep.response}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SwaggerView() {
  return (
    <div>
      <h3 className="md-h3" style={{ marginBottom: 16 }}>API Documentation</h3>
      <p style={{ fontSize: '0.82em', color: 'var(--text-secondary)', marginBottom: 16 }}>
        Base URL: <code>http://localhost:3848</code> — Click any endpoint to expand request/response examples.
      </p>
      {ENDPOINTS.map((ep, i) => <Endpoint key={i} ep={ep} />)}
    </div>
  );
}
