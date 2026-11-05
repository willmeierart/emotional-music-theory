import {
  containsTritone,
  hasPitch,
  leadingTonePc,
  sharedTones,
  type Chord,
} from './chords'
import type { MoveKind } from './cycles'

const QUALITY: Record<Chord['quality'], string> = {
  maj: 'major',
  min: 'minor',
  dim: 'diminished',
  aug: 'augmented',
  sus: 'suspended',
  other: 'unclassified',
}

function nameOf(pc: number, names: string[]): string {
  return names[((pc % 12) + 12) % 12] ?? '?'
}

function list(words: string[]): string {
  if (words.length === 0) return ''
  if (words.length === 1) return words[0]!
  if (words.length === 2) return `${words[0]} and ${words[1]}`
  return `${words.slice(0, -1).join(', ')}, and ${words[words.length - 1]}`
}

function rootSpan(from: Chord, to: Chord): { steps: number; word: string } {
  const up = ((to.rootPc - from.rootPc) % 12 + 12) % 12
  const down = (12 - up) % 12
  if (up === 0) return { steps: 0, word: 'the same root' }
  if (up <= down) {
    const word = up === 1 ? 'a half step' : up === 2 ? 'a whole step' : up === 3 ? 'a minor third' : up === 4 ? 'a major third' : up === 5 ? 'a fourth' : up === 6 ? 'a tritone' : `${up} semitones`
    return { steps: up, word: `${word} up` }
  }
  const word = down === 1 ? 'a half step' : down === 2 ? 'a whole step' : down === 3 ? 'a minor third' : down === 4 ? 'a major third' : down === 5 ? 'a fifth' : down === 6 ? 'a tritone' : `${down} semitones`
  return { steps: -down, word: `${word} down` }
}

function qualityWhy(q: Chord['quality']): string {
  switch (q) {
    case 'maj':
      return 'A major triad matches the first overtones of its root, so the ear hears it as open and settled.'
    case 'min':
      return 'A minor triad lowers the middle note by a half step. That note is not in the root’s overtones, so the same shape sounds shaded.'
    case 'dim':
      return 'A diminished triad stacks two minor thirds. The outer notes form a tritone, the most restless interval in the key, so the chord cannot sit still.'
    case 'aug':
      return 'An augmented triad stretches the fifth up a half step, so every interval is a major third and nothing points home.'
    case 'sus':
      return 'A suspended chord replaces the third with a second or fourth, so it has no major or minor color yet — it waits to resolve.'
    default:
      return 'The stacked notes do not form a simple triad, so the ear has no familiar major or minor color to hold onto.'
  }
}

function functionWhy(chord: Chord, tonic: Chord): string | null {
  switch (chord.fn) {
    case 'tonic':
      return `${chord.symbol} is home: the key is named for it, and none of its notes are pulled toward somewhere else.`
    case 'relativeTonic':
      return `${chord.symbol} shares two notes with ${tonic.symbol}, so it can act as a second home — the same neighborhood with the lights turned down.`
    case 'subdominant':
      return `${chord.symbol} is the subdominant. Its root sits a fifth below home, which feels like stepping into a larger, older room, and it has no leading tone, so it does not force a landing.`
    case 'subdominantRelative':
      return `${chord.symbol} is the usual partner of the subdominant. Songs often use it to aim at the dominant (the “two–five”), so it feels unfinished but not dramatic.`
    case 'dominant':
      return `${chord.symbol} is the dominant. It sits a fifth above home and usually carries the leading tone, a note a half step below the tonic that strongly wants to rise. That stored pull is what reads as bright expectation.`
    case 'dominantRelative':
      return `${chord.symbol} shares two notes with the dominant, so it belongs to that restless side of the key without being the full cadence chord.`
    case 'dominantVariant':
      return `${chord.symbol} is a stand-in for the dominant: it carries the leading tone or the key’s tritone, the same tension, in a less stable shape.`
    default:
      return null
  }
}

/** Plain-English account of why this chord can carry its feeling. */
export function explainChord(chord: Chord, tonic: Chord, names: string[]): string {
  const notes = chord.notes.map((pc) => nameOf(pc, names))
  const bits = [`${chord.symbol} is ${list(notes)}, a ${QUALITY[chord.quality]} triad. ${qualityWhy(chord.quality)}`]
  const role = functionWhy(chord, tonic)
  if (role) bits.push(role)

  if (chord.degree !== 0) {
    const shared = sharedTones(chord.notes, tonic.notes).map((pc) => nameOf(pc, names))
    const span = rootSpan(tonic, chord)
    if (shared.length) {
      bits.push(`Against home, the root is ${span.word}, and they still share ${list(shared)}.`)
    } else {
      bits.push(`Against home, the root is ${span.word}, and they share no notes, so the ear has to jump.`)
    }
  }

  const lt = leadingTonePc(tonic.rootPc)
  if (hasPitch(chord.notes, lt) && chord.fn !== 'tonic') {
    bits.push(`It contains ${nameOf(lt, names)}, the leading tone, which wants to resolve up into ${tonic.symbol}.`)
  }
  if (containsTritone(chord.notes)) {
    bits.push('The tritone inside it wants to split apart, which is why the chord feels like an event rather than a place to rest.')
  }

  return bits.join(' ')
}

function cadenceWhy(from: Chord, to: Chord, tonicPc: number): string | null {
  const toHome = to.rootPc === tonicPc
  const fromDom = from.fn === 'dominant' || from.fn === 'dominantVariant'
  const span = rootSpan(from, to)

  if (toHome && fromDom) {
    return `This is an authentic cadence: the dominant side of the key collapsing into home. The leading tone rises, and the ear hears a full stop.`
  }
  if (toHome && from.fn === 'subdominant') {
    return `This is a plagal cadence (the “Amen” cadence). The bass often falls a fourth or rises a fifth onto home, but there is no leading tone, so the landing is warm rather than final-sounding.`
  }
  if (toHome && from.fn === 'relativeTonic') {
    return `Home and its relative share two notes, so only one pitch has to move. The color flips from minor to major (or the reverse) while the place stays almost the same.`
  }
  if (from.fn === 'dominant' && to.fn === 'relativeTonic') {
    return `This is a deceptive cadence. The dominant promised home; the bass takes the relative instead. The leading tone is still there, but the chord it lands in is minor, so the expected sunlight does not arrive.`
  }
  if (from.fn === 'subdominantRelative' && to.fn === 'dominant') {
    return `This is the standard “two–five”: a mild minor chord aiming at the dominant. It clarifies where the phrase is going and loads the pull toward home.`
  }
  if (from.fn === 'dominant' && to.fn === 'subdominantRelative') {
    return `This runs the two–five backwards. The ear is used to tightening toward a cadence, so loosening back to the pre-dominant feels like a setback.`
  }
  if (from.fn === 'dominant' && to.fn === 'subdominant') {
    return `The dominant wanted to fall to home. Going to the subdominant instead lets the leading tone drop rather than rise, which lets the air out of the cadence.`
  }
  if (Math.abs(span.steps) === 5 || Math.abs(span.steps) === 7) {
    if (to.fn === 'relativeTonic' && from.quality === 'min' && to.quality === 'min') {
      return `A falling fifth onto the relative minor is the same “coming home” shape as a cadence, but the home is the sad one.`
    }
  }
  return null
}

/** Plain-English account of why this two-chord move can carry its feeling. */
export function explainMove(from: Chord, to: Chord, kind: MoveKind, tonicPc: number, names: string[]): string {
  const shared = sharedTones(from.notes, to.notes).map((pc) => nameOf(pc, names))
  const span = rootSpan(from, to)
  const kindWord = kind === '2nds' ? 'step' : kind === '3rds' ? 'third' : 'fourth'
  const bits: string[] = []

  bits.push(`${from.symbol} to ${to.symbol} is a ${kindWord}: the root moves ${span.word}.`)

  if (shared.length) {
    const moving = kind === '3rds' && shared.length === 2
    bits.push(
      moving
        ? `They keep ${list(shared)}, so only one note changes. That is why a third can feel like a tint more than a journey.`
        : `They still share ${list(shared)}, so the ear hears kinship, not a hard cut.`,
    )
  } else {
    bits.push('They share no notes, so every voice has to move. That is why a step between two majors or two minors can feel like a ramp rather than a pivot.')
  }

  if (from.quality !== to.quality) {
    if (from.quality === 'maj' && to.quality === 'min') {
      bits.push('Major to minor takes the bright third away, so the same motion arrives darker.')
    } else if (from.quality === 'min' && to.quality === 'maj') {
      bits.push('Minor to major puts that bright third back, so the motion can feel like relief or warmth.')
    } else if (to.quality === 'dim') {
      bits.push('Landing on a diminished chord introduces a tritone, which has no comfortable place to sit, so the feeling turns to alarm or confusion.')
    } else if (from.quality === 'dim' && (to.quality === 'maj' || to.quality === 'min')) {
      bits.push('Leaving the diminished chord lets the tritone resolve into an ordinary triad, which the ear reads as release — bright if that triad is major, dark if it is minor.')
    }
  } else if (from.quality === 'min' && to.quality === 'min') {
    bits.push('Both chords are minor, so the color stays on the dark side; only the height and the function change.')
  } else if (from.quality === 'maj' && to.quality === 'maj') {
    bits.push('Both chords are major, so the color stays bright; the feeling comes from where you are in the key, not from a mode change.')
  }

  const lt = leadingTonePc(tonicPc)
  const ltFrom = hasPitch(from.notes, lt)
  const ltTo = hasPitch(to.notes, lt)
  const home = nameOf(tonicPc, names)
  if (ltFrom && !ltTo && to.rootPc === tonicPc) {
    bits.push(`${nameOf(lt, names)} is the leading tone. Here it finally steps up to ${home}, which is the classic “arrived” sound.`)
  } else if (ltFrom && ltTo) {
    bits.push(`${nameOf(lt, names)}, the leading tone, is in both chords, so it never resolves. The promise of ${home} stays hanging.`)
  } else if (!ltFrom && ltTo) {
    bits.push(`${to.symbol} brings in ${nameOf(lt, names)}, the leading tone, which suddenly aims the music at ${home}.`)
  }

  if (!containsTritone(from.notes) && containsTritone(to.notes)) {
    bits.push('A tritone appears in the second chord. That interval wants to split, so the move feels like something breaking open.')
  } else if (containsTritone(from.notes) && !containsTritone(to.notes)) {
    bits.push('The tritone closes. Whatever drama the first chord held is spent.')
  }

  const named = cadenceWhy(from, to, tonicPc)
  if (named) bits.push(named)

  return bits.join(' ')
}
