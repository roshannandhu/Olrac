import { motion } from 'framer-motion'

/**
 * SonarButton — two variants:
 *   variant="sonar"   (default) — pulsing rings, good on dark backgrounds
 *   variant="shimmer"           — horizontal light sweep, good on any background
 */
function Ring({ delay }) {
  return (
    <motion.span
      className="absolute inset-0 rounded-full bg-blue-600 pointer-events-none"
      initial={{ scale: 1, opacity: 0.55 }}
      animate={{ scale: 2.1, opacity: 0 }}
      transition={{ duration: 1.9, repeat: Infinity, delay, ease: 'easeOut' }}
    />
  )
}

function ShimmerOverlay() {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-0 -skew-x-12 rounded-[inherit]"
      style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.26) 50%, transparent 100%)' }}
      initial={{ x: '-160%' }}
      animate={{ x: '160%' }}
      transition={{ duration: 0.65, repeat: Infinity, repeatDelay: 2.6, ease: 'easeInOut' }}
    />
  )
}

export function SonarButton({ children, onClick, className = '', style, variant = 'sonar' }) {
  return (
    <span className="relative inline-flex items-center">
      {variant === 'sonar' && (
        <>
          <Ring delay={0} />
          <Ring delay={0.65} />
          <Ring delay={1.3} />
        </>
      )}
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        onClick={onClick}
        style={style}
        className={`relative z-10 overflow-hidden ${className}`}
      >
        {variant === 'shimmer' && <ShimmerOverlay />}
        {children}
      </motion.button>
    </span>
  )
}
