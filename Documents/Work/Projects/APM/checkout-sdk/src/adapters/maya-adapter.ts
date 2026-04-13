import { createPproAdapter } from '../core/ppro-adapter-factory.js';

export const mayaAdapter = createPproAdapter({
  code: 'MAYA',
  displayName: 'Maya',
  country: 'PH',
  currency: 'PHP',
  pattern: 'redirect-wallet',
  brandColor: '#01C853',
  buttonLabel: 'Pay with Maya',
  logoUrl: '/logos/maya.svg',
  authType: 'REDIRECT',
});
