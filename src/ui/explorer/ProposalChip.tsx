// Phones: the canvas owns every touch in the explorer, so the way on to the proposal is a chip next to the back chip.
import { scrollToProposal } from '../nav';
import { ChevronDownIcon } from './icons';

export function ProposalChip({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={scrollToProposal}
      aria-label="Continue to the proposal"
      data-label-obstacle
      className={`glass explorer-chip pointer-events-auto flex min-h-11 items-center gap-1.5 rounded-full pl-4 pr-3.5 text-[13px] font-medium ${className}`}
    >
      Proposal
      <ChevronDownIcon size={15} />
    </button>
  );
}
