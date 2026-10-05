// Kind builders for the "support" equipment group (Waste, Dishwashing, Lockers, Electrical, Toilets, Exit Lobby, Fire
// Stair, Passenger Lift). Kind names are prefixed `support.`.
import { registerKinds } from '../registry';
import { circulationKinds } from './supportCirculation';
import { dishKinds } from './supportDish';
import { elecKinds } from './supportElec';
import { exitKinds } from './supportExit';
import { staffKinds } from './supportStaff';
import { toiletKinds } from './supportToilets';
import { wasteKinds } from './supportWaste';

registerKinds({ ...wasteKinds, ...dishKinds, ...staffKinds, ...elecKinds, ...toiletKinds, ...exitKinds, ...circulationKinds });
