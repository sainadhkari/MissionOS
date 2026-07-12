import { useEffect, useRef, useState } from 'react'

/** Fires once when the element first scrolls into the viewport, then
 * disconnects the observer — landing-page sections should reveal
 * themselves as the user scrolls down, not flicker in and out again on
 * every re-entry. */
export function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, isInView }
}
