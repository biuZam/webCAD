import { useEffect } from 'react'
import { toolSession } from '../canvas/tool-session'
import { commandFor, keyOf } from '../tools/shortcuts'
import { runCommand, useShortcuts } from './shortcuts-store'

/**
 * Tool and action shortcuts (rebindable, T4.8), Select All, and Esc / Enter / Backspace / Delete for the active
 * tool; ignored while typing in a field or while a dialog is open.
 */
export function useToolKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('input, select, textarea, [contenteditable], dialog')) return
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        toolSession.selectAll()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Enter' && target?.closest('button')) return
      const key = keyOf(e)
      const command = key ? commandFor(useShortcuts.getState().bindings, key) : null
      if (command) runCommand(command)
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
