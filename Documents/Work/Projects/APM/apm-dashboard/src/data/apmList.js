export const REGIONS = ['Europe', 'LATAM', 'APAC', 'Global'];
export const CAPABILITIES = ['auth', 'capture', 'refund', 'partial-refund', 'cancel', 'void'];

// Direct integrations — these have their own SDK/adapter and go through CommerceHub directly
export const DIRECT_PROVIDERS = [
  'CASHAPP', 'KLARNA', 'AFTERPAY', 'AFFIRM', 'PAYPAL', 'PAYPAL_PAYLATER',
  'VENMO', 'APPLEPAY', 'GOOGLEPAY', 'SEZZLE', 'ZIP', 'TABAPAY',
  'ALIPAY', 'ALIPAYPLUS', 'WECHATPAY', 'GRABPAY', 'ZEPTO'
];

export const APMS = [
  // ======================== EUROPE (16) — All via PPRO ========================
  {name:'iDEAL',code:'IDEAL',region:'Europe',country:'NL',currency:'EUR',pattern:'bank-redirect',provider:'ppro'},
  {name:'Bancontact',code:'BANCONTACT',region:'Europe',country:'BE',currency:'EUR',pattern:'bank-redirect',provider:'ppro'},
  {name:'EPS',code:'EPS',region:'Europe',country:'AT',currency:'EUR',pattern:'bank-redirect',provider:'ppro'},
  {name:'BLIK',code:'BLIK',region:'Europe',country:'PL',currency:'PLN',pattern:'bank-redirect',provider:'ppro'},
  {name:'Multibanco',code:'MULTIBANCO',region:'Europe',country:'PT',currency:'EUR',pattern:'voucher-cash',provider:'ppro'},
  {name:'MB Way',code:'MBWAY',region:'Europe',country:'PT',currency:'EUR',pattern:'redirect-wallet',provider:'ppro'},
  {name:'Trustly',code:'TRUSTLY',region:'Europe',country:'DE',currency:'EUR',pattern:'bank-redirect',provider:'ppro'},
  {name:'Wero',code:'WERO',region:'Europe',country:'DE',currency:'EUR',pattern:'bank-redirect',provider:'ppro'},
  {name:'Sofort',code:'SOFORT',region:'Europe',country:'DE',currency:'EUR',pattern:'bank-redirect',provider:'ppro'},
  {name:'Giropay',code:'GIROPAY',region:'Europe',country:'DE',currency:'EUR',pattern:'bank-redirect',provider:'ppro'},
  {name:'Przelewy24',code:'PRZELEWY24',region:'Europe',country:'PL',currency:'PLN',pattern:'bank-redirect',provider:'ppro'},
  {name:'Swish',code:'SWISH',region:'Europe',country:'SE',currency:'SEK',pattern:'redirect-wallet',provider:'ppro'},
  {name:'Vipps',code:'VIPPS',region:'Europe',country:'NO',currency:'NOK',pattern:'redirect-wallet',provider:'ppro'},
  {name:'MobilePay',code:'MOBILEPAY',region:'Europe',country:'DK',currency:'DKK',pattern:'redirect-wallet',provider:'ppro'},
  {name:'PostFinance',code:'POSTFINANCE',region:'Europe',country:'CH',currency:'CHF',pattern:'bank-redirect',provider:'ppro'},
  {name:'TWINT',code:'TWINT',region:'Europe',country:'CH',currency:'CHF',pattern:'qr-code',provider:'ppro'},

  // ======================== LATAM (10) — All via PPRO ========================
  {name:'Pix',code:'PIX',region:'LATAM',country:'BR',currency:'BRL',pattern:'qr-code',provider:'ppro'},
  {name:'Boleto',code:'BOLETO',region:'LATAM',country:'BR',currency:'BRL',pattern:'voucher-cash',provider:'ppro'},
  {name:'OXXO',code:'OXXO',region:'LATAM',country:'MX',currency:'MXN',pattern:'voucher-cash',provider:'ppro'},
  {name:'SPEI',code:'SPEI',region:'LATAM',country:'MX',currency:'MXN',pattern:'bank-redirect',provider:'ppro'},
  {name:'PSE',code:'PSE',region:'LATAM',country:'CO',currency:'COP',pattern:'bank-redirect',provider:'ppro'},
  {name:'Efecty',code:'EFECTY',region:'LATAM',country:'CO',currency:'COP',pattern:'voucher-cash',provider:'ppro'},
  {name:'Mercado Pago',code:'MERCADOPAGO',region:'LATAM',country:'AR',currency:'ARS',pattern:'redirect-wallet',provider:'ppro'},
  {name:'RapiPago',code:'RAPIPAGO',region:'LATAM',country:'AR',currency:'ARS',pattern:'voucher-cash',provider:'ppro'},
  {name:'PagoEfectivo',code:'PAGOEFECTIVO',region:'LATAM',country:'PE',currency:'PEN',pattern:'voucher-cash',provider:'ppro'},
  {name:'Webpay',code:'WEBPAY',region:'LATAM',country:'CL',currency:'CLP',pattern:'bank-redirect',provider:'ppro'},

  // ======================== APAC — Mixed (PPRO + Direct) ========================
  {name:'Alipay (PPRO)',code:'ALIPAY_PPRO',region:'APAC',country:'CN',currency:'CNY',pattern:'qr-code',provider:'ppro'},
  {name:'Alipay+',code:'ALIPAYPLUS',region:'APAC',country:'CN',currency:'CNY',pattern:'qr-code',provider:'direct'},
  {name:'WeChat Pay',code:'WECHATPAY',region:'APAC',country:'CN',currency:'CNY',pattern:'qr-code',provider:'direct'},
  {name:'GrabPay',code:'GRABPAY',region:'APAC',country:'SG',currency:'SGD',pattern:'redirect-wallet',provider:'direct'},
  {name:'PayNow',code:'PAYNOW',region:'APAC',country:'SG',currency:'SGD',pattern:'bank-redirect',provider:'ppro'},
  {name:'GCash',code:'GCASH',region:'APAC',country:'PH',currency:'PHP',pattern:'redirect-wallet',provider:'ppro'},
  {name:'Maya',code:'MAYA',region:'APAC',country:'PH',currency:'PHP',pattern:'redirect-wallet',provider:'ppro'},
  {name:'LINE Pay',code:'LINEPAY',region:'APAC',country:'TH',currency:'THB',pattern:'redirect-wallet',provider:'ppro'},
  {name:'KakaoPay',code:'KAKAOPAY',region:'APAC',country:'KR',currency:'KRW',pattern:'redirect-wallet',provider:'ppro'},
  {name:'DANA',code:'DANA',region:'APAC',country:'ID',currency:'IDR',pattern:'redirect-wallet',provider:'ppro'},
  {name:'OVO',code:'OVO',region:'APAC',country:'ID',currency:'IDR',pattern:'redirect-wallet',provider:'ppro'},
  {name:'ShopeePay',code:'SHOPEEPAY',region:'APAC',country:'ID',currency:'IDR',pattern:'redirect-wallet',provider:'ppro'},
  {name:'Konbini',code:'KONBINI',region:'APAC',country:'JP',currency:'JPY',pattern:'voucher-cash',provider:'ppro'},
  {name:'PayPay',code:'PAYPAY',region:'APAC',country:'JP',currency:'JPY',pattern:'qr-code',provider:'ppro'},
  {name:'UPI',code:'UPI',region:'APAC',country:'IN',currency:'INR',pattern:'qr-code',provider:'ppro'},
  {name:"Touch 'n Go",code:'TOUCHNGO',region:'APAC',country:'MY',currency:'MYR',pattern:'redirect-wallet',provider:'ppro'},
  {name:'Zepto',code:'ZEPTO',region:'APAC',country:'AU',currency:'AUD',pattern:'bank-redirect',provider:'direct'},

  // ======================== GLOBAL — Mostly Direct ========================
  {name:'Klarna',code:'KLARNA',region:'Global',country:'US',currency:'USD',pattern:'server-bnpl',provider:'direct'},
  {name:'PayPal',code:'PAYPAL',region:'Global',country:'US',currency:'USD',pattern:'redirect-wallet',provider:'direct'},
  {name:'PayPal Pay Later',code:'PAYPAL_PAYLATER',region:'Global',country:'US',currency:'USD',pattern:'server-bnpl',provider:'direct'},
  {name:'Cash App',code:'CASHAPP',region:'Global',country:'US',currency:'USD',pattern:'redirect-wallet',provider:'direct'},
  {name:'Venmo',code:'VENMO',region:'Global',country:'US',currency:'USD',pattern:'redirect-wallet',provider:'direct'},
  {name:'Afterpay',code:'AFTERPAY',region:'Global',country:'US',currency:'USD',pattern:'server-bnpl',provider:'direct'},
  {name:'Affirm',code:'AFFIRM',region:'Global',country:'US',currency:'USD',pattern:'server-bnpl',provider:'direct'},
  {name:'Sezzle',code:'SEZZLE',region:'Global',country:'US',currency:'USD',pattern:'server-bnpl',provider:'direct'},
  {name:'Zip',code:'ZIP',region:'Global',country:'US',currency:'USD',pattern:'server-bnpl',provider:'direct'},
  {name:'Apple Pay',code:'APPLEPAY',region:'Global',country:'US',currency:'USD',pattern:'native-wallet',provider:'direct'},
  {name:'Google Pay',code:'GOOGLEPAY',region:'Global',country:'US',currency:'USD',pattern:'native-wallet',provider:'direct'},
  {name:'TabaPay',code:'TABAPAY',region:'Global',country:'US',currency:'USD',pattern:'redirect-wallet',provider:'direct'},
];
