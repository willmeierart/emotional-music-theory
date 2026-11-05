import { ALTERED_FEELINGS, DEGREE_FEELINGS, MAJOR_QUALITIES } from '../data/chordFeelings'
import type { Chord } from './chords'
import { explainChord } from './explain'
import { relativeMajorTonic } from './provenance'

export type ChordFeeling = {
  label: string
  reason: string
  theory: string
  /** `his`: his chord with his home. `relative`: his chord, read in the major key that owns it. */
  source: 'his' | 'relative'
  note: string | null
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11]
const ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
const ALTERED_ROMAN: Record<string, string> = { '2:maj': 'III', '1:maj': 'II' }

export function isRaisedMinorV(chord: Chord, tonicPc: number, homeQuality: Chord['quality']): boolean {
  return homeQuality === 'min' && chord.quality === 'maj' && (((chord.rootPc - tonicPc) % 12) + 12) % 12 === 7
}

/**
 * Scales that are a mode of a major key read every chord in that key. Other scales read
 * against home if its chord is major, or against its relative major if minor; chords that
 * fall outside that key, or change quality in ways he doesn't describe, get no feeling.
 */
export function chordFeelings(chords: Chord[], tonicPc: number, pitchClasses: number[], names: string[]): (ChordFeeling | null)[] {
  const home = chords[0]
  if (!home || chords.length !== 7) return chords.map(() => null)
  const exact = relativeMajorTonic(pitchClasses)
  const t = exact ?? (home.quality === 'maj' ? tonicPc : home.quality === 'min' ? (tonicPc + 3) % 12 : null)
  if (t === null) return chords.map(() => null)

  const keyName = `${names[t] ?? ''} major`
  const homeName = names[tonicPc] ?? ''
  const homeIsKey = t === tonicPc

  return chords.map((chord) => {
    const d = MAJOR.indexOf((((chord.rootPc - t) % 12) + 12) % 12)
    if (d < 0) return null

    if (chord.quality === MAJOR_QUALITIES[d]) {
      const entry = DEGREE_FEELINGS[d]!
      let note: string | null = null
      if (!homeIsKey) note = `${ROMAN[d]} of ${keyName}, the key whose chords these are. Here ${homeName} is home.`
      else if (exact === null) note = `Same chord and same home as in ${keyName}; other chords of this scale differ.`
      return {
        label: entry.label,
        reason: entry.reason,
        theory: explainChord(chord, home, names),
        source: homeIsKey ? 'his' : 'relative',
        note,
      }
    }

    const key = `${d}:${chord.quality}`
    const altered = ALTERED_FEELINGS[key]
    if (!altered || (altered.majorHomeOnly && !homeIsKey)) return null
    const raisedV = isRaisedMinorV(chord, tonicPc, home.quality)
    return {
      label: altered.label,
      reason: altered.reason,
      theory: explainChord(chord, home, names),
      source: homeIsKey ? 'his' : 'relative',
      note: raisedV
        ? `${ALTERED_ROMAN[key]} made major, in ${keyName}; here it is the V of ${homeName}. He says a minor key keeps the same relationships except this chord, whose nature changes a little by becoming major.`
        : homeIsKey
          ? `The ${ALTERED_ROMAN[key]} made major.`
          : `${ALTERED_ROMAN[key]} made major, in ${keyName}. Here ${homeName} is home.`,
    }
  })
}
