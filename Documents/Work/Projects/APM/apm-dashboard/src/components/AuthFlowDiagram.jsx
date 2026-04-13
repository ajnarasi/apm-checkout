import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

function generateAuthFlowChart(apmName, apmCode, provider, capabilities) {
  const isDirect = provider === 'direct';
  const hasCap = (c) => capabilities.includes(c);

  // Phase 1: Auth flow
  let phase1 = `sequenceDiagram
    participant M as Merchant
    participant P as Platform
    participant CH as Commerce Hub
    ${isDirect ? `participant APM as ${apmName}` : `participant PP as PPRO\n    participant APM as ${apmName}`}

    Note over M,${isDirect ? 'APM' : 'PP'}: Phase 1 — Authorization
    M->>P: Create payment request
    P->>CH: POST checkouts/v1/orders`;

  if (isDirect) {
    phase1 += `
    CH->>APM: ${apmCode} provider API
    APM-->>CH: Redirect URL or token
    CH-->>P: actions.url + providerOrderId
    P-->>M: Redirect customer
    M->>APM: Customer completes auth
    APM-->>CH: Webhook notification
    CH-->>P: transactionState AUTHORIZED
    P-->>M: Payment authorized`;
  } else {
    phase1 += `
    CH->>PP: POST payment-charges
    Note right of PP: paymentMethod ${apmCode}
    PP->>APM: Provider-specific call
    APM-->>PP: Auth response
    PP-->>CH: chargeId + redirectUrl
    CH-->>P: actions.url + providerOrderId
    P-->>M: Redirect customer
    M->>APM: Customer completes auth
    APM-->>PP: Status update
    PP-->>CH: AUTHORIZED
    CH-->>P: transactionState AUTHORIZED
    P-->>M: Payment authorized`;
  }

  // Phase 2: Secondary transactions
  let phase2Parts = [];

  if (hasCap('capture')) {
    phase2Parts.push(`
    Note over M,${isDirect ? 'APM' : 'PP'}: Phase 2a — Capture
    M->>P: Capture payment
    P->>CH: POST orders/{id}/capture
    ${isDirect ? `CH->>APM: Capture call\n    APM-->>CH: Captured` : `CH->>PP: POST charges/{id}/captures\n    PP-->>CH: Captured`}
    CH-->>P: transactionState CAPTURED
    P-->>M: Capture confirmed`);
  }

  if (hasCap('refund') || hasCap('partial-refund')) {
    const label = hasCap('partial-refund') ? 'Partial Refund' : 'Refund';
    phase2Parts.push(`
    Note over M,${isDirect ? 'APM' : 'PP'}: Phase 2b — ${label}
    M->>P: Refund request
    P->>CH: POST orders/{id}/refund
    ${isDirect ? `CH->>APM: Refund call\n    APM-->>CH: Refunded` : `CH->>PP: POST charges/{id}/refunds\n    PP-->>CH: Refunded`}
    CH-->>P: transactionState REFUNDED
    P-->>M: Refund confirmed`);
  }

  if (hasCap('void') || hasCap('cancel')) {
    phase2Parts.push(`
    Note over M,${isDirect ? 'APM' : 'PP'}: Phase 2c — Void / Cancel
    M->>P: Cancel payment
    P->>CH: POST orders/{id}/cancel
    ${isDirect ? `CH->>APM: Cancel call\n    APM-->>CH: Voided` : `CH->>PP: POST charges/{id}/voids\n    PP-->>CH: Voided`}
    CH-->>P: transactionState VOIDED
    P-->>M: Cancel confirmed`);
  }

  return phase1 + phase2Parts.join('');
}

export default function AuthFlowDiagram({ apm, provider, capabilities }) {
  const ref = useRef(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);

  const apmName = apm?.name || 'APM';
  const apmCode = apm?.code || 'APM';
  const chart = generateAuthFlowChart(apmName, apmCode, provider, capabilities || ['auth', 'capture']);

  useEffect(() => {
    const id = `auth-flow-${Math.random().toString(36).substr(2, 9)}`;
    mermaid.render(id, chart)
      .then(({ svg }) => { setSvg(svg); setError(null); })
      .catch(err => { setError(err.message || 'Render failed'); });
  }, [chart]);

  if (error) {
    return (
      <div style={{ margin: '16px 0' }}>
        <div style={{ background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Auth Flow — {apmName} ({provider === 'direct' ? 'Direct' : 'via PPRO'})</div>
          <pre style={{ fontSize: 11, color: '#b0a898', whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono, monospace' }}>{chart}</pre>
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '16px 0' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
        Auth Flow — {apmName} ({provider === 'direct' ? 'Direct → Commerce Hub' : 'Commerce Hub → PPRO'})
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {(capabilities || []).map(c => (
          <span key={c} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(232,200,50,0.1)', color: '#b8960a', border: '1px solid rgba(232,200,50,0.2)' }}>{c}</span>
        ))}
      </div>
      <div className="mermaid-container" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
