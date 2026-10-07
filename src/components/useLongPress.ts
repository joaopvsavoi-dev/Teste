import { useRef } from 'react'

/** 1 toque = onTap; toque longo (≥ 450 ms) = onLong. Funciona com mouse e toque. */
export function useLongPress(onTap: () => void, onLong: () => void, ms = 450) {
  const timer = useRef<number | undefined>(undefined)
  const longo = useRef(false)
  const limpar = () => window.clearTimeout(timer.current)
  return {
    onPointerDown: () => {
      longo.current = false
      timer.current = window.setTimeout(() => {
        longo.current = true
        navigator.vibrate?.(15)
        onLong()
      }, ms)
    },
    onPointerUp: () => {
      limpar()
      if (!longo.current) onTap()
    },
    onPointerLeave: limpar,
    onPointerCancel: limpar,
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  }
}
