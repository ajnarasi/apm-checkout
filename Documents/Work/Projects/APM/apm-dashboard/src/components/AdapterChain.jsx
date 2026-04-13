export default function AdapterChain({ apm, platform, provider, testResult }) {
  const platformName = platform === 'ucom' ? 'Ucom' : platform === 'snappay' ? 'SnapPay' : 'All Platforms';
  const providerName = provider === 'ppro' ? 'PPRO' : 'Direct';
  const apmName = apm?.name || 'APM';
  const apmCode = apm?.code || '?';

  return (
    <div>
      <h3 className="md-h3" style={{ color: 'var(--accent)', marginBottom: 16 }}>Mapping Chain: {platformName} → Commerce Hub → {providerName} → {apmName}</h3>

      <div className="chain">
        {platform !== 'all' && (
          <>
            <div className="chain-box" style={{ borderColor: '#ff9800' }}>
              <div className="chain-label">PLATFORM</div>
              <div className="chain-name">{platformName}</div>
              <div className="chain-endpoint">
                {platform === 'ucom' ? 'POST /v1/payments/auths' : 'POST /api/interop/v3/charge'}
              </div>
              <div className="chain-detail">
                {platform === 'ucom' ? 'fundingSource.type' : 'paymentmode'} = "{apmCode}"
              </div>
            </div>
            <div className="chain-arrow">→</div>
          </>
        )}

        <div className="chain-box" style={{ borderColor: 'var(--accent)' }}>
          <div className="chain-label">COMMERCE HUB</div>
          <div className="chain-name" style={{ color: 'var(--accent)' }}>Orders API</div>
          <div className="chain-endpoint">POST /checkouts/v1/orders</div>
          <div className="chain-detail">v1.26.0302</div>
        </div>

        <div className="chain-arrow">→</div>

        {provider === 'ppro' ? (
          <>
            <div className="chain-box" style={{ borderColor: '#2196f3' }}>
              <div className="chain-label">AGGREGATOR</div>
              <div className="chain-name" style={{ color: '#2196f3' }}>PPRO</div>
              <div className="chain-endpoint">POST /v1/payment-charges</div>
              <div className="chain-detail">paymentMethod = "{apmCode}"</div>
            </div>
            <div className="chain-arrow">→</div>
          </>
        ) : null}

        <div className="chain-box" style={{ borderColor: 'var(--pass)' }}>
          <div className="chain-label">APM PROVIDER</div>
          <div className="chain-name" style={{ color: 'var(--pass)' }}>{apmName}</div>
          <div className="chain-endpoint">{apm?.country} / {apm?.currency}</div>
          <div className="chain-detail">{apm?.pattern}</div>
        </div>
      </div>

      {testResult && (
        <div className="test-result-card">
          <h4>Sandbox Test Result</h4>
          <div className="test-result-grid">
            <div className="test-result-item">
              <span className="test-result-label">Status</span>
              <div className="test-result-value" style={{ color: testResult.success ? 'var(--pass)' : 'var(--fail)' }}>
                {testResult.success ? 'PASS' : 'FAIL'} — {testResult.status || testResult.error}
              </div>
            </div>
            {testResult.chargeId && (
              <div className="test-result-item">
                <span className="test-result-label">Charge ID</span>
                <div className="test-result-value" style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{testResult.chargeId}</div>
              </div>
            )}
            <div className="test-result-item">
              <span className="test-result-label">Amount</span>
              <div className="test-result-value">{testResult.amountSymmetric ? 'OK' : 'MISMATCH'} Symmetric ({testResult.amountSent} → {testResult.amountReceived})</div>
            </div>
            <div className="test-result-item">
              <span className="test-result-label">Currency</span>
              <div className="test-result-value">{testResult.currencyPreserved ? 'OK' : 'MISMATCH'} {testResult.currency} preserved</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
