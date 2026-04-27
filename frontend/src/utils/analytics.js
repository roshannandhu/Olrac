/**
 * Thin PostHog wrapper — all calls fail silently so tracking
 * never breaks the product.
 */
import posthog from 'posthog-js'

export function track(event, properties = {}) {
  try {
    posthog.capture(event, properties)
  } catch {
    // never throw from tracking
  }
}

export function identifyUser(distinctId, traits = {}) {
  try {
    posthog.identify(distinctId, traits)
  } catch {}
}

export function resetUser() {
  try {
    posthog.reset()
  } catch {}
}
