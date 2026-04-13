/**
 * Auto-registration of all 55 APM adapters into the global registry.
 *
 * Import this file to make all adapters available via createCheckout({ apm: '...' }).
 * Adapters are registered lazily — the adapter code runs on import but SDK loading
 * only happens when init() is called.
 */
import { globalRegistry } from './core/adapter-registry.js';
// --- Direct-integration adapters (14) ---
import { klarnaAdapter } from './adapters/klarna-adapter.js';
import { cashappAdapter } from './adapters/cashapp-adapter.js';
import { afterpayAdapter } from './adapters/afterpay-adapter.js';
import { alipayplusAdapter } from './adapters/alipayplus-adapter.js';
import { wechatpayAdapter } from './adapters/wechatpay-adapter.js';
import { grabpayAdapter } from './adapters/grabpay-adapter.js';
import { paypalAdapter } from './adapters/paypal-adapter.js';
import { applepayAdapter } from './adapters/applepay-adapter.js';
import { googlepayAdapter } from './adapters/googlepay-adapter.js';
import { affirmAdapter } from './adapters/affirm-adapter.js';
import { venmoAdapter } from './adapters/venmo-adapter.js';
import { sezzleAdapter } from './adapters/sezzle-adapter.js';
import { zipAdapter } from './adapters/zip-adapter.js';
import { tabapayAdapter } from './adapters/tabapay-adapter.js';
import { paypalPaylaterAdapter } from './adapters/paypal-paylater-adapter.js';
import { zeptoAdapter } from './adapters/zepto-adapter.js';
// --- PPRO-routed adapters: Europe (16) ---
import { idealAdapter } from './adapters/ideal-adapter.js';
import { bancontactAdapter } from './adapters/bancontact-adapter.js';
import { epsAdapter } from './adapters/eps-adapter.js';
import { blikAdapter } from './adapters/blik-adapter.js';
import { trustlyAdapter } from './adapters/trustly-adapter.js';
import { weroAdapter } from './adapters/wero-adapter.js';
import { sofortAdapter } from './adapters/sofort-adapter.js';
import { giropayAdapter } from './adapters/giropay-adapter.js';
import { przelewy24Adapter } from './adapters/przelewy24-adapter.js';
import { postfinanceAdapter } from './adapters/postfinance-adapter.js';
import { mbwayAdapter } from './adapters/mbway-adapter.js';
import { swishAdapter } from './adapters/swish-adapter.js';
import { vippsAdapter } from './adapters/vipps-adapter.js';
import { mobilepayAdapter } from './adapters/mobilepay-adapter.js';
import { twintAdapter } from './adapters/twint-adapter.js';
import { multibancoAdapter } from './adapters/multibanco-adapter.js';
// --- PPRO-routed adapters: LATAM (10) ---
import { speiAdapter } from './adapters/spei-adapter.js';
import { pseAdapter } from './adapters/pse-adapter.js';
import { webpayAdapter } from './adapters/webpay-adapter.js';
import { mercadopagoAdapter } from './adapters/mercadopago-adapter.js';
import { pixAdapter } from './adapters/pix-adapter.js';
import { boletoAdapter } from './adapters/boleto-adapter.js';
import { oxxoAdapter } from './adapters/oxxo-adapter.js';
import { efectyAdapter } from './adapters/efecty-adapter.js';
import { rapipagoAdapter } from './adapters/rapipago-adapter.js';
import { pagoefectivoAdapter } from './adapters/pagoefectivo-adapter.js';
// --- PPRO-routed adapters: APAC (12) ---
import { paynowAdapter } from './adapters/paynow-adapter.js';
import { gcashAdapter } from './adapters/gcash-adapter.js';
import { mayaAdapter } from './adapters/maya-adapter.js';
import { linepayAdapter } from './adapters/linepay-adapter.js';
import { kakaopayAdapter } from './adapters/kakaopay-adapter.js';
import { danaAdapter } from './adapters/dana-adapter.js';
import { ovoAdapter } from './adapters/ovo-adapter.js';
import { shopeepayAdapter } from './adapters/shopeepay-adapter.js';
import { touchngoAdapter } from './adapters/touchngo-adapter.js';
import { alipayPproAdapter } from './adapters/alipay-ppro-adapter.js';
import { paypayAdapter } from './adapters/paypay-adapter.js';
import { upiAdapter } from './adapters/upi-adapter.js';
import { konbiniAdapter } from './adapters/konbini-adapter.js';
// Register all adapters
const allAdapters = [
    // Direct-integration (16)
    klarnaAdapter, cashappAdapter, afterpayAdapter, alipayplusAdapter,
    wechatpayAdapter, grabpayAdapter, paypalAdapter, paypalPaylaterAdapter, applepayAdapter,
    googlepayAdapter, affirmAdapter, venmoAdapter, sezzleAdapter,
    zipAdapter, tabapayAdapter, zeptoAdapter,
    // PPRO Europe (16)
    idealAdapter, bancontactAdapter, epsAdapter, blikAdapter,
    trustlyAdapter, weroAdapter, sofortAdapter, giropayAdapter,
    przelewy24Adapter, postfinanceAdapter, mbwayAdapter, swishAdapter,
    vippsAdapter, mobilepayAdapter, twintAdapter, multibancoAdapter,
    // PPRO LATAM (10)
    speiAdapter, pseAdapter, webpayAdapter, mercadopagoAdapter,
    pixAdapter, boletoAdapter, oxxoAdapter, efectyAdapter,
    rapipagoAdapter, pagoefectivoAdapter,
    // PPRO APAC (12)
    paynowAdapter, gcashAdapter, mayaAdapter, linepayAdapter,
    kakaopayAdapter, danaAdapter, ovoAdapter, shopeepayAdapter,
    touchngoAdapter, alipayPproAdapter, paypayAdapter, upiAdapter,
    konbiniAdapter,
];
for (const adapter of allAdapters) {
    globalRegistry.register(adapter);
}
export const REGISTERED_COUNT = allAdapters.length;
export { allAdapters };
//# sourceMappingURL=register-all.js.map