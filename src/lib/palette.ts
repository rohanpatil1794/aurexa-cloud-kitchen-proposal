import type { FlowId, ZoneId } from '../data/types';

/** Brand palette (palette.png). */
export const BRAND = {
  teal: '#1d6866',
  tealMid: '#5f9392',
  tealLight: '#8cc1c0',
  orange: '#cb622a',
  sand: '#edcb95',
  cream: '#f6e3c2',
  olive: '#8f854a',
  slate: '#77838d',
  steelMid: '#9aa7b2',
  steelLight: '#c7d0d8',
  black: '#000000',
  white: '#ffffff',
} as const;

export const SCENE = {
  stageBg: '#070d0e',
  wall: '#f4f1ea',
  wallCap: '#1d6866',
  floorCream: '#f6e3c2',
  plinth: '#dcd6c8',
  plinthEdge: '#b9b3a4',
  foliageOlive: '#8f854a',
  foliageGreen: '#5f8f4f',
  quarry: '#b98a63',
  brass: '#b08d57',
  stainless: '#c7d0d8',
  stainlessDark: '#9aa7b2',
} as const;

export const ZONE_COLORS: Record<ZoneId, string> = {
  veg: '#5FAE6B',
  jain: '#F2C94C',
  vegan: '#8E5BC2',
  nonveg: '#D64545',
  creator: '#5AA9E6',
};

export const FLOW_COLORS: Record<FlowId, string> = {
  raw: '#1d6866',
  staff: '#8f854a',
  dirty: '#cb622a',
  orders: '#000000',
};

/** Waste bin colours (Waste Management room). */
export const BIN_COLORS = {
  yellow: '#e3b72c',
  green: '#3f9a52',
  teal: '#1d6866',
  blue: '#3a7bc8',
  grey: '#77838d',
  red: '#c93a32',
} as const;

export const SELECT_ORANGE = '#cb622a';
