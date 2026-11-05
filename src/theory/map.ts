import { getScale, SCALES, type ScaleDef } from '../data/scales'
import { evaluateMove, structuralLine } from '../data/rules'
import {
  buildChords,
  pcNameMap,
  rootNameFor,
  sharedTones,
  spellPitch,
  type Chord,
} from './chords'
import { buildCycles, type Cycle, type MoveKind } from './cycles'
import { explainMove } from './explain'
import { chordFeelings, type ChordFeeling } from './feeling'
import {
  provenance,
  relativeReading,
  type Counterpart,
  type RelativeReading,
  type Source,
} from './provenance'

export type EvaluatedMove = {
  id: string
  from: Chord
  to: Chord
  kind: MoveKind
  ascending: boolean
  label: string
  because: string
  source: Source
  counterpart: Counterpart | null
  relative: RelativeReading | null
  structural: string
  theory: string
  sharedPcs: number[]
  sharedNames: string[]
}

export type ScaleMap = {
  tonicPc: number
  rootName: string
  scale: ScaleDef
  pitchClasses: number[]
  names: string[]
  chords: Chord[]
  cycles: Cycle[]
  edges: EvaluatedMove[]
  posterCount: number
  relativeCount: number
  feelings: (ChordFeeling | null)[]
}

export function buildScaleMap(rootPc: number, scaleId: string): ScaleMap | null {
  const scale = getScale(scaleId)
  if (!scale) return null
  const rootName = rootNameFor(rootPc, scale.intervals)
  const chords = buildChords(rootPc, scale, rootName)
  const cycles = buildCycles(chords.length)
  const names = pcNameMap(rootPc, scale.intervals, rootName)
  const pitchClasses = scale.intervals.map((i) => (rootPc + i) % 12)

  const edges: EvaluatedMove[] = []
  for (const cycle of cycles) {
    const ring = cycle.degrees
    if (ring.length < 2) continue
    const dirs = [
      { delta: 1, ascending: true },
      { delta: -1, ascending: false },
    ] as const
    for (const { delta, ascending } of dirs) {
      for (let i = 0; i < ring.length; i++) {
        const from = chords[ring[i]!]!
        const to = chords[ring[(i + delta + ring.length) % ring.length]!]!
        const hit = evaluateMove({ from, to, kind: cycle.kind, ascending, tonicPc: rootPc, chords })
        const origin = provenance(from, to, cycle.kind, ascending, rootPc, chords.length)
        const relative = relativeReading(from, to, cycle.kind, rootPc, pitchClasses, names)
        const promoted = origin.source !== 'poster' && relative?.carries === true
        const sharedPcs = sharedTones(from.notes, to.notes)
        edges.push({
          id: `${cycle.kind}:${from.degree}>${to.degree}`,
          from,
          to,
          kind: cycle.kind,
          ascending,
          label: promoted ? relative.label : (origin.label ?? hit.label),
          because: promoted ? relative.reason : (origin.reason ?? hit.because),
          source: promoted ? 'relative' : origin.source,
          counterpart: origin.counterpart,
          relative: origin.source === 'poster' ? null : relative,
          structural: structuralLine(from, to, cycle.kind, ascending),
          theory: explainMove(from, to, cycle.kind, rootPc, names),
          sharedPcs,
          sharedNames: sharedPcs.map((pc) => names[pc] ?? spellPitch(pc, false)),
        })
      }
    }
  }

  return {
    tonicPc: rootPc,
    rootName,
    scale,
    pitchClasses,
    names,
    chords,
    cycles,
    edges,
    posterCount: edges.filter((e) => e.source === 'poster').length,
    relativeCount: edges.filter((e) => e.source === 'relative').length,
    feelings: chordFeelings(chords, rootPc, pitchClasses, names),
  }
}

/** Below this share of moves traced to his map or its chords, a scale is mostly rule output. */
export const SOURCED_FLOOR = 0.25

let experimental: Set<string> | null = null

/** Sourcing doesn't depend on the root, so it is measured once on C. */
export function isExperimental(scaleId: string): boolean {
  experimental ??= new Set(
    SCALES.filter((s) => {
      const m = buildScaleMap(0, s.id)
      return !m || (m.posterCount + m.relativeCount) / Math.max(m.edges.length, 1) < SOURCED_FLOOR
    }).map((s) => s.id),
  )
  return experimental.has(scaleId)
}

export function findEdge(
  map: ScaleMap,
  kind: MoveKind,
  fromDegree: number,
  toDegree: number,
): EvaluatedMove | undefined {
  return map.edges.find((e) => e.kind === kind && e.from.degree === fromDegree && e.to.degree === toDegree)
}
