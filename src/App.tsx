import { useEffect, useMemo, useState } from 'react'
import { cutAll, playChord, playMove, type SynthOpts, type ToneId } from './audio/synth'
import { Inspector } from './components/Inspector'
import { Selectors } from './components/Selectors'
import { Globe } from './components/Globe'
import { SynthBar } from './components/SynthBar'
import type { Selection } from './components/selection'
import { scalesInFamily, type FamilyId } from './data/scales'
import { readSession, saveSession } from './persist'
import { buildScaleMap } from './theory/map'
import type { MoveKind } from './theory/cycles'

export default function App() {
  const [boot] = useState(readSession)
  const [rootPc, setRootPc] = useState(boot.rootPc)
  const [family, setFamily] = useState<FamilyId>(boot.family)
  const [scaleId, setScaleId] = useState(boot.scaleId)
  const [selection, setSelection] = useState<Selection>(boot.selection)
  const [hub, setHub] = useState(boot.hub)
  const [tone, setTone] = useState<ToneId>(boot.tone)
  const [decay, setDecay] = useState(boot.decay)

  const map = useMemo(() => buildScaleMap(rootPc, scaleId), [rootPc, scaleId])

  useEffect(() => {
    saveSession({ rootPc, family, scaleId, selection, hub, tone, decay })
  }, [rootPc, family, scaleId, selection, hub, tone, decay])

  if (!map) {
    const fallback = scalesInFamily(family)[0]
    return (
      <div className="app">
        <p>Unknown scale.</p>
        {fallback ? (
          <button type="button" onClick={() => setScaleId(fallback.id)}>
            Reset
          </button>
        ) : null}
      </div>
    )
  }

  const current = map
  const synth: SynthOpts = { tone, decay }

  function replay(opts: SynthOpts = synth) {
    if (selection.kind === 'node') {
      const chord = current.chords[selection.degree]
      if (chord) void playChord(chord.notes, opts)
      return
    }
    if (selection.kind === 'edge') {
      const edge = current.edges.find((e) => e.id === selection.edgeId)
      if (edge) void playMove(edge.from.notes, edge.to.notes, opts)
    }
  }

  function handleRoot(pc: number) {
    setRootPc(pc)
    setSelection({ kind: 'none' })
    setHub(0)
  }

  function handleFamily(next: FamilyId) {
    setFamily(next)
    setSelection({ kind: 'none' })
    setHub(0)
  }

  function handleScale(id: string) {
    setScaleId(id)
    setSelection({ kind: 'none' })
    setHub(0)
  }

  function handleNode(degree: number) {
    setSelection({ kind: 'node', degree })
    const chord = current.chords[degree]
    if (chord) void playChord(chord.notes, synth)
  }

  function handleEdge(edgeId: string, moveKind: MoveKind) {
    const edge = current.edges.find((e) => e.id === edgeId)
    if (!edge || edge.from.degree !== hub) return
    setSelection({ kind: 'edge', edgeId, moveKind })
    setHub(edge.to.degree)
    void playMove(edge.from.notes, edge.to.notes, synth)
  }

  function handleHome() {
    setSelection({ kind: 'node', degree: 0 })
    setHub(0)
    const tonic = current.chords[0]
    if (tonic) void playChord(tonic.notes, synth)
  }

  function handleTone(next: ToneId) {
    cutAll()
    setTone(next)
    replay({ tone: next, decay })
  }

  function handleClear() {
    setSelection({ kind: 'none' })
  }

  return (
    <div className="shell" onClick={handleClear}>
      <div className="app">
        <header className="top">
          <div className="brand">
            <h1>Emotion Based Theory</h1>
            <p>Every chord change is a 2nd, a 3rd, or a 4th. The rest is inversion.</p>
          </div>
          <Selectors
            rootPc={rootPc}
            family={family}
            scaleId={scaleId}
            onRoot={handleRoot}
            onFamily={handleFamily}
            onScale={handleScale}
          />
        </header>
        <main className="stage">
          <Globe
            map={map}
            hub={hub}
            selection={selection}
            onNode={handleNode}
            onEdge={handleEdge}
            onHome={handleHome}
            initialView={boot.view}
          />
          <Inspector map={map} selection={selection} onNode={handleNode} />
        </main>
        <SynthBar tone={tone} decay={decay} onTone={handleTone} onDecay={setDecay} onHear={() => replay()} />
      </div>
    </div>
  )
}
