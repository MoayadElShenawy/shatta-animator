/**
 * In-memory confirmation store.
 *
 * Confirmations are ephemeral by design: they live in a module-level Map, are
 * never persisted (no localStorage, no database, no network) and expire.
 * Approval must be explicit and must reference a specific pending id — a vague
 * "okay" in chat can never approve anything. When a confirmation carries a
 * `target`, approval only counts for that exact target.
 */

import type { CapabilityId } from "@/capabilities/types";

export const CONFIRMATION_TTL_MS = 2 * 60 * 1000;

export type ConfirmationStatus = "pending_confirmation" | "approved" | "denied" | "expired";

export type PendingConfirmation = {
  id: string;
  capability: CapabilityId;
  /** Human-readable description of exactly what will happen if approved. */
  description: string;
  /** Stable key of the exact operation (e.g. "desktop:file.pdf"), if known. */
  target?: string;
  /** True when the operation cannot be undone. Drives the UI warning. */
  destructive?: boolean;
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
  target?: string | null;
  destructive?: boolean;
  metadata?: Record<string, unknown>;
  ttlMs?: number;
  now?: number;
}): PendingConfirmation {
  const now = input.now ?? Date.now();
  const record: PendingConfirmation = {
    id: nextId(),
    capability: input.capability,
    description: input.description,
    ...(input.target ? { target: input.target } : {}),
    ...(input.destructive !== undefined ? { destructive: input.destructive } : {}),
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

/**
 * True only for an explicitly approved, non-expired confirmation of that
 * capability. When the confirmation was bound to a target, the caller must
 * present the same target — a confirmation for one file can never authorize
 * an operation on another.
 */
export function isApproved(
  id: string | undefined,
  capability: CapabilityId,
  now = Date.now(),
  target?: string | null,
): boolean {
  if (!id) return false;
  const record = getConfirmation(id, now);
  if (!record || record.status !== "approved" || record.capability !== capability) return false;
  if (record.target !== undefined) return !!target && record.target === target;
  return true;
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
