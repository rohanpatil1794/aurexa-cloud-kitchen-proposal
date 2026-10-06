// Helpers shared by every kind builder. The group files (prepKit, productionParts, supportKit, peopleShared) keep
// only what is specific to their rooms; anything two groups need lives here.
import * as THREE from 'three';
import type { EquipItem } from '../../../data/types';

/** Numeric item prop with a fallback. */
export const num = (it: EquipItem, key: string, fallback: number): number => {
  const v = it.props?.[key];
  return typeof v === 'number' ? v : fallback;
};

/** String item prop with a fallback. */
export const str = (it: EquipItem, key: string, fallback: string): string => {
  const v = it.props?.[key];
  return typeof v === 'string' ? v : fallback;
};

/** Near-black ink for trims, plates and sign backs; and a true black for lenses and cables. */
export const INK = '#2b3236';
export const BLACK = '#14181b';
/** Mid slate for plinths and device bodies: CHARCOAL turns black in shade, this stays a readable dark grey. */
export const SLATE = '#4d5a61';

const _a = new THREE.Color();
const _b = new THREE.Color();

/** Mix colour `c` towards white (t > 0) or black (t < 0) by |t|. */
export function tint(c: string, t: number): string {
  _a.set(c);
  return `#${_a.lerp(_b.set(t > 0 ? '#ffffff' : '#000000'), Math.abs(t)).getHexString()}`;
}
