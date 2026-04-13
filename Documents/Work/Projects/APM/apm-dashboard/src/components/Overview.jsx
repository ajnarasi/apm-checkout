import { useState } from 'react';

// ─── DESIGN TOKENS (Benkuy-inspired warm palette) ───
const C = {
  bg: '#f0ebe3', surface: '#e8e2d8', surfaceAlt: '#f5f0e8', card: '#ffffff',
  dark: '#1a1a1a', darkAlt: '#2a2a2a',
  border: '#d4cdc0', borderLight: '#e0d9cc', accent: '#e8c832', accentGlow: 'rgba(232,200,50,0.1)',
  green: '#22c55e', greenGlow: 'rgba(34,197,94,0.06)', orange: '#f59e0b', orangeGlow: 'rgba(245,158,11,0.06)',
  purple: '#8b5cf6', purpleGlow: 'rgba(139,92,246,0.06)', red: '#ef4444', redGlow: 'rgba(239,68,68,0.06)',
  cyan: '#0891b2', cyanGlow: 'rgba(8,145,178,0.06)', blue: '#3b82f6', blueGlow: 'rgba(59,130,246,0.06)',
  text: '#1a1a1a', textMuted: '#7a7a7a', textDim: '#999999',
};

function Badge({ color = 'blue', children }) {
  const colors = { blue: C.blue, green: C.green, orange: C.orange, purple: C.purple, red: C.red, cyan: C.cyan, accent: C.dark };
  const glows = { blue: C.blueGlow, green: C.greenGlow, orange: C.orangeGlow, purple: C.purpleGlow, red: C.redGlow, cyan: C.cyanGlow, accent: C.accentGlow };
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 4, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, background: color === 'accent' ? C.accent : glows[color], color: color === 'accent' ? C.dark : colors[color], border: `1px solid ${colors[color]}33` }}>{children}</span>;
}
function SmallLabel({ children }) { return <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: 1.3, marginBottom: 10, marginTop: 20 }}>{children}</div>; }
function P({ children }) { return <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.65, margin: '0 0 10px' }}>{children}</p>; }
function VArrow({ label, color = C.textDim }) {
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '6px 0' }}>
    <div style={{ width: 1.5, height: 12, background: color }} />
    {label && <div style={{ fontSize: 9, color, letterSpacing: 0.4, fontWeight: 600, textTransform: 'uppercase', textAlign: 'center', maxWidth: 300 }}>{label}</div>}
    <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${color}` }} />
  </div>;
}
function VCard({ icon, title, color = 'blue', children }) {
  const colors = { blue: C.accent, green: C.green, orange: C.orange, purple: C.purple, red: C.red, cyan: C.cyan };
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, borderLeft: `3px solid ${colors[color]}` }}>
    {(icon || title) && <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: children ? 8 : 0 }}>{icon && <span style={{ fontSize: 15 }}>{icon}</span>}{title && <span style={{ fontSize: 13, fontWeight: 700, color: colors[color] }}>{title}</span>}</div>}
    {children}
  </div>;
}
function Item({ children }) { return <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.7, padding: '1px 0' }}>→ {children}</div>; }

export default function Overview() {
  const [openAlt, setOpenAlt] = useState(null);

  return (
    <div className="page">
      {/* ─── HERO ─── */}
      <div className="hero">
        <div className="hero-label">Commerce Hub — APM Gateway Strategy</div>
        <h2>INNOVATE. INTEGRATE. LAUNCH.</h2>
        <P>Enable any payment method through Commerce Hub APIs in days, not months. One engine generates field-level mappings, PRDs, adapter specs, and test fixtures for 55 APMs across 3 platforms — bridging both the backend API mapping and the frontend checkout SDK into a single frictionless experience for every Fiserv merchant.</P>
      </div>

      {/* ─── METRICS ─── */}
      <div className="metrics">
        {[
          { value: '90%', label: 'Faster Integration', detail: '8-12 weeks → 5 days' },
          { value: '55', label: 'Payment Methods', detail: '16 direct + 39 PPRO', className: 'amber' },
          { value: '5', label: 'Integration Patterns', detail: 'Redirect, BNPL, QR, Bank, Voucher' },
          { value: '3', label: 'Platforms Served', detail: 'CH + Ucom + SnapPay', className: 'green' },
          { value: '18', label: 'Currencies', detail: 'USD, EUR, GBP + 15 more', className: 'amber' },
          { value: '100%', label: 'Sandbox Pass Rate', detail: '55/55 tests passing', className: 'green' },
        ].map((m, i) => <div key={i} className={`metric-card ${m.className || ''}`}><div className="metric-value">{m.value}</div><div className="metric-label">{m.label}</div><div className="metric-detail">{m.detail}</div></div>)}
      </div>

      {/* ─── THE TWO TRACKS ─── */}
      <SmallLabel>The Architecture: Two Tracks, One Platform</SmallLabel>
      <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
        <P>This initiative bridges two parallel capabilities into a single merchant experience:</P>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '12px 0' }}>
          <VCard icon="⚙️" title="Track 1 — Backend Mapping Engine" color="blue">
            <P>Translates Ucom/SnapPay field names → Commerce Hub field names → APM provider field names. Auto-generates PRDs, adapter specs, test fixtures, and safety checks.</P>
            <div style={{ fontFamily: 'monospace', fontSize: 10.5, color: C.accent, background: C.bg, padding: 8, borderRadius: 4, margin: '6px 0' }}>
              Ucom API → Adapter → CH Orders API → APM Provider
            </div>
            <Badge color="green">Built + Validated (55/55 pass)</Badge>
          </VCard>
          <VCard icon="🎨" title="Track 2 — Frontend Checkout SDK" color="orange">
            <P>Renders Klarna widgets, CashApp QR codes, Apple Pay buttons in the browser. 55 adapters with unified lifecycle (init → render → authorize → teardown). 18 universal events.</P>
            <div style={{ fontFamily: 'monospace', fontSize: 10.5, color: C.orange, background: C.bg, padding: 8, borderRadius: 4, margin: '6px 0' }}>
              {'<script src="checkout-sdk.js"> → render() → authorize()'}
            </div>
            <Badge color="green">Built (APM Launch Kit)</Badge>
          </VCard>
        </div>

        <VCard icon="🔗" title="The Gap — What Connects Them" color="cyan">
          <P>The mapping engine tells the backend what fields to send. The SDK tells the frontend what to render. A Ucom merchant needs BOTH — but shouldn't have to build either. The solution: a hosted checkout page that combines both tracks, or a Ucom-branded SDK wrapper that abstracts both.</P>
        </VCard>
      </div>

      {/* ─── SOLUTION: HOW IT ALL CONNECTS ─── */}
      <SmallLabel>Solution Architecture — CommerceHub as APM Gateway</SmallLabel>
      <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
        {/* Merchant Tier */}
        <SmallLabel>Merchant Tier</SmallLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 4 }}>
          {['Retail Chain (Ucom)', 'eComm Direct (CH)', 'B2B Enterprise (SnapPay)', 'Future (Carat/Buypass)'].map((m, i) =>
            <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.textMuted }}>🏪 {m}</div>
          )}
        </div>
        <VArrow label="Each platform's existing API — no merchant changes" color={C.accent} />

        {/* Platform Tier */}
        <SmallLabel>Platform Tier + Adapters</SmallLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr 1fr 1fr', gap: 8, marginBottom: 4 }}>
          {[
            { name: 'UCom', tag: 'UCom-to-CH Adapter', status: 'Target POC', sc: 'orange' },
            { name: 'CommerceHub', tag: 'NATIVE — IS the Gateway', status: 'Live', sc: 'green', hl: true },
            { name: 'SnapPay', tag: 'SnapPay-to-CH Adapter', status: 'Phase 2', sc: 'blue' },
            { name: 'Future', tag: 'Carat / Buypass', status: 'Phase 3', sc: 'purple' },
          ].map((p, i) => (
            <div key={i} style={{ background: p.hl ? `${C.green}0d` : `${C.accent}0d`, border: `1px solid ${p.hl ? C.green : C.accent}30`, borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: p.hl ? 13 : 11.5, fontWeight: 700, color: p.hl ? C.green : C.accent }}>{p.name}</div>
              <div style={{ fontSize: 9.5, color: C.textDim }}>{p.tag}</div>
              <div style={{ marginTop: 4 }}><Badge color={p.sc}>{p.status}</Badge></div>
            </div>
          ))}
        </div>
        <VArrow label="Adapters translate to CommerceHub checkouts/v1/orders" color={C.green} />

        {/* CommerceHub Gateway */}
        <div style={{ background: C.dark, border: `2px solid ${C.accent}`, borderRadius: 10, padding: 16, marginBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.accent }}>⚡ CommerceHub — checkouts/v1/orders</div>
            <Badge color="accent">THE APM GATEWAY</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {[
              { mod: 'Orders API', desc: 'Create, authorize, capture, refund, cancel — all APM lifecycle' },
              { mod: 'Mapping Engine', desc: 'Auto-generates field mappings for 55 APMs across 5 patterns' },
              { mod: 'Hosted Checkout', desc: 'Checkout SDK hosted by CH — merchants redirect, not embed' },
              { mod: 'Safety Framework', desc: '7 automated checks: amount symmetry, currency, Tier 1 coverage' },
              { mod: 'Webhook Engine', desc: 'CashApp, PayPal, Klarna, Alipay+ callback processing' },
              { mod: 'APM Registry', desc: '55 APMs — 16 direct + 39 via PPRO, 4 regions, 18 currencies' },
            ].map((c, i) => (
              <div key={i} style={{ background: C.darkAlt, borderRadius: 5, padding: '6px 8px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.accent }}>{c.mod}</div>
                <div style={{ fontSize: 9.5, color: '#b0a898', lineHeight: 1.4 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <VArrow label="Provider-specific API protocols" color={C.orange} />

        {/* APM Providers */}
        <SmallLabel>APM Provider Tier</SmallLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
          {[{ n: 'CashApp Pay', r: 'US' }, { n: 'PayPal/Venmo', r: 'Global' }, { n: 'Klarna', r: 'US/EU' }, { n: 'Alipay+', r: 'APAC' }, { n: 'PPRO (39)', r: 'Global' }, { n: 'Affirm', r: 'US/CA' }].map((a, i) =>
            <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, padding: '6px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: C.orange }}>{a.n}</div>
              <div style={{ fontSize: 9, color: C.textDim }}>{a.r}</div>
            </div>
          )}
        </div>
      </div>

      {/* ─── MERCHANT INTEGRATION PATHS ─── */}
      <SmallLabel>Ucom Merchant Integration — Two Options</SmallLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <VCard icon="🌐" title="Option A: Hosted Checkout (Zero Frontend)" color="green">
          <P><strong>What merchants do:</strong></P>
          <Item>Call POST /v1/payments/auths with fundingSource.type = "KLARNA" (1-line change)</Item>
          <Item>Receive redirectUrl in response</Item>
          <Item>Redirect customer to Commerce Hub Hosted Checkout</Item>
          <Item>Handle callback when customer returns</Item>
          <div style={{ marginTop: 8 }}><Badge color="green">Zero frontend code</Badge> <Badge color="blue">~1 day integration</Badge></div>
        </VCard>
        <VCard icon="💻" title="Option B: Embedded SDK (Frontend Control)" color="cyan">
          <P><strong>What merchants do:</strong></P>
          <Item>{'Add <script src="checkout-sdk.js"> to checkout page'}</Item>
          <Item>Initialize with Ucom merchant ID</Item>
          <Item>Call render() to mount Klarna widget / CashApp QR</Item>
          <Item>Handle authorize:complete event</Item>
          <div style={{ marginTop: 8 }}><Badge color="cyan">Full UI control</Badge> <Badge color="blue">~2-3 days integration</Badge></div>
        </VCard>
      </div>

      {/* ─── JOBS TO BE DONE ─── */}
      <SmallLabel>Jobs to Be Done</SmallLabel>
      <div className="jtbd-grid">
        {[
          { icon: '⚡', title: 'Integrate Fast', color: 'blue', metric: '90% time reduction', desc: 'PM runs /enable-apm → 8 deliverables in minutes. Engineering reviews, not authors. 8-12 weeks → 5 days.' },
          { icon: '🤝', title: 'Consistent Contracts', color: 'cyan', metric: 'Zero tolerance accuracy', desc: 'Pattern templates + golden mappings + typed transforms ensure every APM follows the same field taxonomy.' },
          { icon: '🛡️', title: 'Reduce Errors', color: 'green', metric: '7 safety checks', desc: 'Amount symmetry, currency preservation, ID uniqueness — all checked automatically before any mapping reaches production.' },
          { icon: '🌍', title: 'Scale Globally', color: 'orange', metric: '4 regions, 18 currencies', desc: 'One engine → 3 platforms simultaneously. Adapter specs propagate to Ucom and SnapPay alongside Commerce Hub mapping.' },
        ].map((job, i) => (
          <VCard key={i} icon={job.icon} title={job.title} color={job.color}>
            <P>{job.desc}</P>
            <Badge color={job.color}>{job.metric}</Badge>
          </VCard>
        ))}
      </div>

      {/* ─── UCOM PM CHECKLIST ─── */}
      <SmallLabel>Ucom PM Checklist — After Mapping Generation</SmallLabel>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
        {[
          { n: '1', task: 'Add FundingSourceType enum values', source: 'adapter-spec-ucom.md → YAML', effort: 'API spec update', auto: true },
          { n: '2', task: 'Add FundingSource objects (Klarna, CashApp, etc.)', source: 'adapter-spec-ucom.md → YAML', effort: 'API spec update', auto: true },
          { n: '3', task: 'Update developer docs with examples', source: 'test-fixtures.json → Ucom fixtures', effort: 'Doc update', auto: true },
          { n: '4', task: 'Deploy adapter middleware', source: 'adapter-spec-ucom.md → Protocol spec', effort: 'Engineering', auto: false },
          { n: '5', task: 'Configure hosted checkout URLs', source: 'Commerce Hub provides', effort: 'Configuration', auto: false },
          { n: '6', task: 'Notify merchants of new APMs', source: 'Marketing/comms', effort: 'Announcement', auto: false },
          { n: '7', task: 'Run integration test with pilot merchant', source: 'test-fixtures.json → Payloads', effort: 'QA', auto: false },
        ].map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '0.3fr 3fr 3fr 1.5fr 0.8fr', borderBottom: i < 6 ? `1px solid ${C.border}` : 'none', alignItems: 'center' }}>
            <div style={{ padding: '8px', textAlign: 'center', fontSize: 12, fontWeight: 800, color: C.accent }}>{r.n}</div>
            <div style={{ padding: '8px 12px', fontSize: 11.5, color: C.text }}>{r.task}</div>
            <div style={{ padding: '8px 12px', fontSize: 10.5, color: C.textDim, fontFamily: 'monospace' }}>{r.source}</div>
            <div style={{ padding: '8px 12px', fontSize: 10.5, color: C.textMuted }}>{r.effort}</div>
            <div style={{ padding: '8px', textAlign: 'center' }}>{r.auto ? <Badge color="green">AUTO</Badge> : <Badge color="orange">MANUAL</Badge>}</div>
          </div>
        ))}
      </div>
      <P><strong>Key insight:</strong> Steps 1-3 are already done by the mapping engine. The Ucom PM's job is deployment and communication, not requirements authoring.</P>

      {/* ─── BEFORE / AFTER ─── */}
      <SmallLabel>The Problem We Solved</SmallLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <VCard icon="❌" title="Before — Per-APM Engineering" color="red">
          <Item>Each APM = 8-12 week engineering project</Item>
          <Item>Manual API doc parsing + field mapping</Item>
          <Item>Platform teams wait months after CH launches</Item>
          <Item>Merchants need frontend + backend changes</Item>
          <Item>52 APMs × 3 weeks = 156 engineer-weeks</Item>
          <Item>No safety checks — errors found in production</Item>
        </VCard>
        <VCard icon="✅" title="After — Config-Driven Engine + Hosted Checkout" color="green">
          <Item>PM runs /enable-apm → 8 deliverables in minutes</Item>
          <Item>AI-powered mapping from pattern templates</Item>
          <Item>All 3 platforms updated simultaneously</Item>
          <Item>Hosted checkout = zero merchant frontend work</Item>
          <Item>55 APMs × 5 days = 1 week total</Item>
          <Item>7 automated safety checks pre-production</Item>
        </VCard>
      </div>

      {/* ─── STAKEHOLDER BENEFITS ─── */}
      <SmallLabel>Who Benefits</SmallLabel>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
        {[
          { who: 'PM', before: 'Write PRDs, parse API docs, coordinate platforms', after: 'Run /enable-apm, review, approve', c: C.accent },
          { who: 'Developer', before: 'Read provider docs, manual mapping, custom tests', after: 'Receive mapping + config + fixtures', c: C.accent },
          { who: 'QA', before: 'Create test suites from scratch', after: 'Auto-generated fixtures + 7 safety checks', c: C.green },
          { who: 'Ucom Team', before: 'Wait for CH, build own adapter (weeks)', after: 'Adapter spec generated simultaneously', c: C.orange },
          { who: 'Ucom Merchant', before: 'Backend + frontend changes per APM', after: 'One fundingSource.type change OR hosted checkout redirect', c: C.green },
          { who: 'SnapPay Team', before: 'Same + B2B domain translation', after: 'Adapter spec with B2B fields flagged', c: C.orange },
        ].map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 3fr 3fr', borderBottom: i < 5 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: r.c, background: C.surfaceAlt }}>{r.who}</div>
            <div style={{ padding: '8px 12px', fontSize: 11, color: C.red, borderLeft: `1px solid ${C.border}` }}>{r.before}</div>
            <div style={{ padding: '8px 12px', fontSize: 11, color: C.green, borderLeft: `1px solid ${C.border}` }}>{r.after}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
