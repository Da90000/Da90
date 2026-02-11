# Use Mobile Hook - Usage Guide

## Overview

The `useMobile` hook provides comprehensive device detection and orientation tracking for responsive components.

## Import

```typescript
import { useMobile } from '@/hooks/use-mobile'
// or legacy path (deprecated)
import { useIsMobile } from '@/components/ui/use-mobile'
```

## Basic Usage

```typescript
'use client'

import { useMobile } from '@/hooks/use-mobile'

export function MyComponent() {
  const { isMobile, isTablet, isDesktop } = useMobile()

  return (
    <div>
      {isMobile && <MobileView />}
      {isTablet && <TabletView />}
      {isDesktop && <DesktopView />}
    </div>
  )
}
```

## Advanced Usage

### Orientation Detection

```typescript
export function ResponsiveImage() {
  const { orientation, isPortrait, isLandscape } = useMobile()

  return (
    <img 
      src={isPortrait ? '/portrait.jpg' : '/landscape.jpg'}
      alt="Responsive"
    />
  )
}
```

### Device Type Switch

```typescript
export function AdaptiveLayout() {
  const { deviceType } = useMobile()

  const columns = {
    mobile: 1,
    tablet: 2,
    desktop: 3,
  }[deviceType]

  return (
    <div style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {/* Content */}
    </div>
  )
}
```

### Conditional Rendering

```typescript
export function Navigation() {
  const { isMobile, isDesktop } = useMobile()

  return (
    <>
      {isMobile && <MobileNav />}
      {isDesktop && <DesktopNav />}
    </>
  )
}
```

## API Reference

### Return Type

```typescript
interface UseMobileReturn {
  // Boolean helpers
  isMobile: boolean      // true when <768px
  isTablet: boolean      // true when 768px-1024px
  isDesktop: boolean     // true when >1024px
  
  // Device type
  deviceType: 'mobile' | 'tablet' | 'desktop'
  
  // Orientation
  orientation: 'portrait' | 'landscape'
  isPortrait: boolean
  isLandscape: boolean
}
```

### Breakpoints

| Device  | Breakpoint | CSS Media Query |
|---------|-----------|-----------------|
| Mobile  | <768px | `(max-width: 767px)` |
| Tablet  | 768px-1024px | `(min-width: 768px) and (max-width: 1023px)` |
| Desktop | >1024px | `(min-width: 1024px)` |

## SSR Behavior

During server-side rendering, the hook returns:
- `deviceType: 'desktop'`
- `orientation: 'portrait'`
- All boolean values based on these defaults

This prevents hydration mismatches. The hook updates to the correct values on the client after mount.

## Performance Notes

- Uses `window.matchMedia` for native browser support
- Event listeners are properly cleaned up on unmount
- No polling or RAF usage - relies on native media query events
- Minimal re-renders (only when breakpoint or orientation changes)

## Common Patterns

### Mobile-First Component

```typescript
export function Card() {
  const { isMobile } = useMobile()

  return (
    <div className={isMobile ? 'p-4' : 'p-6'}>
      {/* Content */}
    </div>
  )
}
```

### Touch vs Click Handlers

```typescript
export function InteractiveButton() {
  const { isMobile } = useMobile()

  return (
    <button
      onClick={handleClick}
      onTouchStart={isMobile ? handleTouch : undefined}
    >
      Click me
    </button>
  )
}
```

### Responsive Navigation

```typescript
export function AppNav() {
  const { isMobile, isDesktop } = useMobile()
  const [menuOpen, setMenuOpen] = useState(false)

  if (isMobile) {
    return <MobileDrawerNav open={menuOpen} onOpenChange={setMenuOpen} />
  }

  if (isDesktop) {
    return <DesktopHorizontalNav />
  }

  return <TabletCompactNav />
}
```

## Legacy Hook

For backward compatibility, `useIsMobile()` is still available:

```typescript
import { useIsMobile } from '@/hooks/use-mobile'

export function OldComponent() {
  const isMobile = useIsMobile()
  
  return isMobile ? <MobileView /> : <DesktopView />
}
```

**Migration:** Replace `useIsMobile()` with `useMobile().isMobile` for access to additional features.

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ iOS Safari 14+
- ✅ Chrome Android 90+

## Testing

```typescript
import { renderHook } from '@testing-library/react'
import { useMobile } from '@/hooks/use-mobile'

describe('useMobile', () => {
  it('detects mobile devices', () => {
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query.includes('max-width: 767px'),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }))

    const { result } = renderHook(() => useMobile())
    expect(result.current.isMobile).toBe(true)
  })
})
```

## Related

- `use-media-query` - For custom breakpoints
- `useBreakpoint` - Tailwind CSS breakpoint detection
- `useViewport` - Viewport size tracking
