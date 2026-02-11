'use client'

import { useMobile } from '@/hooks/use-mobile'

/**
 * DeviceDebugger - Visual debug panel for testing the useMobile hook
 * 
 * Add this component to your app during development to see real-time
 * device detection and orientation changes.
 * 
 * Usage:
 * ```tsx
 * import { DeviceDebugger } from '@/components/device-debugger'
 * 
 * export default function Page() {
 *   return (
 *     <>
 *       <YourContent />
 *       {process.env.NODE_ENV === 'development' && <DeviceDebugger />}
 *     </>
 *   )
 * }
 * ```
 */
export function DeviceDebugger() {
    const mobile = useMobile()

    // Only show in development
    if (process.env.NODE_ENV === 'production') {
        return null
    }

    return (
        <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-50 shadow-lg border border-white/10 backdrop-blur-sm">
            <div className="font-bold mb-2 text-emerald-400">🔍 Device Info</div>

            <div className="space-y-1 mb-3">
                <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Type:</span>
                    <span className="font-semibold text-emerald-300">{mobile.deviceType}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Orientation:</span>
                    <span className="font-semibold text-emerald-300">{mobile.orientation}</span>
                </div>
            </div>

            <div className="border-t border-white/10 pt-2 space-y-1">
                <div className="flex justify-between gap-4">
                    <span>isMobile:</span>
                    <span>{mobile.isMobile ? '✅' : '❌'}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span>isTablet:</span>
                    <span>{mobile.isTablet ? '✅' : '❌'}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span>isDesktop:</span>
                    <span>{mobile.isDesktop ? '✅' : '❌'}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span>isPortrait:</span>
                    <span>{mobile.isPortrait ? '✅' : '❌'}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span>isLandscape:</span>
                    <span>{mobile.isLandscape ? '✅' : '❌'}</span>
                </div>
            </div>

            <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-gray-400">
                {typeof window !== 'undefined'
                    ? `Viewport: ${window.innerWidth}x${window.innerHeight}px`
                    : 'SSR Mode'
                }
            </div>

            <div className="mt-2 text-[10px] text-gray-500">
                Breakpoints: &lt;768px (M) | 768-1024px (T) | &gt;1024px (D)
            </div>
        </div>
    )
}
