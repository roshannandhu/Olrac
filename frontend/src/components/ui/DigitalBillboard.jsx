import { useRef, useEffect, useState } from 'react'

export function DigitalBillboard({ mediaUrls = [] }) {
  const videoRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const currentMedia = mediaUrls[currentIndex]
  const isVideo = currentMedia?.match(/\.(mp4|webm|mov|ogg)$/i)

  useEffect(() => {
    if (mediaUrls.length && currentIndex >= mediaUrls.length) {
      setCurrentIndex(0)
    }
  }, [mediaUrls, currentIndex])

  // Auto-advance for images (5s)
  useEffect(() => {
    if (!isVideo && mediaUrls.length > 0 && currentMedia) {
      const timer = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % mediaUrls.length)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, isVideo, mediaUrls, currentMedia])

  const hasMedia = mediaUrls.length > 0

  return (
    <div className="relative mx-auto w-full max-w-[20rem] sm:max-w-lg" style={{ perspective: '1200px' }}>
      
      {/* 3D Perspective Container — Apple product shot angle */}
      <div
        className="relative transition-transform duration-700 ease-out [transform:rotateY(-2deg)_rotateX(1deg)] sm:[transform:rotateY(-4deg)_rotateX(2deg)] lg:[transform:rotateY(-6deg)_rotateX(3deg)]"
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Shadow on the "ground" beneath the screen */}
        <div className="absolute -bottom-4 left-[10%] right-[5%] h-8 rounded-[50%] bg-black/35 blur-xl sm:-bottom-6 sm:h-12 sm:blur-2xl" />

        {/* The screen device */}
        <div className="relative overflow-hidden rounded-[22px] bg-[#0a0a0a] p-[3px] shadow-[0_18px_42px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,255,255,0.06)] sm:rounded-2xl sm:shadow-[0_25px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)]">
          
          {/* Inner screen */}
          <div className="relative aspect-[16/11] overflow-hidden rounded-[16px] bg-black sm:aspect-video sm:rounded-[13px]">
            {hasMedia ? (
              <>
                {isVideo ? (
                  <video
                    ref={videoRef}
                    key={currentMedia}
                    src={currentMedia}
                    autoPlay
                    muted
                    playsInline
                    loop={mediaUrls.length === 1}
                    onEnded={() => {
                      if (mediaUrls.length > 1) {
                        setCurrentIndex((prev) => (prev + 1) % mediaUrls.length)
                      }
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    key={`img-${currentIndex}-${currentMedia}`}
                    src={currentMedia}
                    alt="Ad content"
                    className="h-full w-full object-cover animate-ken-burns"
                  />
                )}

                {/* Top-edge highlight — simulates light hitting the screen */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Subtle bottom vignette */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0d0d0d] to-[#111]">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <svg className="h-5 w-5 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-white/20">Your Ad Here</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Left edge highlight — 3D depth illusion */}
        <div className="pointer-events-none absolute inset-y-1 left-0 hidden w-[2px] rounded-l-2xl bg-gradient-to-b from-white/10 via-white/5 to-transparent sm:block" />
      </div>

      <style>{`
        @keyframes kenBurns {
          0% { transform: scale(1); }
          100% { transform: scale(1.4); }
        }
        .animate-ken-burns {
          animation: kenBurns 5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
