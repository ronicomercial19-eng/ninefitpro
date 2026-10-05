/** Shared contract for new loop implementations. Existing loops are migrated individually.
 * These types are not authorization: every mutation must be validated by its backend.
 */
export type FitproLoopKey = 'profile' | 'pdi' | 'calibration' | 'sync' | 'planning' | 'weekly_training' | 'quick_training' | 'training_adjustment' | 'workout_execution' | 'assistance' | 'nine_lima' | 'nutrition' | 'protocol' | 'progress' | 'content' | 'sharing' | 'ron_task';
export type FitproModuleKey = 'planning' | 'train' | 'nutrition' | 'progress' | 'library' | 'healthflix' | 'staff' | 'ron' | 'habits' | 'move' | 'posture';
export type LoopState = 'preparing' | 'awaiting_approval' | 'approved' | 'executing' | 'confirmed' | 'blocked' | 'failed' | 'cancelled' | 'superseded';
export type LoopActor = { kind: 'athlete' | 'assigned_professional' | 'ron'; userId: string } | { kind: 'system'; jobId: string };
export interface LoopRequest {
  schemaVersion: 1;
  loop: FitproLoopKey;
  athleteId: string;
  actor: LoopActor;
  idempotencyKey: string;
  origin: 'app' | 'chat' | 'module' | 'scheduled_job';
  requestedAt: string;
}
export interface DeliveryReference { id: string; module: FitproModuleKey; revision: number; }
export interface LoopDelivery {
  request: LoopRequest;
  reference: DeliveryReference;
  state: LoopState;
  requiresApproval: boolean;
  approvedRevision: number | null;
  confirmation: { entityId: string; confirmedAt: string } | null;
  failure: { code: string; retryable: boolean } | null;
}
export interface LoopEvent {
  schemaVersion: 1;
  eventId: string;
  requestIdempotencyKey: string;
  athleteId: string;
  loop: FitproLoopKey;
  type: 'prepared' | 'approved' | 'execution_requested' | 'confirmed' | 'blocked' | 'failed' | 'cancelled';
  entityId: string;
  occurredAt: string;
  // Only confirmed domain events may feed these effects; a chat message is not evidence.
  effects: { refresh: FitproModuleKey[]; syncDimensions: string[]; rewardReceiptId: string | null; notificationRequired: boolean };
}

const TRANSITIONS: Record<LoopState, readonly LoopState[]> = {
  preparing: ['awaiting_approval', 'executing', 'blocked', 'failed', 'cancelled'],
  awaiting_approval: ['approved', 'preparing', 'blocked', 'cancelled', 'superseded'],
  approved: ['executing', 'blocked', 'cancelled', 'superseded'],
  executing: ['confirmed', 'blocked', 'failed', 'cancelled'],
  confirmed: ['superseded'], blocked: ['preparing', 'cancelled'],
  failed: ['preparing', 'cancelled'], cancelled: [], superseded: [],
};
export function assertDeliveryTransition(delivery: LoopDelivery, next: LoopState): void {
  if (!TRANSITIONS[delivery.state].includes(next)) throw new Error('invalid_loop_transition');
  if (next === 'executing' && delivery.requiresApproval && delivery.approvedRevision !== delivery.reference.revision) throw new Error('current_revision_approval_required');
  if (next === 'confirmed' && (!delivery.confirmation?.entityId || !delivery.confirmation.confirmedAt || !Number.isFinite(Date.parse(delivery.confirmation.confirmedAt)))) throw new Error('backend_confirmation_required');
}
