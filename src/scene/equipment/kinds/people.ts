// Kind builders for the "people" group: Indoor Garden, Content Creator Corner, Rider Waiting Area.
import { registerKinds } from '../registry';
import { CREATOR_KINDS } from './peopleCreator';
import { GARDEN_KINDS } from './peopleGarden';
import { RIDER_KINDS } from './peopleRider';
import { SEATING_KINDS } from './peopleSeating';

registerKinds({ ...GARDEN_KINDS, ...CREATOR_KINDS, ...RIDER_KINDS, ...SEATING_KINDS });
