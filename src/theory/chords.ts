import { ROOTS, type ScaleDef } from '../data/scales'

export type Quality = 'maj' | 'min' | 'dim' | 'aug' | 'sus' | 'other'

export type FunctionName =
  | 'tonic'
  | 'relativeTonic'
  | 'subdominant'
  | 'subdominantRelative'
  | 'dominant'
  | 'dominantRelative'
  | 'dominantVariant'

export const FUNCTION_LABEL: Record<FunctionName, string> = {
  tonic: 'tonic',
  relativeTonic: 'relative tonic',
  subdominant: 'subdominant',
  subdominantRelative: 'subdominant relative',
  dominant: 'dominant',
  dominantRelative: 'dominant relative',
  dominantVariant: 'dominant variant',
}

export type Chord = {
  degree: number
  rootPc: number
  notes: number[]
  quality: Quality
  symbol: string
  roman: string
  fn: FunctionName | null
}

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11]

const ROMAN: Record<number, string> = {
  0: 'I',
  1: 'bII',
  2: 'II',
  3: 'bIII',
  4: 'III',
  5: 'IV',
  6: 'bV',
  7: 'V',
  8: 'bVI',
  9: 'VI',
  10: 'bVII',
  11: 'VII',
}

export function preferFlats(rootName: string, intervals: number[]): boolean {
  if (rootName.includes('b')) return true
  if (rootName === 'F') return true
  const flats = intervals.filter((i) => FLAT[(i + 0) % 12]!.includes('b')).length
  return flats >= 3
}

export function spellPitch(pc: number, flats: boolean): string {
  return (flats ? FLAT : SHARP)[((pc % 12) + 12) % 12]!
}

/** Prefer one letter per degree for 7-note scales; otherwise chromatic spelling. */
export function spellScale(rootPc: number, intervals: number[], rootName: string): string[] {
  const n = intervals.length
  if (n !== 7) {
    const flats = preferFlats(rootName, intervals)
    return intervals.map((i) => spellPitch(rootPc + i, flats))
  }

  const rootLetter = rootName[0] as (typeof LETTERS)[number]
  const start = LETTERS.indexOf(rootLetter)
  if (start < 0) {
    const flats = preferFlats(rootName, intervals)
    return intervals.map((i) => spellPitch(rootPc + i, flats))
  }

  return intervals.map((iv, i) => {
    const letter = LETTERS[(start + i) % 7]!
    const natural = LETTER_PC[LETTERS.indexOf(letter)]!
    const want = ((rootPc + iv) % 12 + 12) % 12
    let delta = want - natural
    if (delta > 6) delta -= 12
    if (delta < -6) delta += 12
    if (delta === 0) return letter
    if (delta === 1) return `${letter}#`
    if (delta === -1) return `${letter}b`
    if (delta === 2) return `${letter}x`
    if (delta === -2) return `${letter}bb`
    return spellPitch(want, delta < 0)
  })
}

export function pcNameMap(rootPc: number, intervals: number[], rootName: string): string[] {
  const names = Array.from({ length: 12 }, (_, pc) => spellPitch(pc, preferFlats(rootName, intervals)))
  const spelled = spellScale(rootPc, intervals, rootName)
  intervals.forEach((iv, i) => {
    names[((rootPc + iv) % 12 + 12) % 12] = spelled[i]!
  })
  return names
}

export function qualityFromIntervals(root: number, notes: number[]): Quality {
  const unique = [...new Set(notes.map((n) => ((n - root) % 12 + 12) % 12))].sort((a, b) => a - b)
  const has = (i: number) => unique.includes(i)
  if (has(4) && has(7)) return 'maj'
  if (has(3) && has(7)) return 'min'
  if (has(3) && has(6)) return 'dim'
  if (has(4) && has(8)) return 'aug'
  if (has(5) && has(7) && !has(3) && !has(4)) return 'sus'
  if (has(4) && !has(3) && !has(7) && !has(8)) return 'maj'
  if (has(3) && !has(4) && !has(7) && !has(6)) return 'min'
  return 'other'
}

function qualitySuffix(q: Quality): string {
  switch (q) {
    case 'maj':
      return ''
    case 'min':
      return 'm'
    case 'dim':
      return '°'
    case 'aug':
      return '+'
    case 'sus':
      return 'sus'
    default:
      return '*'
  }
}

function romanFor(rootInterval: number, q: Quality): string {
  const base = ROMAN[rootInterval] ?? 'I'
  const lower = q === 'min' || q === 'dim' || q === 'sus'
  const body = lower ? base.replace(/[IV]+/, (m) => m.toLowerCase()) : base
  if (q === 'dim') return `${body}°`
  if (q === 'aug') return `${body}+`
  if (q === 'sus') return `${body}sus`
  if (q === 'other') return `${body}*`
  return body
}

export function stackTriad(pcs: number[], degree: number): number[] {
  const n = pcs.length
  if (n === 0) return []
  if (n === 1) return [pcs[0]!]
  if (n === 2) return [pcs[degree % n]!, pcs[(degree + 1) % n]!]
  return [pcs[degree % n]!, pcs[(degree + 2) % n]!, pcs[(degree + 4) % n]!]
}

export function leadingTonePc(tonicPc: number): number {
  return (tonicPc + 11) % 12
}

export function hasPitch(notes: number[], pc: number): boolean {
  return notes.some((n) => ((n % 12) + 12) % 12 === ((pc % 12) + 12) % 12)
}

export function sharedTones(a: number[], b: number[]): number[] {
  const setB = new Set(b.map((n) => ((n % 12) + 12) % 12))
  return [...new Set(a.map((n) => ((n % 12) + 12) % 12))].filter((n) => setB.has(n))
}

export function containsTritone(notes: number[]): boolean {
  const pcs = [...new Set(notes.map((n) => ((n % 12) + 12) % 12))]
  for (let i = 0; i < pcs.length; i++) {
    for (let j = i + 1; j < pcs.length; j++) {
      if (Math.abs(pcs[i]! - pcs[j]!) === 6) return true
    }
  }
  return false
}

/**
 * A relative is a rest in the other realm: the minor triad a minor third below a major one,
 * or the major triad a minor third above a minor one. Other two-shared-tone neighbours
 * (mediants, submediants) are not relatives, so a scale without one has none.
 */
export function relativeOf(chords: Chord[], src: Chord): Chord | null {
  const want =
    src.quality === 'maj'
      ? { pc: (src.rootPc + 9) % 12, quality: 'min' as const }
      : src.quality === 'min'
        ? { pc: (src.rootPc + 3) % 12, quality: 'maj' as const }
        : null
  if (!want) return null
  return chords.find((c) => c.rootPc === want.pc && c.quality === want.quality) ?? null
}

export function buildChords(rootPc: number, scale: ScaleDef, rootName: string): Chord[] {
  const pcs = scale.intervals.map((i) => (rootPc + i) % 12)
  const names = pcNameMap(rootPc, scale.intervals, rootName)
  const n = pcs.length

  const chords: Chord[] = pcs.map((root, degree) => {
    const notes = stackTriad(pcs, degree)
    const q = qualityFromIntervals(root, notes)
    const symbolRoot = names[root] ?? spellPitch(root, preferFlats(rootName, scale.intervals))
    return {
      degree,
      rootPc: root,
      notes,
      quality: q,
      symbol: `${symbolRoot}${qualitySuffix(q)}`,
      roman: romanFor(((root - rootPc) % 12 + 12) % 12, q),
      fn: null,
    }
  })

  if (n === 0) return chords

  const tonic = chords[0]!
  tonic.fn = 'tonic'

  const rel = relativeOf(chords, tonic)
  if (rel && rel.degree !== 0) rel.fn = 'relativeTonic'

  const stable = (c: Chord) => c.quality === 'maj' || c.quality === 'min'

  const sub = chords.find((c) => c.rootPc === (rootPc + 5) % 12 && stable(c)) ?? null
  if (sub) {
    sub.fn = sub.fn ?? 'subdominant'
    const subRel = relativeOf(chords, sub)
    if (subRel && !subRel.fn) subRel.fn = 'subdominantRelative'
  }

  const dom = chords.find((c) => c.rootPc === (rootPc + 7) % 12 && stable(c)) ?? null
  if (dom) {
    dom.fn = dom.fn ?? 'dominant'
    const domRel = relativeOf(chords, dom)
    if (domRel && !domRel.fn) domRel.fn = 'dominantRelative'
  }

  const lt = leadingTonePc(rootPc)
  for (const c of chords) {
    if (c.fn) continue
    const dimLike = c.quality === 'dim' || c.quality === 'aug'
    const sharesLt = hasPitch(c.notes, lt)
    const sharesTritoneWithDom = dom
      ? sharedTones(c.notes, dom.notes).length >= 1 && (containsTritone(c.notes) || containsTritone([...c.notes, ...dom.notes]))
      : containsTritone(c.notes)
    if (dimLike && (sharesLt || sharesTritoneWithDom)) {
      c.fn = 'dominantVariant'
    }
  }

  return chords
}

function accidentalWeight(names: string[]): number {
  return names.reduce((sum, n) => sum + (n.includes('x') || n.includes('bb') ? 2 : n.length > 1 ? 1 : 0), 0)
}

/** Sharp or flat name for a black-key root, whichever spells the scale with fewer accidentals. */
export function rootNameFor(pc: number, intervals: number[]): string {
  const root = ROOTS.find((r) => r.pc === pc)
  if (!root) return spellPitch(pc, false)
  if (!('alt' in root)) return root.name
  const sharp = accidentalWeight(spellScale(pc, intervals, root.name))
  const flat = accidentalWeight(spellScale(pc, intervals, root.alt))
  return flat < sharp ? root.alt : root.name
}

export function isDark(q: Quality): boolean {
  return q === 'min' || q === 'dim'
}

export function isBright(q: Quality): boolean {
  return q === 'maj' || q === 'aug'
}

export function isConsonant(q: Quality): boolean {
  return q === 'maj' || q === 'min' || q === 'sus'
}
