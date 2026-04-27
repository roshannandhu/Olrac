import { motion } from 'framer-motion'

export default function LoadingScreen() {
  return (
    <motion.div
      key="loading-screen"
      className="fixed inset-0 z-[220] overflow-hidden bg-black/95 backdrop-blur-[18px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.06),transparent_34%)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.05] blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.03] blur-3xl" />
      </div>

      <div className="relative flex h-full items-center justify-center">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
          <div className="absolute inset-3 rounded-full border border-white/[0.12]" />
          <div className="absolute inset-5 rounded-full bg-white/[0.03] blur-2xl" />
          <motion.div
            aria-hidden="true"
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.35, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.85)]" />
          </motion.div>
          <span className="relative z-10 pl-[0.55em] text-[10px] font-medium uppercase tracking-[0.55em] text-white/58">
            OLRAC
          </span>
        </div>
      </div>
    </motion.div>
  )
}
