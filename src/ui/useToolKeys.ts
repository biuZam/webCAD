import { useEffect } from 'react'
import { toolSession } from '../canvas/tool-session'
import { TOOL_SHORTCUTS } from '../tools'

/** Tool shortcuts, Select All, and Esc / Enter / Backspace / Delete for the active tool; ignored while typing in a field. */
export function useToolKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('input, select, textarea, [contenteditable]')) return
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        toolSession.selectAll()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.shiftKey && (e.key === 'H' || e.key === 'V')) {
        e.preventDefault()
        toolSession.flip(e.key === 'H' ? 'horizontal' : 'vertical')
        return
      }
      if (e.key === 'Enter' && target?.closest('button')) return
      const tool = TOOL_SHORTCUTS[e.key.toLowerCase()]
      if (tool) toolSession.setTool(tool)
      else if (e.key === 'Escape') toolSession.cancel()
      else if (e.key === 'Enter') toolSession.finish()
      else if (e.key === 'Backspace' || e.key === 'Delete') toolSession.deleteKey()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
