import type { EquipItem } from '../types';
import { KITCHEN_LINE_EQUIPMENT } from './kitchenLine';
import { KITCHEN_ISLANDS_EQUIPMENT } from './kitchenIslands';
import { PREP_EQUIPMENT } from './prep';
import { PRODUCTION_EQUIPMENT } from './production';
import { SUPPORT_EQUIPMENT } from './support';
import { PEOPLE_EQUIPMENT } from './people';

export const EQUIPMENT: EquipItem[] = [
  ...KITCHEN_LINE_EQUIPMENT,
  ...KITCHEN_ISLANDS_EQUIPMENT,
  ...PREP_EQUIPMENT,
  ...PRODUCTION_EQUIPMENT,
  ...SUPPORT_EQUIPMENT,
  ...PEOPLE_EQUIPMENT,
];

export const equipmentOf = (room: string) => EQUIPMENT.filter((e) => e.room === room);
