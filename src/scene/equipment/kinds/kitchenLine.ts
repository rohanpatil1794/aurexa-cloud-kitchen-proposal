// Kind builders for the "kitchenLine" group: exhaust hood + ducts, the back cooking line, the wok station and
// the gas pipeline. Builders live in kitchenLineHood.ts, kitchenLineAppliances.ts and kitchenLineGas.ts.
import { registerKinds } from '../registry';
import { APPLIANCE_KINDS } from './kitchenLineAppliances';
import { GAS_KINDS } from './kitchenLineGas';
import { HOOD_KINDS } from './kitchenLineHood';

registerKinds({ ...HOOD_KINDS, ...APPLIANCE_KINDS, ...GAS_KINDS });
