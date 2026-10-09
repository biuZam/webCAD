// T4.8 Keyboard shortcuts: every tool and selection action with its key; "Change" waits for the next letter
// key (with or without Shift), Esc cancels. Taking a key from another command says so.

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ACTION_IDS, COMMAND_IDS, keyOf, type CommandId } from '../tools/shortcuts'
import { useShortcuts } from './shortcuts-store'

const isAction = (id: CommandId) => (ACTION_IDS as readonly string[]).includes(id)

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { t: tTools } = useTranslation('tools')
  const ref = useRef<HTMLDialogElement>(null)
  const { bindings, bind, reset } = useShortcuts()
  const [capturing, setCapturing] = useState<CommandId | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const dialog = ref.current!
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const close = () => {
    setCapturing(null)
    setMessage('')
    onClose()
  }

  const name = (id: CommandId) => (isAction(id) ? t(`modify.${id as 'join'}`) : tTools(`${id as 'line'}.name`))

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!capturing) return
    e.preventDefault()
    e.stopPropagation()
    if (e.key === 'Escape') {
      setCapturing(null)
      setMessage('')
      return
    }
    const key = keyOf(e.nativeEvent)
    if (!key) {
      setMessage(t('shortcuts.invalid'))
      return
    }
    const displaced = bind(capturing, key)
    setMessage(
      displaced
        ? t('shortcuts.moved', { key, from: name(displaced), to: name(capturing) })
        : t('shortcuts.set', { key, name: name(capturing) }),
    )
    setCapturing(null)
  }

  return (
    <dialog
      ref={ref}
      className="dialog shortcuts-dialog"
      onClose={close}
      onCancel={(e) => {
        // Esc while waiting for a key cancels the capture, not the dialog.
        if (capturing) e.preventDefault()
      }}
      onKeyDown={onKeyDown}
      aria-labelledby="shortcuts-title"
    >
      <h2 id="shortcuts-title" className="dialog-title">
        {t('shortcuts.title')}
      </h2>
      <p className="dialog-hint">{t('shortcuts.hint')}</p>
      <table className="shortcuts-table">
        <tbody>
          {COMMAND_IDS.map((id) => (
            <tr key={id}>
              <th scope="row">{name(id)}</th>
              <td>
                {capturing === id ? (
                  <span className="shortcut-capture">{t('shortcuts.pressKey')}</span>
                ) : bindings[id] ? (
                  <kbd>{bindings[id]}</kbd>
                ) : (
                  <span className="shortcut-none">{t('shortcuts.none')}</span>
                )}
              </td>
              <td className="shortcut-actions">
                <button
                  type="button"
                  aria-label={t('shortcuts.changeFor', { name: name(id) })}
                  onClick={() => {
                    setCapturing(id)
                    setMessage(t('shortcuts.pressKeyFor', { name: name(id) }))
                  }}
                >
                  {t('shortcuts.change')}
                </button>
                <button
                  type="button"
                  aria-label={t('shortcuts.removeFor', { name: name(id) })}
                  disabled={!bindings[id]}
                  onClick={() => {
                    bind(id, null)
                    setMessage(t('shortcuts.removed', { name: name(id) }))
                  }}
                >
                  {t('shortcuts.remove')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="dialog-hint" aria-live="polite">
        {message}
      </p>
      <div className="dialog-actions">
        <button
          type="button"
          onClick={() => {
            reset()
            setMessage(t('shortcuts.resetDone'))
          }}
        >
          {t('shortcuts.reset')}
        </button>
        <button type="button" className="primary" onClick={close}>
          {t('shortcuts.done')}
        </button>
      </div>
    </dialog>
  )
}
