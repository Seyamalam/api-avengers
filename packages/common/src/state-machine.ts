// State Machine for Pledge Status
export type PledgeStatus = 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED';

export const VALID_TRANSITIONS: Record<PledgeStatus, PledgeStatus[]> = {
  PENDING: ['AUTHORIZED', 'CAPTURED', 'FAILED'], // Can skip AUTHORIZED for some providers
  AUTHORIZED: ['CAPTURED', 'FAILED'],
  CAPTURED: [], // Terminal state
  FAILED: [], // Terminal state
};

export function isValidTransition(from: PledgeStatus, to: PledgeStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function canTransition(currentStatus: string, newStatus: string): boolean {
  // Type guard
  if (!isValidPledgeStatus(currentStatus) || !isValidPledgeStatus(newStatus)) {
    return false;
  }
  
  // Same status is always ok (idempotent)
  if (currentStatus === newStatus) {
    return true;
  }
  
  return isValidTransition(currentStatus as PledgeStatus, newStatus as PledgeStatus);
}

function isValidPledgeStatus(status: string): status is PledgeStatus {
  return ['PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED'].includes(status);
}

// Map payment provider status to internal pledge status
export function mapPaymentStatusToPledge(paymentStatus: string): PledgeStatus {
  switch (paymentStatus) {
    case 'authorized':
      return 'AUTHORIZED';
    case 'succeeded':
    case 'captured':
      return 'CAPTURED';
    case 'failed':
    case 'declined':
    case 'cancelled':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}
