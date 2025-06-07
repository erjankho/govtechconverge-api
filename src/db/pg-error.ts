import pg from 'pg';

const { DatabaseError } = pg;

/**
 * Interface for PostgreSQL errors
 *
 * This interface represents errors specific to PostgreSQL.
 * PostgreSQL generates errors with specific codes when violations or exceptions
 * occur within the database constraints, such as foreign key or unique violations.
 * The `PGError` interface is designed to represent these errors, providing details
 * such as the error code and any additional information associated with the error.
 */
export interface PGError extends Error {
  /**
   * The string error code.
   */
  code: string;
  /**
   * The detail of the error.
   */
  detail: string;
}

export function isNonNullConstraint(error: unknown): error is PGError {
  return error instanceof DatabaseError && 'code' in error && error.code === '23502';
}

export function isForeignKeyViolation(error: unknown): error is PGError {
  return error instanceof DatabaseError && 'code' in error && error.code === '23503';
}

export function isUniqueViolation(error: unknown): error is PGError {
  return error instanceof DatabaseError && 'code' in error && error.code === '23505';
}
