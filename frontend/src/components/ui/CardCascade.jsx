import { useState } from 'react'
import { motion } from 'framer-motion'
import { Monitor, Zap, Map, Plus } from 'lucide-react'

export function CardCascade() {
  const [isHovered, setIsHovered] = useState(false)

  // Top Card: Premium Screens Feature
  const topCard = (
    <motion.div
      animate={{ 
        rotateZ: isHovered ? -5 : 0, 
        x: isHovered ? -40 : 0, 
        y: isHovered ? -20 : 0,
        z: 20
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="absolute inset-0 z-30 mx-auto w-full max-w-md"
    >
      <div className="h-full w-full rounded-[34px] border border-slate-200/60 bg-white/60 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.1)] backdrop-blur-xl transition-shadow hover:shadow-[0_40px_100px_rgba(15,23,42,0.15)]">
        <div className="relative h-full w-full overflow-hidden rounded-[26px] bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Live Network</p>
              <p className="mt-1 text-xl font-black text-slate-900">Premium Screens</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Monitor className="h-5 w-5" />
            </div>
          </div>
          <div className="p-6 space-y-4">
            {[
              ['Digital Reach', 'High-traffic premium locations', '1M+ IMP'],
              ['Audience Match', 'Smarter targeting, stronger recall', '95% ACC'],
              ['Ad Launch', 'Fast booking with low friction', '2 MIN'],
            ].map(([title, desc, metric]) => (
              <div key={title} className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{title}</p>
                    <p className="mt-1 text-xs text-slate-500">{desc}</p>
                  </div>
                  <span className="rounded-full bg-primary-50 px-2 py-1 text-[9px] font-bold text-primary-600">{metric}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )

  // Middle Card: Network Map Context
  const middleCard = (
    <motion.div
      animate={{ 
        rotateZ: isHovered ? 5 : 2, 
        x: isHovered ? 50 : 5, 
        y: isHovered ? -10 : 8,
        z: 10
      }}
      initial={{ rotateZ: 2, x: 5, y: 8 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="absolute inset-0 z-20 mx-auto w-full max-w-md"
    >
      <div className="h-full w-full rounded-[34px] border border-slate-200/50 bg-slate-50/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-md">
        <div className="h-full w-full rounded-[26px] bg-slate-100 border border-slate-200 overflow-hidden relative">
          {/* Abstract map pattern */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
          <div className="absolute left-6 top-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm text-slate-600">
              <Map className="h-4 w-4" />
            </div>
            <p className="text-sm font-bold text-slate-700">Network Map</p>
          </div>
          {/* Active nodes */}
          <div className="absolute right-12 top-20 h-3 w-3 rounded-full bg-primary-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-pulse" />
          <div className="absolute left-16 bottom-24 h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse" />
          <div className="absolute right-24 bottom-16 h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse" />
        </div>
      </div>
    </motion.div>
  )

  // Bottom Card: Quick Launch Action
  const bottomCard = (
    <motion.div
      animate={{ 
        rotateZ: isHovered ? -12 : -2, 
        x: isHovered ? -20 : -5, 
        y: isHovered ? 40 : -5,
        z: 0
      }}
      initial={{ rotateZ: -2, x: -5, y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="absolute inset-x-0 bottom-[-20%] z-10 mx-auto w-[90%] max-w-sm h-48"
    >
      <div className="h-full w-full rounded-[30px] border border-slate-200/40 bg-white/90 p-3 shadow-xl backdrop-blur-sm">
        <div className="h-full w-full rounded-[22px] bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</p>
            <p className="mt-1 text-lg font-bold text-white">Deploy Campaign</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="w-1/3 h-full bg-primary-500 rounded-full" />
            </div>
            <p className="text-xs font-bold text-primary-400">Step 1/3</p>
          </div>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div 
      className="relative w-full h-[480px] max-w-lg mx-auto perspective-1000"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {bottomCard}
      {middleCard}
      {topCard}
    </div>
  )
}
