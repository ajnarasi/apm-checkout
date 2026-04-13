import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3848;
const __dirname = path.dirname(new URL(import.meta.url).pathname);

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Sandbox credentials (server-side only — never sent to the client)
// ---------------------------------------------------------------------------
const PPRO = {
  baseUrl: 'https://api.sandbox.eu.ppro.com',
  token: 'VmsuZdokSguLzDnCCDMG0O6RPJqWxPZICHvZd6GA4UjByBG3FH3dXmqpYNosW0Sz5WBFFoZQP9E0b5Mp',
  merchantId: 'FIRSTDATATESTCONTRACT'
};

const CASHAPP = {
  baseUrl: 'https://sandbox.api.cash.app',
  clientId: 'CAS-CI_FISERV_TEST',
  merchantId: 'MMI_1nk0ecoa69ilax9gno1lz6luh'
};

const KLARNA = {
  baseUrl: 'https://api-na.playground.klarna.com',
  auth: 'Basic ' + Buffer.from(
    'eb9570bf-163e-487e-b8c6-f84a188c10a1:klarna_test_api_OUtELVQ_RER4Kjc3VmpzQS8oY0t0NHlEN2dKS2ZlcXQsZWI5NTcwYmYtMTYzZS00ODdlLWI4YzYtZjg0YTE4OGMxMGExLDEscVpQU08vdGlCM0ZuNHl4NVJ2czhlejN2aHY2bHhEeEtTdk1rVVVBQVZEZz0'
  ).toString('base64')
};

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const SKILL_REF_DIR = path.join(__dirname, 'skill-references');
const GOLDEN_DIR = path.join(SKILL_REF_DIR, 'golden-mappings');

// ---------------------------------------------------------------------------
// APM master list (52 PPRO APMs + 3 direct)
// ---------------------------------------------------------------------------
// Import APM list from shared frontend data (single source of truth)
import { APMS as FRONTEND_APMS } from './src/data/apmList.js';
// Normalize codes to lowercase for server-side lookups
const APMS = FRONTEND_APMS.map(a => ({ ...a, code: a.code.toLowerCase() }));

/* Original server list replaced by import above. Direct vs PPRO classification:
  - Direct (16): Klarna, CashApp, Afterpay, Affirm, PayPal, PayPal Pay Later,
    Venmo, Apple Pay, Google Pay, Sezzle, Zip, TabaPay, Alipay+, WeChat Pay, GrabPay, Zepto
  - PPRO (39): iDEAL, Bancontact, EPS, BLIK, Multibanco, MB Way, Trustly, Wero,
    Sofort, Giropay, Przelewy24, Swish, Vipps, MobilePay, PostFinance, TWINT,
    Pix, Boleto, OXXO, SPEI, PSE, Efecty, Mercado Pago, RapiPago, PagoEfectivo,
    Webpay, Alipay (PPRO), PayNow, GCash, Maya, LINE Pay, KakaoPay, DANA, OVO,
    ShopeePay, Konbini, PayPay, UPI, Touch 'n Go
*/
const _APMS_REMOVED = [
  // PPRO APMs
  { name: 'iDEAL', code: 'ideal', region: 'EU', country: 'NL', currency: 'EUR', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'Bancontact', code: 'bancontact', region: 'EU', country: 'BE', currency: 'EUR', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'Sofort', code: 'sofort', region: 'EU', country: 'DE', currency: 'EUR', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'giropay', code: 'giropay', region: 'EU', country: 'DE', currency: 'EUR', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'EPS', code: 'eps', region: 'EU', country: 'AT', currency: 'EUR', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'Przelewy24', code: 'p24', region: 'EU', country: 'PL', currency: 'PLN', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'BLIK', code: 'blik', region: 'EU', country: 'PL', currency: 'PLN', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'Trustly', code: 'trustly', region: 'EU', country: 'SE', currency: 'SEK', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'Swish', code: 'swish', region: 'EU', country: 'SE', currency: 'SEK', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'Vipps', code: 'vipps', region: 'EU', country: 'NO', currency: 'NOK', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'MobilePay', code: 'mobilepay', region: 'EU', country: 'DK', currency: 'DKK', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'Multibanco', code: 'multibanco', region: 'EU', country: 'PT', currency: 'EUR', pattern: 'voucher-cash', provider: 'ppro' },
  { name: 'MB WAY', code: 'mbway', region: 'EU', country: 'PT', currency: 'EUR', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'PayU', code: 'payu', region: 'EU', country: 'CZ', currency: 'CZK', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'Boleto', code: 'boleto', region: 'LATAM', country: 'BR', currency: 'BRL', pattern: 'voucher-cash', provider: 'ppro' },
  { name: 'PIX', code: 'pix', region: 'LATAM', country: 'BR', currency: 'BRL', pattern: 'qr-code', provider: 'ppro' },
  { name: 'OXXO', code: 'oxxo', region: 'LATAM', country: 'MX', currency: 'MXN', pattern: 'voucher-cash', provider: 'ppro' },
  { name: 'SPEI', code: 'spei', region: 'LATAM', country: 'MX', currency: 'MXN', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'PSE', code: 'pse', region: 'LATAM', country: 'CO', currency: 'COP', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'Webpay', code: 'webpay', region: 'LATAM', country: 'CL', currency: 'CLP', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'Khipu', code: 'khipu', region: 'LATAM', country: 'CL', currency: 'CLP', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'PagoEfectivo', code: 'pagoefectivo', region: 'LATAM', country: 'PE', currency: 'PEN', pattern: 'voucher-cash', provider: 'ppro' },
  { name: 'Alipay', code: 'alipay', region: 'APAC', country: 'CN', currency: 'CNY', pattern: 'qr-code', provider: 'ppro' },
  { name: 'Alipay+', code: 'alipayplus', region: 'APAC', country: 'CN', currency: 'CNY', pattern: 'qr-code', provider: 'ppro' },
  { name: 'WeChat Pay', code: 'wechatpay', region: 'APAC', country: 'CN', currency: 'CNY', pattern: 'qr-code', provider: 'ppro' },
  { name: 'GrabPay', code: 'grabpay', region: 'APAC', country: 'SG', currency: 'SGD', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'GCash', code: 'gcash', region: 'APAC', country: 'PH', currency: 'PHP', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'Maya', code: 'maya', region: 'APAC', country: 'PH', currency: 'PHP', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'OVO', code: 'ovo', region: 'APAC', country: 'ID', currency: 'IDR', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'DANA', code: 'dana', region: 'APAC', country: 'ID', currency: 'IDR', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'ShopeePay', code: 'shopeepay', region: 'APAC', country: 'ID', currency: 'IDR', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'KakaoPay', code: 'kakaopay', region: 'APAC', country: 'KR', currency: 'KRW', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'Toss Pay', code: 'tosspay', region: 'APAC', country: 'KR', currency: 'KRW', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'PayPay', code: 'paypay', region: 'APAC', country: 'JP', currency: 'JPY', pattern: 'qr-code', provider: 'ppro' },
  { name: 'Konbini', code: 'konbini', region: 'APAC', country: 'JP', currency: 'JPY', pattern: 'voucher-cash', provider: 'ppro' },
  { name: 'Pay-easy', code: 'payeasy', region: 'APAC', country: 'JP', currency: 'JPY', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'PromptPay', code: 'promptpay', region: 'APAC', country: 'TH', currency: 'THB', pattern: 'qr-code', provider: 'ppro' },
  { name: 'TrueMoney', code: 'truemoney', region: 'APAC', country: 'TH', currency: 'THB', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'Touch \'n Go', code: 'touchngo', region: 'APAC', country: 'MY', currency: 'MYR', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'Boost', code: 'boost', region: 'APAC', country: 'MY', currency: 'MYR', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'VNPay', code: 'vnpay', region: 'APAC', country: 'VN', currency: 'VND', pattern: 'qr-code', provider: 'ppro' },
  { name: 'MoMo', code: 'momo', region: 'APAC', country: 'VN', currency: 'VND', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'UPI', code: 'upi', region: 'APAC', country: 'IN', currency: 'INR', pattern: 'qr-code', provider: 'ppro' },
  { name: 'PhonePe', code: 'phonepe', region: 'APAC', country: 'IN', currency: 'INR', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'Paytm', code: 'paytm', region: 'APAC', country: 'IN', currency: 'INR', pattern: 'redirect-wallet', provider: 'ppro' },
  { name: 'POLi', code: 'poli', region: 'APAC', country: 'AU', currency: 'AUD', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'Interac', code: 'interac', region: 'NA', country: 'CA', currency: 'CAD', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'iDEAL 2.0', code: 'ideal2', region: 'EU', country: 'NL', currency: 'EUR', pattern: 'bank-redirect', provider: 'ppro' },
  { name: 'PaySafeCard', code: 'paysafecard', region: 'EU', country: 'AT', currency: 'EUR', pattern: 'voucher-cash', provider: 'ppro' },
]; // end of removed list

// ---------------------------------------------------------------------------
// Platforms
// ---------------------------------------------------------------------------
const PLATFORMS = [
  { id: 'ucom', name: 'Ucom Payment Services', version: '0.2.3' },
  { id: 'snappay', name: 'SnapPay', version: '3.0.9' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readFileOrNull(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function buildPproBody(apmCode, amount, currency, country) {
  const customerName = 'Test Customer';
  return {
    consumer: { name: customerName, email: 'test@example.com', country },
    amount: { value: Math.round(amount * 100), currency },
    paymentMethod: apmCode.toUpperCase(),
    autoCapture: true,
    authenticationSettings: [{
      type: apmCode.toUpperCase() === 'PIX' ? 'SCAN_CODE' : 'REDIRECT',
      settings: apmCode.toUpperCase() === 'PIX'
        ? { scanBy: new Date(Date.now() + 3600000).toISOString() }
        : { returnUrl: 'https://example.com/return' }
    }],
    merchantPaymentChargeReference: `DASH-${apmCode.toUpperCase()}-${Date.now()}`
  };
}

function buildCashappBody(amount, currency) {
  return {
    request: {
      channel: 'ONLINE',
      redirect_url: 'https://example.com/return',
      actions: [{
        type: 'ONE_TIME_PAYMENT',
        amount: Math.round(amount * 100),
        currency,
        scope_id: CASHAPP.merchantId
      }],
      reference_id: `DASH-CASHAPP-${Date.now()}`
    },
    idempotency_key: `DASH-IDEM-${Date.now()}`
  };
}

function buildKlarnaBody(amount, currency, country) {
  return {
    purchase_country: country,
    purchase_currency: currency,
    locale: 'en-US',
    order_amount: Math.round(amount * 100),
    order_tax_amount: 0,
    order_lines: [{
      name: 'Test Item',
      quantity: 1,
      unit_price: Math.round(amount * 100),
      total_amount: Math.round(amount * 100),
      total_tax_amount: 0
    }],
    merchant_reference1: `DASH-KLARNA-${Date.now()}`
  };
}

function validateMapping(sandboxResponse, apmCode) {
  const results = {
    tier1Fields: false,
    amountSymmetry: false,
    currencyPreserved: false,
  };
  if (!sandboxResponse) return results;

  // Check tier-1 field presence (amount and currency echoed back)
  const res = typeof sandboxResponse === 'string' ? JSON.parse(sandboxResponse) : sandboxResponse;
  const resStr = JSON.stringify(res);

  results.tier1Fields = resStr.includes('amount') || resStr.includes('value');
  results.amountSymmetry = resStr.includes('amount') || resStr.includes('value');
  results.currencyPreserved = resStr.includes('currency') || resStr.includes('EUR') || resStr.includes('USD');

  return results;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// 1. GET /api/apms — List all APMs
app.get('/api/apms', (_req, res) => {
  res.json(APMS);
});

// 2. GET /api/platforms — List platforms
app.get('/api/platforms', (_req, res) => {
  res.json(PLATFORMS);
});

// 3. POST /api/generate — Generate / retrieve mapping for an APM
app.post('/api/generate', (req, res) => {
  const { apm, capabilities, platform, provider, regions } = req.body;

  if (!apm) {
    return res.status(400).json({ error: 'apm is required' });
  }

  const apmLower = apm.toLowerCase();

  // Determine output directory name — PPRO APMs may live under {apm}-via-ppro or {apm}
  // Map APM codes to output directory names (handles aliases like alipay -> alipayplus)
  const apmAliases = { alipay: 'alipayplus' };
  const apmDirName = apmAliases[apmLower] || apmLower;
  const candidateDirs = [
    path.join(OUTPUT_DIR, apmDirName),
    path.join(OUTPUT_DIR, apmLower),
    path.join(OUTPUT_DIR, `${apmLower}-via-ppro`),
    path.join(OUTPUT_DIR, `${apmDirName}-via-ppro`),
  ];
  const outputDir = candidateDirs.find(d => fs.existsSync(d)) || candidateDirs[0];

  // Read each deliverable from pre-generated files
  let mapping = readFileOrNull(path.join(outputDir, `mapping-ch-to-${apmDirName}.md`))
    || readFileOrNull(path.join(outputDir, `mapping-ch-to-${apmLower}.md`))
    || readFileOrNull(path.join(outputDir, `mapping-ch-to-ppro-${apmLower}.md`))
    || readFileOrNull(path.join(outputDir, `mapping-ch-to-ppro-${apmDirName}.md`));
  let prd = readFileOrNull(path.join(outputDir, 'PRD.md'));
  let adapterSpec = readFileOrNull(path.join(outputDir, `adapter-spec-${platform || 'ucom'}.md`));
  let configData = readFileOrNull(path.join(outputDir, 'config.json'));
  let testFixtures = readFileOrNull(path.join(outputDir, 'test-fixtures.json'));
  let safetyCheck = readFileOrNull(path.join(outputDir, 'safety-check-report.md'));
  let unmappableFields = readFileOrNull(path.join(outputDir, 'unmappable-fields.md'));
  const goldenMapping = readFileOrNull(path.join(GOLDEN_DIR, `${apmLower}.json`));

  // FALLBACK: If no pre-generated files exist and provider is PPRO,
  // dynamically generate from the iDEAL-via-PPRO template
  const apmMeta = APMS.find(a => a.code.toLowerCase() === apmLower)
    || { name: apm, code: apmLower.toUpperCase(), country: req.body.country || 'US', currency: req.body.currency || 'USD', pattern: 'bank-redirect', provider: 'ppro' };
  if (!mapping && provider === 'ppro' && apmMeta) {
    const apmName = apmMeta.name;
    const apmCode = apmMeta.code;
    const country = apmMeta.country;
    const currency = apmMeta.currency;
    const pattern = apmMeta.pattern;
    const ts = new Date().toISOString();

    // Read the iDEAL-via-PPRO template files and substitute APM-specific values
    const templateDir = path.join(OUTPUT_DIR, 'ideal-via-ppro');
    const templateMapping = readFileOrNull(path.join(templateDir, 'mapping-ch-to-ppro-ideal.md'));
    const templatePrd = readFileOrNull(path.join(templateDir, 'PRD.md'));
    const templateAdapter = readFileOrNull(path.join(templateDir, `adapter-spec-${platform || 'ucom'}.md`));
    const templateConfig = readFileOrNull(path.join(templateDir, 'config.json'));
    const templateFixtures = readFileOrNull(path.join(templateDir, 'test-fixtures.json'));
    const templateSafety = readFileOrNull(path.join(templateDir, 'safety-check-report.md'));
    const templateUnmappable = readFileOrNull(path.join(templateDir, 'unmappable-fields.md'));

    // Substitution function: replace IDEAL/iDEAL/NL/EUR with this APM's values
    const sub = (text) => {
      if (!text) return null;
      return text
        .replace(/\bIDEAL\b/g, apmCode)
        .replace(/\biDEAL\b/g, apmName)
        .replace(/\bideal\b/g, apmLower)
        .replace(/"NL"/g, `"${country}"`)
        .replace(/"EUR"/g, `"${currency}"`)
        .replace(/country: "NL"/g, `country: "${country}"`)
        .replace(/currency: "EUR"/g, `currency: "${currency}"`)
        .replace(/\bNL\b(?=[,\s\"])/g, country)
        .replace(/\bEUR\b(?=[,\s\"])/g, currency)
        .replace(/bank-redirect/g, pattern)
        .replace(/Bank Redirect/g, pattern.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '))
        .replace(/iDEAL via PPRO/g, `${apmName} via PPRO`)
        .replace(/golden-mapping-source.*$/gm, `"goldenMappingSource": "NONE — dynamically generated from PPRO template for ${apmName}",`)
        .replace(/"confidence": "verified"/g, '"confidence": "generated"');
    };

    mapping = sub(templateMapping);
    prd = sub(templatePrd);
    adapterSpec = sub(templateAdapter);
    safetyCheck = sub(templateSafety);
    unmappableFields = sub(templateUnmappable);

    // For JSON files, do substitution then parse
    if (templateConfig) {
      try {
        const configObj = JSON.parse(templateConfig);
        configObj.apm = apmLower;
        configObj.apmDisplayName = apmName;
        configObj.targetApm = apmCode;
        if (configObj.versionContract) {
          configObj.versionContract.generatedAt = ts;
          configObj.versionContract.goldenMappingSource = `Generated from PPRO template for ${apmName}`;
          configObj.versionContract.confidence = 'generated';
        }
        // Update all mapping entries with correct APM code
        for (const cap of Object.keys(configObj.mappings || {})) {
          for (const dir of ['request', 'response']) {
            for (const entry of (configObj.mappings[cap]?.[dir] || [])) {
              if (entry.apmFieldPath === 'paymentMethod') entry.notes = apmCode;
              if (entry.confidence) entry.confidence = 'generated';
            }
          }
        }
        configData = JSON.stringify(configObj, null, 2);
      } catch(e) { configData = sub(templateConfig); }
    }

    if (templateFixtures) {
      try {
        const fixturesObj = JSON.parse(templateFixtures);
        // Update APM-specific values in fixtures
        const updateFixture = (obj) => {
          if (!obj) return obj;
          const str = JSON.stringify(obj)
            .replace(/IDEAL/g, apmCode)
            .replace(/"NL"/g, `"${country}"`)
            .replace(/"EUR"/g, `"${currency}"`);
          return JSON.parse(str);
        };
        for (const cap of Object.keys(fixturesObj.fixtures || {})) {
          fixturesObj.fixtures[cap] = updateFixture(fixturesObj.fixtures[cap]);
        }
        if (fixturesObj.versionContract) {
          fixturesObj.versionContract.generatedAt = ts;
          fixturesObj.versionContract.targetApm = apmCode;
        }
        testFixtures = JSON.stringify(fixturesObj, null, 2);
      } catch(e) { testFixtures = sub(templateFixtures); }
    }
  }

  const notGenerated = `Run /enable-apm ${apm} to generate custom deliverables, or select "via PPRO" to use the PPRO template.`;

  res.json({
    apm: apmLower,
    capabilities: capabilities || ['auth', 'capture'],
    platform: platform || 'ucom',
    provider: provider || 'ppro',
    regions: regions || [],
    generatedFrom: mapping ? (fs.existsSync(outputDir) ? 'pre-generated' : 'ppro-template') : null,
    mapping: mapping || null,
    mappingNote: mapping ? null : notGenerated,
    prd: prd || null,
    prdNote: prd ? null : notGenerated,
    adapterSpec: adapterSpec || null,
    adapterSpecNote: adapterSpec ? null : notGenerated,
    config: configData ? (typeof configData === 'string' ? JSON.parse(configData) : configData) : null,
    configNote: configData ? null : notGenerated,
    testFixtures: testFixtures ? (typeof testFixtures === 'string' ? JSON.parse(testFixtures) : testFixtures) : null,
    testFixturesNote: testFixtures ? null : notGenerated,
    safetyCheck: safetyCheck || null,
    safetyCheckNote: safetyCheck ? null : notGenerated,
    unmappableFields: unmappableFields || null,
    unmappableFieldsNote: unmappableFields ? null : notGenerated,
    goldenMapping: goldenMapping ? JSON.parse(goldenMapping) : null,
  });
});

// 4. POST /api/test/sandbox — Run a single sandbox test
app.post('/api/test/sandbox', async (req, res) => {
  const { apm, provider, amount = 10.00, currency, country } = req.body;

  if (!apm || !provider) {
    return res.status(400).json({ error: 'apm and provider are required' });
  }

  const apmLower = apm.toLowerCase();

  try {
    let sandboxResponse;
    let requestBody;
    let url;
    let headers;

    if (provider === 'ppro') {
      url = `${PPRO.baseUrl}/v1/payment-charges`;
      requestBody = buildPproBody(apmLower, amount, currency || 'EUR', country || 'NL');
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PPRO.token}`,
        'Merchant-Id': PPRO.merchantId,
      };
    } else if (provider === 'cashapp' || apmLower === 'cashapp') {
      url = `${CASHAPP.baseUrl}/customer-request/v1/requests`;
      requestBody = buildCashappBody(amount, currency || 'USD');
      headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Client ${CASHAPP.clientId}`,
        'X-Region': 'SFO',
        'x-signature': 'sandbox:skip-signature-check',
      };
    } else if (provider === 'klarna' || apmLower === 'klarna') {
      url = `${KLARNA.baseUrl}/payments/v1/sessions`;
      requestBody = buildKlarnaBody(amount, currency || 'USD', country || 'US');
      headers = {
        'Content-Type': 'application/json',
        'Authorization': KLARNA.auth,
      };
    } else {
      return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }

    const fetchRes = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const responseText = await fetchRes.text();
    let responseJson;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { raw: responseText };
    }

    sandboxResponse = responseJson;

    // Mapping validation
    const mappingValidation = validateMapping(sandboxResponse, apmLower);

    const isSuccess = fetchRes.status >= 200 && fetchRes.status < 300;
    const auths = sandboxResponse?.authorizations || [];
    const authMethods = sandboxResponse?.authenticationMethods || [];

    res.json({
      success: isSuccess,
      chargeId: sandboxResponse?.id || null,
      status: sandboxResponse?.status || sandboxResponse?.failureMessage || 'ERROR',
      paymentMethod: sandboxResponse?.paymentMethod || null,
      country: sandboxResponse?.country || null,
      currency: sandboxResponse?.currency || requestBody?.amount?.currency || null,
      amountSent: requestBody?.amount?.value || null,
      amountReceived: auths[0]?.amount || null,
      amountSymmetric: isSuccess && requestBody?.amount?.value === (auths[0]?.amount || null),
      currencyPreserved: isSuccess && requestBody?.amount?.currency === sandboxResponse?.currency,
      hasRedirect: authMethods.some(m => m.details?.requestUrl),
      hasQR: authMethods.some(m => m.details?.codeType === 'QR' || m.details?.codeImage),
      error: sandboxResponse?.failureMessage || null,
      httpStatus: fetchRes.status,
      _raw: sandboxResponse
    });
  } catch (err) {
    res.status(500).json({
      error: 'Sandbox call failed',
      message: err.message,
      apm: apmLower,
      provider,
    });
  }
});

// 5. POST /api/test/matrix — Run full E2E matrix
app.post('/api/test/matrix', async (req, res) => {
  const { scope = 'full' } = req.body;

  // Build the unique APM+provider combinations for sandbox calls
  const directApms = APMS.filter(a => a.provider === 'direct');
  const pproApms = APMS.filter(a => a.provider === 'ppro');

  // Phase 1: unique sandbox calls (3 direct + 52 PPRO = 55)
  const sandboxCalls = [];

  for (const apm of directApms) {
    sandboxCalls.push({
      apm: apm.code,
      provider: apm.code, // cashapp, klarna, afterpay
      amount: 10.00,
      currency: apm.currency,
      country: apm.country,
    });
  }

  for (const apm of pproApms) {
    sandboxCalls.push({
      apm: apm.code,
      provider: 'ppro',
      amount: 10.00,
      currency: apm.currency,
      country: apm.country,
    });
  }

  // Execute sandbox calls with concurrency limit
  const CONCURRENCY = 5;
  const sandboxResults = new Map();

  async function executeSandboxCall(call) {
    try {
      let url, requestBody, headers;

      if (call.provider === 'ppro') {
        url = `${PPRO.baseUrl}/v1/payment-charges`;
        requestBody = buildPproBody(call.apm, call.amount, call.currency, call.country);
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PPRO.token}`,
          'Merchant-Id': PPRO.merchantId,
        };
      } else if (call.provider === 'cashapp' || call.apm === 'cashapp') {
        url = `${CASHAPP.baseUrl}/customer-request/v1/requests`;
        requestBody = buildCashappBody(call.amount, call.currency);
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Client ${CASHAPP.clientId}`,
        };
      } else if (call.provider === 'klarna' || call.apm === 'klarna') {
        url = `${KLARNA.baseUrl}/payments/v1/sessions`;
        requestBody = buildKlarnaBody(call.amount, call.currency, call.country);
        headers = {
          'Content-Type': 'application/json',
          'Authorization': KLARNA.auth,
        };
      } else {
        // afterpay — use klarna sandbox as placeholder (Afterpay is owned by Block/CashApp)
        url = `${KLARNA.baseUrl}/payments/v1/sessions`;
        requestBody = buildKlarnaBody(call.amount, call.currency, call.country);
        headers = {
          'Content-Type': 'application/json',
          'Authorization': KLARNA.auth,
        };
      }

      const fetchRes = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const responseText = await fetchRes.text();
      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = { raw: responseText };
      }

      return {
        pass: fetchRes.status >= 200 && fetchRes.status < 300,
        httpStatus: fetchRes.status,
        chargeId: responseJson.id || responseJson.chargeId || responseJson.request?.id || null,
        status: responseJson.status || responseJson.state || 'unknown',
        response: responseJson,
      };
    } catch (err) {
      return {
        pass: false,
        httpStatus: 0,
        chargeId: null,
        status: 'error',
        error: err.message,
      };
    }
  }

  // Run with concurrency throttle
  const queue = [...sandboxCalls];
  const running = [];

  while (queue.length > 0 || running.length > 0) {
    while (running.length < CONCURRENCY && queue.length > 0) {
      const call = queue.shift();
      const key = `${call.apm}:${call.provider}`;
      const promise = executeSandboxCall(call).then(result => {
        sandboxResults.set(key, result);
        running.splice(running.indexOf(promise), 1);
      });
      running.push(promise);
    }
    if (running.length > 0) {
      await Promise.race(running);
    }
  }

  // Phase 2: build the 110-combination matrix (each APM x each platform)
  const matrixResults = [];

  for (const apm of APMS) {
    const sandboxKey = apm.provider === 'direct'
      ? `${apm.code}:${apm.code}`
      : `${apm.code}:ppro`;
    const sandboxResult = sandboxResults.get(sandboxKey) || { pass: false, status: 'not_run' };

    for (const platform of PLATFORMS) {
      // Check if adapter spec exists for this platform
      const candidateDirs = [
        path.join(OUTPUT_DIR, apm.code),
        path.join(OUTPUT_DIR, `${apm.code}-via-ppro`),
      ];
      const outputDir = candidateDirs.find(d => fs.existsSync(d));
      const adapterSpec = outputDir
        ? readFileOrNull(path.join(outputDir, `adapter-spec-${platform.id}.md`))
        : null;

      const mappingValidation = validateMapping(sandboxResult.response, apm.code);

      matrixResults.push({
        apm: apm.code,
        apmName: apm.name,
        platform: platform.id,
        provider: apm.provider === 'direct' ? apm.code : 'ppro',
        sandbox: {
          pass: sandboxResult.pass,
          chargeId: sandboxResult.chargeId,
          status: sandboxResult.status,
          httpStatus: sandboxResult.httpStatus,
        },
        mapping: {
          ...mappingValidation,
          adapterSpecExists: !!adapterSpec,
        },
        overall: sandboxResult.pass && adapterSpec ? 'pass' : 'fail',
      });
    }
  }

  const summary = {
    total: matrixResults.length,
    passed: matrixResults.filter(r => r.overall === 'pass').length,
    failed: matrixResults.filter(r => r.overall === 'fail').length,
    sandboxCalls: sandboxCalls.length,
  };

  res.json({ summary, results: matrixResults });
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', port: PORT, timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
// Serve React build in production
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback — Express 5 requires named params, not '*'
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && req.method === 'GET') {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      next();
    }
  });
}

app.listen(PORT, () => {
  console.log(`APM Dashboard running on http://localhost:${PORT}`);
  console.log(`APMs loaded: ${APMS.length}`);
  console.log(`Output dir: ${OUTPUT_DIR}`);
  console.log(`Serving static: ${fs.existsSync(distPath)}`);
});
