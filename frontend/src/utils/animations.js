export const EASE = [0.25, 0.1, 0.25, 1.0]
export const EASE_OUT = [0.0, 0.0, 0.2, 1.0]
export const SPRING_EASE = [0.175, 0.885, 0.32, 1.275]

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3, ease: EASE } },
}

export const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: EASE } },
}

export const slideInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: EASE } },
}

export const slideInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease: EASE } },
}

export const zoomInInitial = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: EASE } },
}

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
}

export const staggerContainerSlow = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.18, delayChildren: 0.1 },
  },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

// 3-D tilt-in from below — for bento cards
export const tiltIn = {
  hidden: { opacity: 0, y: 60, rotateX: 10, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, rotateX: 0, scale: 1,
    transition: { duration: 0.7, ease: EASE },
  },
}

// Cascade for step cards — scale + fade
export const cascadeItem = {
  hidden: { opacity: 0, y: 40, scale: 0.92 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
}

// Blur-to-sharp entrance — cinematic final CTA
export const blurReveal = {
  hidden: { opacity: 0, filter: 'blur(12px)', y: 24 },
  visible: {
    opacity: 1, filter: 'blur(0px)', y: 0,
    transition: { duration: 0.85, ease: EASE },
  },
}

export const cardHover = {
  hover: {
    y: -6,
    transition: { type: 'spring', stiffness: 400, damping: 20 },
  },
  tap: { scale: 0.98 },
}

export const btnBounce = {
  hover: { scale: 1.04, transition: { type: 'spring', stiffness: 400, damping: 12 } },
  tap: { scale: 0.96 },
}

export const sectionReveal = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: EASE },
  },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.75 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 22 },
  },
}

export const float = {
  animate: {
    y: [-8, 8, -8],
    transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
  },
}

export const floatSlow = {
  animate: {
    y: [-14, 14, -14],
    transition: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
  },
}

export const glowPulse = {
  animate: {
    opacity: [0.35, 0.7, 0.35],
    scale: [1, 1.08, 1],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
}

export const morphCard = {
  hidden: { opacity: 0, scale: 0.88, y: 36 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE },
  },
}

export const slideUp = {
  hidden: { opacity: 0, y: 56 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
}

export const revealFromLeft = {
  hidden: { opacity: 0, x: -60, scale: 0.96 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.7, ease: EASE } },
}

export const revealFromRight = {
  hidden: { opacity: 0, x: 60, scale: 0.96 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.7, ease: EASE } },
}
