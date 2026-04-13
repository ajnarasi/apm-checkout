/**
 * Sandbox Client — HTTP wrapper for the test-harness running on localhost:3847.
 * Used by integration tests to call sandbox endpoints.
 */

const BASE_URL = 'http://localhost:3847';

export async function sandboxFetch(
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
): Promise<{ status: number; data: Record<string, unknown> }> {
  const { method = 'GET', body } = options;
  const resp = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await resp.json();
  return { status: resp.status, data };
}

export async function healthCheck(): Promise<boolean> {
  try {
    const { data } = await sandboxFetch('/api/health');
    return (data as { status: string }).status === 'ok';
  } catch {
    return false;
  }
}

export async function clearTestLog(): Promise<void> {
  await sandboxFetch('/api/test-log/clear');
}

export async function getTestLog(): Promise<{ summary: { total: number; passed: number; failed: number }; log: unknown[] }> {
  const { data } = await sandboxFetch('/api/test-log');
  return data as { summary: { total: number; passed: number; failed: number }; log: unknown[] };
}

// Klarna sandbox helpers
export async function createKlarnaSession(amount = 50.00) {
  return sandboxFetch('/api/klarna/session', {
    method: 'POST',
    body: {
      amount,
      currency: 'USD',
      taxAmount: 3.50,
      merchantReference: `SDK-TEST-${Date.now()}`,
      items: [
        { itemName: 'Test Item', quantity: 1, unitPrice: amount, grossAmount: amount, taxAmount: 3.50 },
      ],
      shippingAddress: {
        firstName: 'Test', lastName: 'User', street: '123 Test St',
        city: 'Chicago', postalCode: '60601', country: 'US',
        email: 'test@example.com', phone: '5551234567',
      },
      billingAddress: {
        firstName: 'Test', lastName: 'User', street: '123 Test St',
        city: 'Chicago', postalCode: '60601', country: 'US',
        email: 'test@example.com',
      },
    },
  });
}

// CashApp sandbox helpers
export async function createCashAppRequest(amount = 25.00) {
  return sandboxFetch('/api/cashapp/request', {
    method: 'POST',
    body: {
      amount,
      currency: 'USD',
      merchantReference: `SDK-CASHAPP-${Date.now()}`,
    },
  });
}

// PPRO sandbox helpers
export async function createPproCharge(paymentMethod: string, country: string, currency: string, amount = 10.00) {
  return sandboxFetch('/api/ppro/charge', {
    method: 'POST',
    body: {
      amount,
      currency,
      customerName: 'Test User',
      customerEmail: 'test@example.com',
      country,
      paymentMethod,
      captureFlag: true,
      merchantOrderId: `SDK-${paymentMethod}-${Date.now()}`,
    },
  });
}
