# Unmappable Fields — Alipay+

## Alipay+ Fields with No Commerce Hub Equivalent

| Alipay+ Field | Type | Context | Resolution |
|---|---|---|---|
| paymentFactor.isInStorePayment | boolean | In-store vs online indicator | Hardcode to false for e-commerce |
| paymentFactor.isCashierPayment | boolean | Cashier payment mode flag | Hardcode to true |
| paymentFactor.presentmentMode | string | Payment presentment mode | Hardcode to "UNIFIED" |
| paymentOptions[].logos[] | array | Wallet brand logos for UI | Pass to merchant for rendering |
| settlementStrategy.settlementCurrency | string | Settlement currency preference | Merchant boarding config |
| order.env.osType | string | Mobile OS type | Not tracked by CH |
| acquirerId | string | Acquirer identifier in Alipay+ network | Informational only |
| guideUrl | string | KYC/wallet recharge page | Not relevant for merchant flow |

## Commerce Hub Fields with No Alipay+ Equivalent

| CH Field | Type | Context | Resolution |
|---|---|---|---|
| merchantDetails.storeId | string | CH store identifier | Not passed — Alipay+ uses referenceMerchantId |
| merchantDetails.terminalId | string | Terminal ID | Not applicable for e-commerce |
| transactionDetails.captureFlag | boolean | Auth vs capture toggle | Not applicable — Alipay+ auto-captures |
| encryptionData | object | Card encryption | Not applicable for wallet payments |
| splitShipment | object | Partial capture metadata | Not applicable — no split capture on wallets |
| deviceFingerprint | array | Device fraud signals | Alipay+ handles fraud detection internally |
| dynamicDescriptors.customerServiceNumber | string | Customer service phone | Not passed to Alipay+ |
