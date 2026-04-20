import { useEffect, useState } from 'react'

export default function IntroSplash({ companyName, onComplete }) {
  const [stage, setStage] = useState(() => {
    // Check if the splash screen has already been shown in this tab's session
    return sessionStorage.getItem('splash_shown') === 'true' ? 'hidden' : 'entering'
  })

  useEffect(() => {
    if (stage === 'hidden') return

    // Mark as shown so going "back" doesn't trigger it again
    sessionStorage.setItem('splash_shown', 'true')

    // Hold splash screen
    const timeout = setTimeout(() => setStage('exiting'), 2000)
    return () => clearTimeout(timeout)
  }, [stage])

  useEffect(() => {
    // Wait for CSS transition to fade out before unmounting
    if (stage === 'exiting') {
      const timeout = setTimeout(() => {
        setStage('hidden')
        if (onComplete) onComplete()
      }, 700)
      return () => clearTimeout(timeout)
    }
  }, [stage, onComplete])

  if (stage === 'hidden') return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 transition-opacity duration-700 ease-in-out ${
        stage === 'exiting' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="text-center px-4">
        <p className="mb-3 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.4em] text-slate-400 opacity-80">
          Welcome To
        </p>
        <h1 className="text-4xl sm:text-6xl font-black tracking-wider text-white animate-pulse">
          {companyName}
        </h1>
      </div>
    </div>
  )
}
