// Left tool palette: Photoshop-style groups (src/ui/palette-groups.ts). Each slot shows its group's active or
// last-used member, with a corner mark when the group has more; right-click, a long press or → opens the group.

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toolSession } from '../canvas/tool-session'
import { useUiStore } from '../canvas/ui-store'
import { activeVariant, GROUPS, usePaletteChoice, type Variant, type VariantId } from './palette-groups'
import { runCommand, useShortcuts } from './shortcuts-store'

/** Simple stroke icons, 20×20, drawn in currentColor. No text inside icons (i18n rule). */
const ICONS: Record<VariantId, string> = {
  select: 'M5 3l11 7-5 1.5L8.5 17z',
  line: 'M4 16L16 4M4 16h0M16 4h0',
  rectangle: 'M4 5h12v10H4z',
  square: 'M4 4h12v12H4z',
  circle: 'M10 4a6 6 0 1 0 0 12a6 6 0 1 0 0-12z',
  // A circle with its three defining points.
  circle3: 'M10 4a6 6 0 1 0 0 12a6 6 0 1 0 0-12zM10 3h0M4.5 13h0M15.5 13h0',
  ellipse: 'M10 6c4.4 0 8 1.8 8 4s-3.6 4-8 4-8-1.8-8-4 3.6-4 8-4z',
  pen: 'M3 17C6 6 14 14 17 3M17 3l-3 1M17 3l-1 3',
  centreLine: 'M10 2v3M10 7v1M10 10v3M10 15v1M10 18v0M5 6h10v8H5z',
  perpendicular: 'M3 16h14M10 16V4M10 13h3v3',
  measure: 'M2 13l11-11 5 5-11 11zM6 9l2 2M9 6l2 2M12 3l1 1',
  arc: 'M3 15A8 8 0 0 1 17 15M3 15h0M17 15h0M10 7h0',
  move: 'M10 2v16M2 10h16M7.5 4.5L10 2l2.5 2.5M7.5 15.5L10 18l2.5-2.5M4.5 7.5L2 10l2.5 2.5M15.5 7.5L18 10l-2.5 2.5',
  rotate: 'M16 10.5A6 6 0 1 1 14.2 5.8M15 2.5v3.8h-3.8',
  scale: 'M3 11h6v6H3zM7 3h10v10M11 9l5-5M12.5 4H16v3.5',
  mirror: 'M10 2v16M8 5L3 15h5zM12 5l5 10h-5z',
  fillet: 'M4 17V10a6 6 0 0 1 6-6h7',
  chamfer: 'M4 17V9l5-5h8',
  offset: 'M3 17V7a4 4 0 0 1 4-4h10M7 17v-8a2 2 0 0 1 2-2h8',
  stitchLine: 'M3 17V7a4 4 0 0 1 4-4h10M7 15v-2M7 10v-1a2 2 0 0 1 2-2h1M13 7h2',
  stitchHoles:
    'M4 16a1 1 0 1 0 0.01 0M4 11a1 1 0 1 0 0.01 0M4 6a1 1 0 1 0 0.01 0M9 4a1 1 0 1 0 0.01 0M14 4a1 1 0 1 0 0.01 0',
  parallel: 'M3 14L14 3M7 17L17 7',
  // Scissors-like cut across a line.
  trim: 'M2 12h16M6 4l8 14M14 4L6 18',
  // A tag with a double-headed grain arrow (no letters in icons).
  label: 'M3 10l4-6h10v12H7zM9 10h6M9 10l2-2M9 10l2 2M15 10l-2-2M15 10l-2 2',
  // A round hole and a slot.
  punch: 'M6 7a3 3 0 1 0 0.01 0M11 13h4a2 2 0 0 1 0 4h-4a2 2 0 0 1 0-4z',
  // An outline inside a dashed, wider one with a different gap on one side.
  seamAllowance:
    'M7 7h8v8H7zM3 3h2M7 3h2M11 3h2M15 3h2M19 3v2M19 7v2M19 11v2M19 15v2M3 3v2M3 7v2M3 11v2M3 15v2M3 19h2M7 19h2M11 19h2M15 19h2',
  // Three squares in a row.
  array: 'M2 8h4v4H2zM8 8h4v4H8zM14 8h4v4h-4z',
  // An edge with two snips into it.
  notch: 'M2 6h16M8 6v6M12 6v6M3 16h14',
  join: 'M2 14h6l2-4M18 6h-6l-2 4',
  union: 'M3 5h8v3h6v9H9v-3H3z',
  difference: 'M3 5h8v3M11 8v6H3V5M11 8h6v9H9v-3',
  flipH: 'M10 2v16M7 6L3 10l4 4M13 6l4 4-4 4',
  flipV: 'M2 10h16M6 7l4-4 4 4M6 13l4 4 4-4',
}

/** A long press (touch, pen) opens the group menu, like a right-click. */
const LONG_PRESS_MS = 450

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function useVariantName() {
  const { t } = useTranslation()
  const { t: tTools } = useTranslation('tools')
  return (v: Variant): string => {
    if (v.action) return t(`modify.${v.action}`)
    if (v.id === 'square') return tTools('rectangle.square')
    if (v.id === 'circle3') return tTools('circle.threeName')
    if (v.id === 'ellipse') return tTools('circle.ellipseName')
    return tTools(`${v.tool!}.name`)
  }
}

/** Activate a member: a tool (in its mode) or an action. */
function run(v: Variant) {
  if (v.action) return runCommand(v.action)
  toolSession.setTool(v.tool!)
  if (v.input) toolSession.input(v.input, false)
}

export function ToolPalette() {
  const { t } = useTranslation()
  const activeTool = useUiStore((s) => s.activeTool)
  const fields = useUiStore((s) => s.prompt.fields)
  const hasSelection = useUiStore((s) => s.selection.length > 0)
  const bindings = useShortcuts((s) => s.bindings)
  const { chosen, choose } = usePaletteChoice()
  const name = useVariantName()
  const [menu, setMenu] = useState<{ group: number; x: number; y: number } | null>(null)

  // The member shown per group: the active one, else the last used, else the first.
  const shown = GROUPS.map((group, g) => {
    if (!group) return null
    const active = activeVariant(group, activeTool, fields)
    return active ?? group.find((v) => v.id === chosen[g]) ?? group[0]
  })
  // Remember the active member as the group's choice (also when picked by shortcut or the mode field).
  const activeIds = GROUPS.map((group) => (group ? activeVariant(group, activeTool, fields)?.id : undefined))
  const activeKey = activeIds.join(',')
  useEffect(() => {
    activeKey.split(',').forEach((id, g) => id && choose(g, id as VariantId))
  }, [activeKey, choose])

  const keyFor = (v: Variant) =>
    v.action ? bindings[v.action] : v.input && v.id !== v.tool ? undefined : bindings[v.tool!]
  const title = (v: Variant, more: boolean) => {
    const key = keyFor(v)
    const label = key ? t('tools.shortcut', { name: name(v), key }) : name(v)
    return more ? t('tools.more', { name: label }) : label
  }

  const openMenu = (g: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    setMenu({ group: g, x: r.right + 4, y: r.top })
  }

  return (
    <nav className="tool-palette" aria-label={t('tools.label')}>
      {GROUPS.map((group, g) => {
        if (!group) return <hr key={`divider-${g}`} className="tool-divider" />
        const v = shown[g]!
        return (
          <Slot
            key={g}
            variant={v}
            more={group.length > 1}
            pressed={v.tool !== undefined && activeIds[g] !== undefined}
            disabled={v.action !== undefined && !hasSelection}
            title={title(v, group.length > 1)}
            label={name(v)}
            menuLabel={t('tools.group', { name: name(v) })}
            menuOpen={menu?.group === g}
            onRun={() => {
              choose(g, v.id)
              run(v)
            }}
            onOpenMenu={(el) => group.length > 1 && openMenu(g, el)}
          />
        )
      })}
      {menu && (
        <GroupMenu
          group={GROUPS[menu.group]!}
          current={shown[menu.group]!.id}
          x={menu.x}
          y={menu.y}
          name={name}
          shortcut={keyFor}
          disabled={(v) => v.action !== undefined && !hasSelection}
          onPick={(v) => {
            choose(menu.group, v.id)
            setMenu(null)
            run(v)
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </nav>
  )
}

function Slot(props: {
  variant: Variant
  more: boolean
  pressed: boolean
  disabled: boolean
  title: string
  label: string
  menuLabel: string
  menuOpen: boolean
  onRun: () => void
  onOpenMenu: (el: HTMLElement) => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const longPressed = useRef(false)
  const { variant: v, more } = props
  const cancelPress = () => window.clearTimeout(timer.current)
  return (
    <button
      ref={ref}
      className={more ? 'tool-button tool-button-group' : 'tool-button'}
      aria-pressed={v.tool !== undefined ? props.pressed : undefined}
      aria-haspopup={more ? 'menu' : undefined}
      aria-expanded={more ? props.menuOpen : undefined}
      title={props.title}
      aria-label={props.label}
      aria-description={more ? props.menuLabel : undefined}
      // A group stays focusable so its menu can open; a lone action that needs a selection is disabled.
      disabled={props.disabled && !more}
      aria-disabled={props.disabled && more ? true : undefined}
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false
          return
        }
        if (!props.disabled) props.onRun()
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        if (more) props.onOpenMenu(e.currentTarget)
      }}
      onPointerDown={(e) => {
        if (!more || e.pointerType === 'mouse') return
        longPressed.current = false
        const el = e.currentTarget
        timer.current = window.setTimeout(() => {
          longPressed.current = true
          props.onOpenMenu(el)
        }, LONG_PRESS_MS)
      }}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onKeyDown={(e) => {
        if (more && (e.key === 'ArrowRight' || (e.altKey && e.key === 'ArrowDown'))) {
          e.preventDefault()
          props.onOpenMenu(e.currentTarget)
        }
      }}
    >
      <Icon d={ICONS[v.id]} />
    </button>
  )
}

function GroupMenu(props: {
  group: readonly Variant[]
  current: VariantId
  x: number
  y: number
  name: (v: Variant) => string
  shortcut: (v: Variant) => string | undefined
  disabled: (v: Variant) => boolean
  onPick: (v: Variant) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const opener = useRef<Element | null>(document.activeElement)
  const { onClose } = props

  useEffect(() => {
    const items = ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]:not(:disabled)')
    const current = ref.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]:not(:disabled)')
    ;(current ?? items?.[0])?.focus()
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [onClose])

  const close = () => {
    onClose()
    ;(opener.current as HTMLElement | null)?.focus?.()
  }

  return (
    <div
      ref={ref}
      className="tool-menu"
      role="menu"
      style={{ left: props.x, top: props.y }}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        const items = [
          ...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]:not(:disabled)') ?? []),
        ]
        const i = items.indexOf(document.activeElement as HTMLButtonElement)
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          const next = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
          items[next]?.focus()
        } else if (e.key === 'Escape' || e.key === 'ArrowLeft') {
          e.preventDefault()
          e.stopPropagation()
          close()
        } else if (e.key === 'Tab') {
          onClose()
        }
      }}
    >
      {props.group.map((v) => (
        <button
          key={v.id}
          type="button"
          role="menuitemradio"
          aria-checked={v.id === props.current}
          className="tool-menu-item"
          disabled={props.disabled(v)}
          onClick={() => props.onPick(v)}
        >
          <Icon d={ICONS[v.id]} />
          <span>{props.name(v)}</span>
          <kbd>{props.shortcut(v) ?? ''}</kbd>
        </button>
      ))}
    </div>
  )
}
