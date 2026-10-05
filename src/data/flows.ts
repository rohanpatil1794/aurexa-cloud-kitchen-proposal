// STUB — owner: M4 layers agent. Four workflows as polylines in (x, z). See types.ts Flow.
import type { Flow, FlowId } from './types';

export const FLOWS: Flow[] = [];
export const FLOW_BY_ID = Object.fromEntries(FLOWS.map((f) => [f.id, f])) as Partial<Record<FlowId, Flow>>;
