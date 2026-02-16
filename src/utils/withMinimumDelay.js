/** Minimum loader delay in ms. Change this single value to update loader time app-wide. */
export const LOADER_MIN_DELAY_MS = 250

/**
 * Runs an async operation and ensures at least LOADER_MIN_DELAY_MS pass before resolving.
 * Use for consistent loader visibility across the app.
 * @param {Promise|(() => Promise)} promiseOrFn - A promise or async function to run
 * @param {number} [ms=LOADER_MIN_DELAY_MS] - Minimum delay in milliseconds
 * @returns {Promise} Resolves with the result of the operation after the delay
 */
export async function withMinimumDelay(promiseOrFn, ms = LOADER_MIN_DELAY_MS) {
  const promise = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn
  const [result] = await Promise.all([
    promise,
    new Promise((resolve) => setTimeout(resolve, ms)),
  ])
  return result
}
