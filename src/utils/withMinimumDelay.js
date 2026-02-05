/**
 * Runs an async operation and ensures at least `ms` milliseconds pass before resolving.
 * Use for consistent loader visibility (e.g. 2 seconds) across the app.
 * @param {Promise|(() => Promise)} promiseOrFn - A promise or async function to run
 * @param {number} [ms=2000] - Minimum delay in milliseconds
 * @returns {Promise} Resolves with the result of the operation after the delay
 */
export async function withMinimumDelay(promiseOrFn, ms = 2000) {
  const promise = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn
  const [result] = await Promise.all([
    promise,
    new Promise((resolve) => setTimeout(resolve, ms)),
  ])
  return result
}
