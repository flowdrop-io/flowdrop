/**
 * Error Handling Utilities
 *
 * @module utils/errors
 */

/**
 * Normalize an unknown caught value into an Error instance.
 *
 * Use in catch blocks where the error type is `unknown`:
 * ```typescript
 * try { ... } catch (error) {
 *   const err = normalizeError(error);
 *   logger.error(err.message);
 * }
 * ```
 *
 * @param error - The caught value (may be Error, string, or anything)
 * @returns An Error instance with a meaningful message
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error);
  }
  return new Error(String(error));
}

/**
 * Extract a human-readable message from an unknown error.
 *
 * @param error - The caught value
 * @param fallback - Fallback message if error has no useful info
 * @returns A string message
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Unknown error",
): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}
