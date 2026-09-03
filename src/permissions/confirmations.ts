/**
 * In-memory confirmation store.
 *
 * Confirmations are ephemeral by design: they live in a module-level Map, are
 * never persisted (no localStorage, no database, no network) and expire.
 * Approval must be explicit and must reference a specific pending id — a vague
 * "okay" in chat can never approve anything.
 */

import type { CapabilityId } from "@/capabilities/types";

export const CONFIRMATION_TTL_MS = 2 * 60 * 1000;

export type ConfirmationStatus = "pending_confirmation" | "approved" | "denied" | "expired";

export type PendingConfirmation = {
  id: string;
  capability: CapabilityId;
  /** Human-readable description of exactly what will happen if approved. */
  description: string;
  /** Metadata about the request (paths, query…). Never executed by this layer. */
  metadata: Record<string, unknown>;
  createdAt: number;
  expiresAt: number;
  status: ConfirmationStatus;
};

const pending = new Map<string, PendingConfirmation>();

let counter = 0;
function nextId(): string {
  counter += 1;
  return `conf_${Date.now().toString(36)}_${counter}`;
}

export function requestConfirmation(input: {
  capability: CapabilityId;
  description: string;
  metadata?: Record<string, unknown>;
  ttlMs?: number;
  now?: number;
}): PendingConfirmation {
  const now = input.now ?? Date.now();
  const record: PendingConfirmation = {
    id: nextId(),
    capability: input.capability,
    description: input.description,
    metadata: input.metadata ?? {},
    createdAt: now,
    expiresAt: now + (input.ttlMs ?? CONFIRMATION_TTL_MS),
    status: "pending_confirmation",
  };
  pending.set(record.id, record);
  return record;
}

function settle(record: PendingConfirmation, now: number): PendingConfirmation {
  if (record.status === "pending_confirmation" && now >= record.expiresAt) {
    record.status = "expired";
  }
  return record;
}

export function getConfirmation(id: string, now = Date.now()): PendingConfirmation | undefined {
  const record = pending.get(id);
  return record ? settle(record, now) : undefined;
}

/** Explicit approval of ONE specific pending confirmation. */
export function approveConfirmation(id: string, now = Date.now()): PendingConfirmation | undefined {
  const record = getConfirmation(id, now);
  if (!record || record.status !== "pending_confirmation") return record;
  record.status = "approved";
  return record;
}

export function denyConfirmation(id: string, now = Date.now()): PendingConfirmation | undefined {
  const record = getConfirmation(id, now);
  if (!record || record.status !== "pending_confirmation") return record;
  record.status = "denied";
  return record;
}

/** True only for an explicitly approved, non-expired confirmation of that capability. */
export function isApproved(
  id: string | undefined,
  capability: CapabilityId,
  now = Date.now(),
): boolean {
  if (!id) return false;
  const record = getConfirmation(id, now);
  return !!record && record.status === "approved" && record.capability === capability;
}

export function listConfirmations(now = Date.now()): readonly PendingConfirmation[] {
  return [...pending.values()].map((r) => settle(r, now));
}

export function clearConfirmations() {
  pending.clear();
}

/** Drop expired/settled records. Safe to call at any time. */
export function pruneConfirmations(now = Date.now()) {
  for (const [id, record] of pending) {
    if (settle(record, now).status !== "pending_confirmation") pending.delete(id);
  }
}
