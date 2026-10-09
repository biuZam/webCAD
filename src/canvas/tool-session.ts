// The app-wide tool session, wired to the document store and UI store.
// Tests build their own ToolSession instead.

import { documentStore } from '../document/store'
import { createTools } from '../tools'
import { ToolSession } from '../tools/session'
import { useUiStore } from './ui-store'

export const toolSession = new ToolSession(
  documentStore,
  createTools(),
  () => {
    const { zoom, snaps, activeLayerId } = useUiStore.getState()
    return { zoom, snaps, activeLayerId }
  },
  {
    preview: (preview) => useUiStore.setState({ preview }),
    prompt: (key, fields, params) => useUiStore.setState({ prompt: { key, fields, params } }),
    tool: (activeTool, toolCursor) => useUiStore.setState({ activeTool, toolCursor }),
    cursor: (cursor) => useUiStore.setState({ cursor }),
    selection: (selection) => useUiStore.setState({ selection }),
  },
)

toolSession.setTool('select')
