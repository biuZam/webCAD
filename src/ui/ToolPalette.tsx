import { useTranslation } from 'react-i18next'
import { toolSession } from '../canvas/tool-session'
import { useUiStore } from '../canvas/ui-store'
import { TOOL_ORDER } from '../tools'
import { ACTION_IDS, type ActionId } from '../tools/shortcuts'
import type { ToolId } from '../tools/types'
import { runCommand, useShortcuts } from './shortcuts-store'

/** Simple stroke icons, 20×20, drawn in currentColor. No text inside icons (i18n rule). */
const ICONS: Record<ToolId | ActionId, string> = {
  select: 'M5 3l11 7-5 1.5L8.5 17z',
  line: 'M4 16L16 4M4 16h0M16 4h0',
  rectangle: 'M4 5h12v10H4z',
  circle: 'M10 4a6 6 0 1 0 0 12a6 6 0 1 0 0-12z',
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
  join: 'M2 14h6l2-4M18 6h-6l-2 4',
  union: 'M3 5h8v3h6v9H9v-3H3z',
  difference: 'M3 5h8v3M11 8v6H3V5M11 8h6v9H9v-3',
  flipH: 'M10 2v16M7 6L3 10l4 4M13 6l4 4-4 4',
  flipV: 'M2 10h16M6 7l4-4 4 4M6 13l4 4 4-4',
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function ToolPalette() {
  const { t } = useTranslation()
  const { t: tTools } = useTranslation('tools')
  const active = useUiStore((s) => s.activeTool)
  const hasSelection = useUiStore((s) => s.selection.length > 0)
  const bindings = useShortcuts((s) => s.bindings)
  // "Line (L)", or just the name when the command has no key.
  const title = (name: string, key: string | undefined) => (key ? t('tools.shortcut', { name, key }) : name)

  return (
    <nav className="tool-palette" aria-label={t('tools.label')}>
      {TOOL_ORDER.map((id, i) => {
        if (id === null) return <hr key={`divider-${i}`} className="tool-divider" />
        const name = tTools(`${id}.name`)
        return (
          <button
            key={id}
            className="tool-button"
            aria-pressed={active === id}
            title={title(name, bindings[id])}
            aria-label={name}
            onClick={() => toolSession.setTool(id)}
          >
            <Icon d={ICONS[id]} />
          </button>
        )
      })}
      {ACTION_IDS.map((action) => {
        const name = t(`modify.${action}`)
        return (
          <button
            key={action}
            className="tool-button"
            title={title(name, bindings[action])}
            aria-label={name}
            disabled={!hasSelection}
            onClick={() => runCommand(action)}
          >
            <Icon d={ICONS[action]} />
          </button>
        )
      })}
    </nav>
  )
}
