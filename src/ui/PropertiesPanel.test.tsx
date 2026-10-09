// @vitest-environment happy-dom
import '../test/canvas-stub'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from '../canvas/ui-store'
import { addEntities, setDisplayUnit } from '../document/commands'
import { createProject } from '../document/factory'
import type { CircleEntity, Entity, PathEntity } from '../document/model'
import { documentStore } from '../document/store'
import { rectangleSegments } from '../geometry/shapes'
import { initI18n } from '../i18n'
import { PropertiesPanel } from './PropertiesPanel'

beforeAll(() => {
  initI18n()
})
afterEach(cleanup)

const entity = (id: string) => documentStore.getState().project.pieces[0].entities.find((e) => e.id === id)!

beforeEach(() => {
  const project = createProject()
  const layerId = project.layers[0].id
  const base = { layerId, lineStyle: 'solid', strokeWidth: 0.2 } as const
  const list: Entity[] = [
    { ...base, id: 'sq', type: 'path', segments: rectangleSegments([10, 20], [50, 40]), closed: true },
    { ...base, id: 'c', type: 'circle', lineStyle: 'dashed', center: [0, 0], rx: 5, ry: 5, rotation: 0 },
  ]
  project.pieces[0].entities.push(...list)
  documentStore.getState().load(project)
  useUiStore.setState({ selection: [] })
})

function edit(label: string, text: string) {
  const input = screen.getByLabelText(label) as HTMLInputElement
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: text } })
  fireEvent.blur(input)
}
const value = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value

describe('PropertiesPanel', () => {
  it('shows project defaults with nothing selected, and edits them', () => {
    render(<PropertiesPanel />)
    expect(screen.getByText(/Select something/)).toBeTruthy()
    expect(value('Stitch margin')).toBe('3.5')
    act(() => edit('Pitch', '3.38'))
    expect(documentStore.getState().project.settings.pitch).toBe(3.38)
  })

  it('shows and edits a path’s bounds; W scales, X moves, each one undo step', () => {
    useUiStore.setState({ selection: ['sq'] })
    render(<PropertiesPanel />)
    expect(value('X')).toBe('10')
    expect(value('W')).toBe('40')
    expect(value('Length')).toBe('120')

    act(() => edit('W', '80'))
    expect((entity('sq') as PathEntity).segments[1].p).toEqual([90, 20])
    act(() => edit('X', '0'))
    expect((entity('sq') as PathEntity).segments[0].p).toEqual([0, 20])
    expect(documentStore.getState().past).toHaveLength(2)
  })

  it('edits a circle by diameter; W/H are read-only for circles', () => {
    useUiStore.setState({ selection: ['c'] })
    render(<PropertiesPanel />)
    act(() => edit('Diameter', '30'))
    expect((entity('c') as CircleEntity).rx).toBe(15)
    expect((screen.getByLabelText('W') as HTMLInputElement).readOnly).toBe(true)
  })

  it('shows mixed values across a selection and applies a common style to all', () => {
    useUiStore.setState({ selection: ['sq', 'c'] })
    render(<PropertiesPanel />)
    expect(screen.getByText('2 objects')).toBeTruthy()
    const style = screen.getByLabelText('Line style') as HTMLSelectElement
    expect(style.value).toBe('')
    act(() => {
      fireEvent.change(style, { target: { value: 'dotted' } })
    })
    expect(entity('sq').lineStyle).toBe('dotted')
    expect(entity('c').lineStyle).toBe('dotted')
  })

  it('works in the display unit: inches in, millimetres stored', () => {
    act(() => documentStore.getState().dispatch(setDisplayUnit('in')))
    useUiStore.setState({ selection: ['sq'] })
    render(<PropertiesPanel />)
    expect(value('W')).toBe('1.5748')
    act(() => edit('W', '2'))
    expect((entity('sq') as PathEntity).segments[1].p[0]).toBeCloseTo(10 + 50.8)
  })

  it('edits a linked stitch line’s margin (keeping its side) and detaches it', () => {
    const project = documentStore.getState().project
    act(() =>
      documentStore.getState().dispatch(
        addEntities(project.pieces[0].id, [
          {
            id: 'st',
            type: 'path',
            layerId: project.layers[1].id,
            lineStyle: 'dashed',
            strokeWidth: 0.2,
            closed: true,
            segments: [],
            derived: { kind: 'offset', sourceId: 'sq', margin: -3, join: 'miter' },
          },
        ]),
      ),
    )
    useUiStore.setState({ selection: ['st'] })
    render(<PropertiesPanel />)
    expect(screen.getByText('Stitch line (linked)')).toBeTruthy()
    expect(screen.getByText(/Path \(inside\)/)).toBeTruthy()
    act(() => edit('Margin', '5'))
    const st = entity('st') as PathEntity
    expect(st.derived?.margin).toBe(-5)
    expect(st.segments[0].p).toEqual([15, 25])
    act(() => {
      fireEvent.click(screen.getByText('Detach'))
    })
    expect((entity('st') as PathEntity).derived).toBeUndefined()
  })

  it('rejects invalid input and Esc reverts', () => {
    useUiStore.setState({ selection: ['c'] })
    render(<PropertiesPanel />)
    act(() => edit('Radius', '-3'))
    expect((entity('c') as CircleEntity).rx).toBe(5)
    expect(screen.getByLabelText('Radius').getAttribute('aria-invalid')).toBe('true')
    const input = screen.getByLabelText('Radius')
    act(() => {
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '99' } })
      fireEvent.keyDown(input, { key: 'Escape' })
      fireEvent.blur(input)
    })
    expect((entity('c') as CircleEntity).rx).toBe(5)
  })
})
