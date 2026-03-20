// WCAG 2.1 AA Accessibility Utilities
// These helpers ensure consistent accessible behavior across the application

/**
 * Generate unique IDs for form elements and their labels
 */
export function generateFieldId(prefix: string, name: string): string {
  return `${prefix}-${name}`.replace(/[^a-zA-Z0-9-]/g, '-')
}

/**
 * Announce a message to screen readers via aria-live region
 * Call this for dynamic content updates (e.g., form submission results)
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof document === 'undefined') return

  let region = document.getElementById(`sr-announcer-${priority}`)
  if (!region) {
    region = document.createElement('div')
    region.id = `sr-announcer-${priority}`
    region.setAttribute('role', 'status')
    region.setAttribute('aria-live', priority)
    region.setAttribute('aria-atomic', 'true')
    region.className = 'sr-only'
    region.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0'
    document.body.appendChild(region)
  }

  // Clear and set after a tick so screen readers detect the change
  region.textContent = ''
  requestAnimationFrame(() => {
    region!.textContent = message
  })
}

/**
 * Keyboard navigation helper — handle Enter/Space for custom clickable elements
 */
export function handleKeyboardActivation(
  event: React.KeyboardEvent,
  callback: () => void
): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    callback()
  }
}

/**
 * Focus trap utility — keeps focus within a dialog/modal
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ]
  return Array.from(container.querySelectorAll<HTMLElement>(selectors.join(', ')))
}

/**
 * WCAG color contrast check — AA requires 4.5:1 for normal text, 3:1 for large
 * Returns the contrast ratio between two hex colors
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1)
  const lum2 = getRelativeLuminance(hex2)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return (lighter + 0.05) / (darker + 0.05)
}

function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  const [r, g, b] = rgb.map((c) => {
    const sRGB = c / 255
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '')
  return [
    parseInt(cleaned.slice(0, 2), 16),
    parseInt(cleaned.slice(2, 4), 16),
    parseInt(cleaned.slice(4, 6), 16),
  ]
}

/**
 * Skip link target ID — used in layout for "Skip to main content"
 */
export const MAIN_CONTENT_ID = 'main-content'

/**
 * Minimum touch target size (WCAG 2.5.5 Level AAA: 44x44px, Level AA: 24x24px)
 */
export const MIN_TOUCH_TARGET_PX = 44
