import { POSTER } from '../src/data/poster.ts'
import { evaluateMove } from '../src/data/rules.ts'
import { SCALES, getScale } from '../src/data/scales.ts'
import { buildChords } from '../src/theory/chords.ts'
import { buildScaleMap, isExperimental } from '../src/theory/map.ts'

let failed = 0
const fail = (msg: string) => {
  failed += 1
  console.error(msg)
}

if (Object.keys(POSTER).length !== 42) fail(`poster has ${Object.keys(POSTER).length} entries, expected 42`)

// The rule engine must reach his C-major words from his reasons alone.
const cChords = buildChords(0, getScale('major/major')!, 'C')
for (const [id, entry] of Object.entries(POSTER)) {
  const [kind, pair] = id.split(':') as ['2nds' | '3rds' | '4ths', string]
  const [a, b] = pair.split('>').map(Number) as [number, number]
  const step = kind === '2nds' ? 1 : kind === '3rds' ? 2 : 3
  const hit = evaluateMove({
    from: cChords[a]!,
    to: cChords[b]!,
    kind,
    ascending: (a + step) % 7 === b,
    tonicPc: 0,
    chords: cChords,
  })
  const ok = hit.label === entry.label
  if (!ok) fail(`rules ${id}  want="${entry.label}"  got="${hit.label}"`)
  else console.log(`ok  ${id}  ${entry.label}`)
}

const major = buildScaleMap(0, 'major/major')!
for (const e of major.edges) {
  if (e.source !== 'poster') fail(`C major move not traced to his map: ${e.id}`)
  if (e.label !== POSTER[e.id]?.label) fail(`C major map label drift ${e.id}: "${e.label}"`)
}

for (const scale of SCALES) {
  const m = buildScaleMap(0, scale.id)!
  const stable = m.chords.every((c) => ['maj', 'min', 'dim', 'aug'].includes(c.quality))
  const tonicOk = ['maj', 'min'].includes(m.chords[0]!.quality)
  if (m.chords.length !== 7 || !stable || !tonicOk) fail(`not assessable against his map: ${scale.id}`)
  const missing = m.edges.filter((e) => !e.label)
  if (missing.length) fail(`unlabeled ${scale.id}: ${missing.map((e) => e.id).join(', ')}`)
  for (const e of m.edges) {
    if (e.source === 'relative' && e.relative?.label !== e.label) fail(`relative label drift ${scale.id} ${e.id}`)
  }
  const felt = m.chords.map((c, i) => `${c.symbol}=${m.feelings[i]?.label ?? '—'}`).join('  ')
  console.log(
    `coverage ${scale.id.padEnd(24)} his map ${String(m.posterCount).padStart(2)} · his chords ${String(m.relativeCount).padStart(2)} / ${m.edges.length} · chord feelings ${m.feelings.filter(Boolean).length}/7`,
  )
  console.log(`         ${felt}`)
}

const expectFeeling = (rootPc: number, scaleId: string, symbol: string, want: string | null) => {
  const m = buildScaleMap(rootPc, scaleId)!
  const i = m.chords.findIndex((c) => c.symbol === symbol)
  const got = i < 0 ? 'missing chord' : (m.feelings[i]?.label ?? null)
  if (got !== want) fail(`feeling ${scaleId} ${symbol}: want ${want} got ${got}`)
}
expectFeeling(0, 'major/major', 'C', 'Peace')
expectFeeling(0, 'major/major', 'B°', 'Drama strikes')
expectFeeling(9, 'minor/aeolian', 'Am', 'Sadness')
expectFeeling(9, 'minor/aeolian', 'C', 'Peace')
expectFeeling(9, 'minor/harmonic', 'E', 'Anger, Intensity')
expectFeeling(9, 'minor/harmonic', 'G#°', null)
expectFeeling(0, 'minor/harmonic', 'G', 'Anger, Intensity')
expectFeeling(0, 'minor/aeolian', 'Gm', 'Loneliness, Exile, Desperation')
expectFeeling(0, 'minor/melodic', 'G', 'Anger, Intensity')
expectFeeling(2, 'minor/dorian', 'Dm', 'Resignation, Acceptance')
expectFeeling(7, 'dominant/mixolydian', 'G', 'Joy, Optimism')

// He says a minor key keeps the same relationships, so A natural minor carries all 42 of his words.
const aMinor = buildScaleMap(9, 'minor/aeolian')!
for (const e of aMinor.edges) {
  const want = major.edges.find((m) => m.kind === e.kind && m.from.symbol === e.from.symbol && m.to.symbol === e.to.symbol)
  if (!want) fail(`A minor move has no C major twin: ${e.id}`)
  else if (e.label !== want.label) fail(`A minor ${e.from.symbol}->${e.to.symbol}: want "${want.label}" got "${e.label}"`)
}

const fnOf = (rootPc: number, scaleId: string, symbol: string) =>
  buildScaleMap(rootPc, scaleId)!.chords.find((c) => c.symbol === symbol)?.fn ?? null
if (fnOf(0, 'minor/harmonic', 'Ab') === 'relativeTonic') fail('harmonic minor: Ab is the submediant, not the relative')
if (fnOf(0, 'major/harmonic', 'Em') === 'relativeTonic') fail('harmonic major: Em is the mediant, not the relative')
if (fnOf(0, 'minor/phrygian', 'G°') === 'dominant') fail('phrygian: a diminished chord cannot be the dominant')

const spelled = (rootPc: number, scaleId: string) => buildScaleMap(rootPc, scaleId)!.chords.map((c) => c.symbol).join(' ')
if (spelled(10, 'major/major') !== 'Bb Cm Dm Eb F Gm A°') fail(`Bb major spelled ${spelled(10, 'major/major')}`)
if (spelled(1, 'major/major') !== 'Db Ebm Fm Gb Ab Bbm C°') fail(`Db major spelled ${spelled(1, 'major/major')}`)
if (spelled(6, 'major/major') !== 'F# G#m A#m B C# D#m E#°') fail(`F# major spelled ${spelled(6, 'major/major')}`)

const ids = SCALES.map((s) => s.intervals.join(','))
if (new Set(ids).size !== ids.length) fail('two scales share the same intervals')

console.log(`experimental: ${SCALES.filter((s) => isExperimental(s.id)).map((s) => s.id).join(', ')}`)
if (isExperimental('major/major') || isExperimental('minor/aeolian')) fail('sourced scale marked experimental')

if (failed) {
  console.error(`${failed} failures`)
  process.exitCode = 1
}
