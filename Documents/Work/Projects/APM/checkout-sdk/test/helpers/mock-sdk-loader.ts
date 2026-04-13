/**
 * Mock SDK Loader — Mocks external payment SDK globals for unit tests.
 * Each mock replicates the minimal interface needed by the adapter.
 */

export function mockKlarnaSDK() {
  const mock = {
    Payments: {
      init: vi.fn(),
      load: vi.fn((_opts: unknown, _data: unknown, cb: (res: { show_form: boolean }) => void) => {
        cb({ show_form: true });
      }),
      authorize: vi.fn((_opts: unknown, _data: unknown, cb: (res: { approved: boolean; authorization_token?: string; show_form?: boolean }) => void) => {
        cb({ approved: true, authorization_token: 'mock_auth_token_123' });
      }),
      on: vi.fn(),
      off: vi.fn(),
    },
  };
  (globalThis as Record<string, unknown>).Klarna = mock;
  return mock;
}

export function mockCashAppSDK() {
  const mock = {
    pay: vi.fn().mockResolvedValue({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      customerRequest: vi.fn().mockResolvedValue({}),
      render: vi.fn().mockResolvedValue({}),
      begin: vi.fn(),
      destroy: vi.fn(),
      restart: vi.fn(),
      update: vi.fn().mockResolvedValue(true),
    }),
  };
  (globalThis as Record<string, unknown>).CashAppPay = mock;
  return mock;
}

export function mockAfterPaySDK() {
  const mock = {
    initialize: vi.fn(),
    initializeForPopup: vi.fn(),
    open: vi.fn(),
    transfer: vi.fn(),
  };
  (globalThis as Record<string, unknown>).AfterPay = mock;
  return mock;
}

export function mockApplePaySession() {
  const mock = vi.fn().mockImplementation(() => ({
    begin: vi.fn(),
    abort: vi.fn(),
    completeMerchantValidation: vi.fn(),
    completePayment: vi.fn(),
    completePaymentMethodSelection: vi.fn(),
    completeShippingContactSelection: vi.fn(),
    completeShippingMethodSelection: vi.fn(),
    completeCouponCodeChange: vi.fn(),
    onvalidatemerchant: null,
    onpaymentauthorized: null,
    onpaymentmethodselected: null,
    onshippingcontactselected: null,
    onshippingmethodselected: null,
    oncouponcodechanged: null,
    oncancel: null,
  }));
  mock.canMakePayments = vi.fn().mockReturnValue(true);
  mock.canMakePaymentsWithActiveCard = vi.fn().mockResolvedValue(true);
  mock.supportsVersion = vi.fn().mockReturnValue(true);
  (globalThis as Record<string, unknown>).ApplePaySession = mock;
  return mock;
}

export function mockGooglePayClient() {
  const mock = {
    isReadyToPay: vi.fn().mockResolvedValue({ result: true }),
    loadPaymentData: vi.fn().mockResolvedValue({
      paymentMethodData: {
        tokenizationData: { token: 'mock_google_token' },
        type: 'CARD',
      },
    }),
    prefetchPaymentData: vi.fn(),
    createButton: vi.fn().mockReturnValue(document.createElement('button')),
  };
  const GooglePayClient = vi.fn().mockReturnValue(mock);
  (globalThis as Record<string, unknown>).google = {
    payments: { api: { PaymentsClient: GooglePayClient } },
  };
  return mock;
}

export function mockPayPalSDK() {
  const mock = {
    Buttons: vi.fn().mockReturnValue({
      isEligible: vi.fn().mockReturnValue(true),
      render: vi.fn().mockResolvedValue(undefined),
    }),
    Messages: vi.fn().mockReturnValue({
      render: vi.fn().mockResolvedValue(undefined),
    }),
    Marks: vi.fn().mockReturnValue({
      isEligible: vi.fn().mockReturnValue(true),
      render: vi.fn().mockResolvedValue(undefined),
    }),
    getFundingSources: vi.fn().mockReturnValue(['paypal', 'card']),
    isFundingEligible: vi.fn().mockReturnValue(true),
    FUNDING: { PAYPAL: 'paypal', CARD: 'card', VENMO: 'venmo' },
  };
  (globalThis as Record<string, unknown>).paypal = mock;
  return mock;
}

export function mockAffirmSDK() {
  const mock = {
    checkout: vi.fn(),
    ui: {
      ready: vi.fn((cb: () => void) => cb()),
      refresh: vi.fn(),
      components: {
        create: vi.fn(),
        render: vi.fn(),
        update: vi.fn(),
      },
    },
    events: {
      on: vi.fn(),
    },
  };
  mock.checkout.open = vi.fn();
  mock.checkout.post = vi.fn();
  (globalThis as Record<string, unknown>).affirm = mock;
  return mock;
}

export function mockQuadpaySDK() {
  const mock = {
    openCheckout: vi.fn(),
    focusCheckout: vi.fn(),
    closeCheckout: vi.fn(),
  };
  (globalThis as Record<string, unknown>).Quadpay = mock;
  return mock;
}

export function clearAllMocks() {
  const globals = ['Klarna', 'CashAppPay', 'AfterPay', 'ApplePaySession', 'google', 'paypal', 'affirm', 'Quadpay'];
  for (const g of globals) {
    delete (globalThis as Record<string, unknown>)[g];
  }
}
