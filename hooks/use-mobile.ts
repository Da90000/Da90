'use client'

import { useEffect, useState } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'
export type Orientation = 'portrait' | 'landscape'

export interface UseMobileReturn {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  deviceType: DeviceType
  orientation: Orientation
  isPortrait: boolean
  isLandscape: boolean
}

/**
 * Hook for detecting device type and orientation
 * 
 * Breakpoints:
 * - Mobile: <768px
 * - Tablet: 768px - 1024px
 * - Desktop: >1024px
 * 
 * SSR-safe: Returns desktop during server render to prevent hydration mismatches
 * 
 * @returns {UseMobileReturn} Device type, orientation, and boolean helpers
 */
export function useMobile(): UseMobileReturn {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop')
  const [orientation, setOrientation] = useState<Orientation>('portrait')

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px)')
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)')
    const orientationQuery = window.matchMedia('(orientation: portrait)')

    const updateDevice = () => {
      if (mobileQuery.matches) {
        setDeviceType('mobile')
      } else if (tabletQuery.matches) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
      setOrientation(orientationQuery.matches ? 'portrait' : 'landscape')
    }

    // Initial check
    updateDevice()

    // Listen for changes
    mobileQuery.addEventListener('change', updateDevice)
    tabletQuery.addEventListener('change', updateDevice)
    orientationQuery.addEventListener('change', updateDevice)

    return () => {
      mobileQuery.removeEventListener('change', updateDevice)
      tabletQuery.removeEventListener('change', updateDevice)
      orientationQuery.removeEventListener('change', updateDevice)
    }
  }, [])

  return {
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    deviceType,
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
  }
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useMobile() instead for more features
 */
export function useIsMobile(): boolean {
  const { isMobile } = useMobile()
  return isMobile
}
