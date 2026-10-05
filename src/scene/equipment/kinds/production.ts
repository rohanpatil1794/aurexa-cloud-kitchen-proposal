// Kind builders for the "production" equipment group: Bakery, Receiving, Goods Lift, Dessert, Packing & QC, Dispatch.
import { registerKinds } from '../registry';
import { BAKERY_KINDS } from './productionBakery';
import { DESSERT_KINDS } from './productionDessert';
import { DISPATCH_KINDS } from './productionDispatch';
import { PACK_KINDS } from './productionPack';
import { RECEIVING_KINDS } from './productionReceiving';

registerKinds({ ...BAKERY_KINDS, ...RECEIVING_KINDS, ...DESSERT_KINDS, ...PACK_KINDS, ...DISPATCH_KINDS });
