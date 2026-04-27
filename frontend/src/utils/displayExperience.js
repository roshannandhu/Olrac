export const INTRO_SPLASH_KEY = 'olrac_intro_seen_v3'
export const INTRO_SPLASH_MIN_MS = 3200
export const LOADER_DELAY_MS = 450
export const LOADER_MIN_VISIBLE_MS = 650

export function hasSeenIntroSplash() {
  try {
    return sessionStorage.getItem(INTRO_SPLASH_KEY) === 'true'
  } catch {
    return false
  }
}
