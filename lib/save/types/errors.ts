/**
 * Error Types
 *
 * Phase 1: Core Infrastructure
 * Custom error classes for the save system
 */

import type { ConflictInfo, SyncErrorCode as SyncErrorCodeType } from "./sync-state";

// Re-export SyncErrorCode from sync-state for convenience
export type { SyncErrorCodeType as SyncErrorCode };

/**
 * Base save error
 */
export class SaveError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = "SaveError";
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }
}

/**
 * Validation errors
 */
export class ValidationError extends SaveError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message, "VALIDATION_ERROR", true);
    this.name = "ValidationError";
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      field: this.field,
      value: this.value,
    };
  }
}

/**
 * Storage errors
 */
export class StorageError extends SaveError {
  constructor(
    message: string,
    public readonly operation: "read" | "write" | "delete" | "list"
  ) {
    super(message, "STORAGE_ERROR", true);
    this.name = "StorageError";
  }
}

/**
 * Sync errors
 */
export class SaveSyncError extends SaveError {
  constructor(
    message: string,
    public readonly code: SyncErrorCodeType,
    recoverable: boolean = true
  ) {
    super(message, "SYNC_ERROR", recoverable);
    this.name = "SaveSyncError";
  }
}

/**
 * Conflict errors
 */
export class ConflictError extends SaveError {
  constructor(
    public readonly conflictInfo: ConflictInfo
  ) {
    super("Save conflict detected", "CONFLICT_ERROR", true);
    this.name = "ConflictError";
  }
}

/**
 * Authentication errors
 */
export class AuthError extends SaveError {
  constructor(message: string) {
    super(message, "AUTH_ERROR", false);
    this.name = "AuthError";
  }
}

/**
 * Migration errors
 */
export class MigrationError extends SaveError {
  constructor(
    message: string,
    public readonly fromVersion?: string,
    public readonly toVersion?: string
  ) {
    super(message, "MIGRATION_ERROR", true);
    this.name = "MigrationError";
  }
}

/**
 * Result type for operations
 */
export type SaveResult<T> =
  | { success: true; data: T }
  | { success: false; error: SaveError };

/**
 * Create success result
 */
export function successResult<T>(data: T): SaveResult<T> {
  return { success: true, data };
}

/**
 * Create failure result
 */
export function failureResult<T>(error: SaveError): SaveResult<T> {
  return { success: false, error };
}

/**
 * Check if result is successful
 */
export function isSuccess<T>(result: SaveResult<T>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Check if result is failure
 */
export function isFailure<T>(result: SaveResult<T>): result is { success: false; error: SaveError } {
  return result.success === false;
}

/**
 * Unwrap result or throw
 */
export function unwrapResult<T>(result: SaveResult<T>): T {
  if (isFailure(result)) {
    throw result.error;
  }
  return result.data;
}

/**
 * Map result to different type
 */
export function mapResult<T, U>(
  result: SaveResult<T>,
  mapper: (data: T) => U
): SaveResult<U> {
  if (isFailure(result)) {
    return result;
  }
  return { success: true, data: mapper(result.data) };
}

/**
 * Flatten nested results
 */
export function flattenResult<T>(result: SaveResult<SaveResult<T>>): SaveResult<T> {
  if (isFailure(result)) {
    return result;
  }
  return result.data;
}
