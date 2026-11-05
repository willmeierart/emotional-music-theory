import type { Quality } from '../theory/chords'

/**
 * His feeling for each chord of a major key, from his video on the emotional archetypes of
 * the scale degrees (youtube.com/watch?v=TUQDxEKcsGY). Labels keep his words; reasons paraphrase.
 */
export type ChordFeelingEntry = { label: string; reason: string }

/** Indexed by major-key degree: I ii iii IV V vi vii°. */
export const DEGREE_FEELINGS: ChordFeelingEntry[] = [
  {
    label: 'Peace',
    reason: 'Home. Every need is met and nothing threatens: the musical equivalent of homeostasis.',
  },
  {
    label: 'Resignation, Acceptance',
    reason:
      'The last minor chord before the cycle of fifths turns back to the major side. It has a lightness the other minor chords lack, and it is slippery: it can tip into major or slide back into minor.',
  },
  {
    label: 'Loneliness, Exile, Desperation',
    reason: 'The saddest chord of the scale.',
  },
  {
    label: 'Heartwarming exploration',
    reason:
      'It opens new doors yet feels like returning to something older and bigger. Comforting, like a big hug; often where the chills come in a piece.',
  },
  {
    label: 'Joy, Optimism',
    reason: 'Joyful expectation of the peace of home: a happy tension that points strongly toward the tonic.',
  },
  {
    label: 'Sadness',
    reason: 'The sad version of the tonic. Stable enough to end on, but on the dark side: sadness you can still live with.',
  },
  {
    label: 'Drama strikes',
    reason:
      'The unpredictable event that shakes the natural course of things. Composers often use it to cross from the major world into the minor.',
  },
]

export const MAJOR_QUALITIES: Quality[] = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim']

/** Altered degrees he describes, keyed `degree:quality`. */
export const ALTERED_FEELINGS: Record<string, ChordFeelingEntry & { majorHomeOnly: boolean }> = {
  '2:maj': {
    label: 'Anger, Intensity',
    reason: 'When the third degree is made major it catches fire: flamenco in the afternoon sun.',
    majorHomeOnly: false,
  },
  '1:maj': {
    label: 'Excitement',
    reason: 'Made major, the second degree becomes the dominant of the dominant and always brings excitement.',
    majorHomeOnly: true,
  },
}
