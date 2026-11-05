import { POSTER, type Basis } from '../data/poster'
import { getScale } from '../data/scales'
import {
  FUNCTION_LABEL,
  buildChords,
  containsTritone,
  hasPitch,
  leadingTonePc,
  type Chord,
  type Quality,
} from './chords'
import type { MoveKind } from './cycles'

export type Source = 'poster' | 'relative' | 'extrapolated'

/** The same two chords, read on his map in the major key whose chords they are. */
export type RelativeReading = {
  keyName: string
  label: string
  reason: string
  basis: Basis
  carries: boolean
  note: string
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11]
const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11]

/** Moves where he says the altered (harmonic-minor) version keeps or strengthens his word. */
const ENDORSED_ALTERATIONS: Record<string, { quality: Quality; note: string }> = {
  '4ths:6>2': { quality: 'maj', note: 'This one is even stronger when the E chord is made major.' },
}

export function relativeMajorTonic(pitchClasses: number[]): number | null {
  const set = new Set(pitchClasses)
  if (set.size !== 7) return null
  for (const t of pitchClasses) {
    if (MAJOR.every((iv) => set.has((t + iv) % 12))) return t
  }
  return null
}

function isHarmonicMinor(pitchClasses: number[], tonicPc: number): boolean {
  const rel = new Set(pitchClasses.map((pc) => (((pc - tonicPc) % 12) + 12) % 12))
  return rel.size === 7 && HARMONIC_MINOR.every((iv) => rel.has(iv))
}

/**
 * Natural modes read his map through the major key that owns the same seven chords.
 * Harmonic minor reads it through its natural-minor parent, with the raised seventh marked.
 */
export function relativeReading(
  from: Chord,
  to: Chord,
  kind: MoveKind,
  tonicPc: number,
  pitchClasses: number[],
  names: string[],
): RelativeReading | null {
  const harmonic = isHarmonicMinor(pitchClasses, tonicPc)
  const raised = (tonicPc + 11) % 12
  const lowered = (tonicPc + 10) % 12
  const parent = harmonic ? pitchClasses.map((pc) => (pc === raised ? lowered : pc)) : pitchClasses
  const t = relativeMajorTonic(parent)
  if (t === null) return null

  const naturalRoot = (pc: number) => (harmonic && pc === raised ? lowered : pc)
  const degreeOf = (pc: number) => MAJOR.indexOf((((naturalRoot(pc) - t) % 12) + 12) % 12)
  const a = degreeOf(from.rootPc)
  const b = degreeOf(to.rootPc)
  const id = `${kind}:${a}>${b}`
  const entry = POSTER[id]
  if (!entry) return null

  const keyName = `${names[t] ?? spellFallback(t)} major`
  const homeName = names[tonicPc] ?? spellFallback(tonicPc)
  const relChords = buildChords(t, getScale('major/major')!, names[t] ?? spellFallback(t))
  const his = `${relChords[a]!.symbol}→${relChords[b]!.symbol}`
  const altered = harmonic ? [from, to].filter((c) => hasPitch(c.notes, raised)) : []
  const homeIsRelativeMinor = (((tonicPc - t) % 12) + 12) % 12 === 9
  const touchesHome = from.rootPc === tonicPc || to.rootPc === tonicPc

  if (altered.length) {
    const endorsed = ENDORSED_ALTERATIONS[id]
    const ok = endorsed !== undefined && altered.every((c) => c === to && c.quality === endorsed.quality)
    const symbols = altered.map((c) => c.symbol).join(' and ')
    return {
      keyName,
      label: entry.label,
      reason: entry.reason,
      basis: entry.basis,
      carries: ok,
      note: ok
        ? `${his} in ${keyName}, with the raised seventh. ${endorsed!.note}`
        : `Closest match: ${his} in ${keyName}, “${entry.label}”. Here ${symbols} ${altered.length > 1 ? 'carry' : 'carries'} the raised seventh, which the C-major map never includes.`,
    }
  }

  const carries =
    tonicPc === t ||
    homeIsRelativeMinor ||
    (entry.basis === 'sound' && !touchesHome) ||
    (entry.basis === 'minorHome' && !touchesHome)

  let note: string
  if (homeIsRelativeMinor && tonicPc !== t) {
    note =
      entry.basis === 'majorGoal'
        ? `Same two chords as ${his} in ${keyName}. He says a minor key keeps the same relationships, so his word carries; his reason is phrased with ${names[t] ?? ''} as home.`
        : `Same two chords as ${his} in ${keyName}. He says a minor key keeps the same relationships, so his word carries.`
  } else if (carries) {
    note =
      entry.basis === 'minorHome'
        ? `Same two chords in ${keyName}, already read from ${names[(t + 9) % 12] ?? ''} minor as the point of rest.`
        : `Same two chords in ${keyName}. The reason is about the chords themselves, so it carries over.`
  } else if (entry.basis === 'majorGoal') {
    note = `Same two chords in ${keyName}: “${entry.label}”. That reading assumes ${names[t] ?? ''} is home; here ${homeName} is.`
  } else {
    note = `Same two chords in ${keyName}: “${entry.label}”. This move touches ${homeName}, which is home here but not in that key, so it may not carry.`
  }

  return { keyName, label: entry.label, reason: entry.reason, basis: entry.basis, carries, note }
}

function spellFallback(pc: number): string {
  return ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][pc]!
}

export type Counterpart = {
  label: string
  fromSymbol: string
  toSymbol: string
  fromRoman: string
  toRoman: string
  sameDegrees: boolean
  differences: string[]
}

type Side = {
  quality: Quality
  fn: Chord['fn']
  leadingTone: boolean
  tritone: boolean
}

type Signature = {
  kind: MoveKind
  ascending: boolean
  rootMotion: number
  from: Side
  to: Side
}

type PosterMove = { id: string; label: string; reason: string; from: Chord; to: Chord; sig: Signature }

const QUALITY_WORD: Record<Quality, string> = {
  maj: 'major',
  min: 'minor',
  dim: 'diminished',
  aug: 'augmented',
  sus: 'suspended',
  other: 'unclassified',
}

function side(chord: Chord, tonicPc: number): Side {
  return {
    quality: chord.quality,
    fn: chord.fn,
    leadingTone: hasPitch(chord.notes, leadingTonePc(tonicPc)),
    tritone: containsTritone(chord.notes),
  }
}

function signature(from: Chord, to: Chord, kind: MoveKind, ascending: boolean, tonicPc: number): Signature {
  return {
    kind,
    ascending,
    rootMotion: (((to.rootPc - from.rootPc) % 12) + 12) % 12,
    from: side(from, tonicPc),
    to: side(to, tonicPc),
  }
}

function sameSide(a: Side, b: Side): boolean {
  return a.quality === b.quality && a.fn === b.fn && a.leadingTone === b.leadingTone && a.tritone === b.tritone
}

function sameSignature(a: Signature, b: Signature): boolean {
  return (
    a.kind === b.kind &&
    a.ascending === b.ascending &&
    a.rootMotion === b.rootMotion &&
    sameSide(a.from, b.from) &&
    sameSide(a.to, b.to)
  )
}

let posterMoves: PosterMove[] | null = null

function poster(): PosterMove[] {
  if (posterMoves) return posterMoves
  const chords = buildChords(0, getScale('major/major')!, 'C')
  posterMoves = Object.entries(POSTER).map(([id, { label, reason }]) => {
    const [kind, pair] = id.split(':') as [MoveKind, string]
    const [a, b] = pair.split('>').map(Number) as [number, number]
    const from = chords[a]!
    const to = chords[b]!
    const step = kind === '2nds' ? 1 : kind === '3rds' ? 2 : 3
    const ascending = (a + step) % 7 === b
    return { id, label, reason, from, to, sig: signature(from, to, kind, ascending, 0) }
  })
  return posterMoves
}

function fnWord(fn: Chord['fn']): string {
  return fn ? FUNCTION_LABEL[fn] : 'no function'
}

function sideDifferences(here: Chord, hs: Side, his: Chord, ps: Side): string[] {
  const out: string[] = []
  if (hs.quality !== ps.quality) {
    out.push(`${here.symbol} is ${QUALITY_WORD[hs.quality]}; the matching ${his.symbol} is ${QUALITY_WORD[ps.quality]}.`)
  }
  if (hs.fn !== ps.fn) {
    out.push(`${here.symbol} acts as ${fnWord(hs.fn)}; the matching ${his.symbol} is ${fnWord(ps.fn)}.`)
  }
  if (hs.leadingTone !== ps.leadingTone) {
    out.push(
      hs.leadingTone
        ? `${here.symbol} carries the leading tone; the matching ${his.symbol} does not.`
        : `The matching ${his.symbol} carries the leading tone; ${here.symbol} does not.`,
    )
  }
  if (hs.tritone !== ps.tritone) {
    out.push(
      hs.tritone
        ? `${here.symbol} contains a tritone; the matching ${his.symbol} does not.`
        : `The matching ${his.symbol} contains a tritone; ${here.symbol} does not.`,
    )
  }
  return out
}

function semitoneWord(n: number): string {
  return n === 1 ? '1 semitone' : `${n} semitones`
}

export function provenance(
  from: Chord,
  to: Chord,
  kind: MoveKind,
  ascending: boolean,
  tonicPc: number,
  degreeCount: number,
): { source: Source; label: string | null; reason: string | null; counterpart: Counterpart | null } {
  if (degreeCount !== 7) return { source: 'extrapolated', label: null, reason: null, counterpart: null }

  const sig = signature(from, to, kind, ascending, tonicPc)
  const moves = poster()
  const sameDegrees = moves.find((m) => m.from.degree === from.degree && m.to.degree === to.degree && m.sig.kind === kind)
  const exact =
    (sameDegrees && sameSignature(sameDegrees.sig, sig) ? sameDegrees : null) ??
    moves.find((m) => sameSignature(m.sig, sig)) ??
    null

  const ref = exact ?? sameDegrees
  if (!ref) return { source: 'extrapolated', label: null, reason: null, counterpart: null }

  const differences = exact
    ? []
    : [
        ...(ref.sig.rootMotion !== sig.rootMotion
          ? [`The root moves ${semitoneWord(sig.rootMotion)} up here; in C major it moves ${semitoneWord(ref.sig.rootMotion)}.`]
          : []),
        ...sideDifferences(from, sig.from, ref.from, ref.sig.from),
        ...sideDifferences(to, sig.to, ref.to, ref.sig.to),
      ]

  return {
    source: exact ? 'poster' : 'extrapolated',
    label: exact ? exact.label : null,
    reason: exact ? exact.reason : null,
    counterpart: {
      label: ref.label,
      fromSymbol: ref.from.symbol,
      toSymbol: ref.to.symbol,
      fromRoman: ref.from.roman,
      toRoman: ref.to.roman,
      sameDegrees: ref === sameDegrees,
      differences,
    },
  }
}
