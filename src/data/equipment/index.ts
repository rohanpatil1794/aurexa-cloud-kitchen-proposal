import type { EquipItem } from '../types';
import { KITCHEN_EQUIPMENT } from './kitchen';
import { PREP_EQUIPMENT } from './prep';
import { PRODUCTION_EQUIPMENT } from './production';
import { SUPPORT_EQUIPMENT } from './support';

export const EQUIPMENT: EquipItem[] = [
  ...KITCHEN_EQUIPMENT,
  ...PREP_EQUIPMENT,
  ...PRODUCTION_EQUIPMENT,
  ...SUPPORT_EQUIPMENT,
];

export const equipmentOf = (room: string) => EQUIPMENT.filter((e) => e.room === room);
