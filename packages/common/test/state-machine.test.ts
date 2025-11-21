import { describe, test, expect } from 'bun:test';
import { canTransition, mapPaymentStatusToPledge, VALID_TRANSITIONS } from '../src/state-machine';

describe('Pledge State Machine', () => {
  describe('canTransition', () => {
    test('allows PENDING to AUTHORIZED', () => {
      expect(canTransition('PENDING', 'AUTHORIZED')).toBe(true);
    });

    test('allows PENDING to CAPTURED (skip AUTHORIZED)', () => {
      expect(canTransition('PENDING', 'CAPTURED')).toBe(true);
    });

    test('allows PENDING to FAILED', () => {
      expect(canTransition('PENDING', 'FAILED')).toBe(true);
    });

    test('allows AUTHORIZED to CAPTURED', () => {
      expect(canTransition('AUTHORIZED', 'CAPTURED')).toBe(true);
    });

    test('allows AUTHORIZED to FAILED', () => {
      expect(canTransition('AUTHORIZED', 'FAILED')).toBe(true);
    });

    test('prevents CAPTURED to AUTHORIZED (backward transition)', () => {
      expect(canTransition('CAPTURED', 'AUTHORIZED')).toBe(false);
    });

    test('prevents CAPTURED to PENDING (backward transition)', () => {
      expect(canTransition('CAPTURED', 'PENDING')).toBe(false);
    });

    test('prevents FAILED to any other state (terminal)', () => {
      expect(canTransition('FAILED', 'PENDING')).toBe(false);
      expect(canTransition('FAILED', 'AUTHORIZED')).toBe(false);
      expect(canTransition('FAILED', 'CAPTURED')).toBe(false);
    });

    test('allows same state transition (idempotent)', () => {
      expect(canTransition('PENDING', 'PENDING')).toBe(true);
      expect(canTransition('AUTHORIZED', 'AUTHORIZED')).toBe(true);
      expect(canTransition('CAPTURED', 'CAPTURED')).toBe(true);
      expect(canTransition('FAILED', 'FAILED')).toBe(true);
    });
  });

  describe('mapPaymentStatusToPledge', () => {
    test('maps "authorized" to AUTHORIZED', () => {
      expect(mapPaymentStatusToPledge('authorized')).toBe('AUTHORIZED');
    });

    test('maps "succeeded" to CAPTURED', () => {
      expect(mapPaymentStatusToPledge('succeeded')).toBe('CAPTURED');
    });

    test('maps "captured" to CAPTURED', () => {
      expect(mapPaymentStatusToPledge('captured')).toBe('CAPTURED');
    });

    test('maps "failed" to FAILED', () => {
      expect(mapPaymentStatusToPledge('failed')).toBe('FAILED');
    });

    test('maps "declined" to FAILED', () => {
      expect(mapPaymentStatusToPledge('declined')).toBe('FAILED');
    });

    test('maps "cancelled" to FAILED', () => {
      expect(mapPaymentStatusToPledge('cancelled')).toBe('FAILED');
    });

    test('maps unknown status to PENDING', () => {
      expect(mapPaymentStatusToPledge('unknown')).toBe('PENDING');
    });
  });

  describe('VALID_TRANSITIONS', () => {
    test('CAPTURED is a terminal state', () => {
      expect(VALID_TRANSITIONS.CAPTURED).toEqual([]);
    });

    test('FAILED is a terminal state', () => {
      expect(VALID_TRANSITIONS.FAILED).toEqual([]);
    });

    test('PENDING can transition to AUTHORIZED, CAPTURED, or FAILED', () => {
      expect(VALID_TRANSITIONS.PENDING).toContain('AUTHORIZED');
      expect(VALID_TRANSITIONS.PENDING).toContain('CAPTURED');
      expect(VALID_TRANSITIONS.PENDING).toContain('FAILED');
    });
  });
});
