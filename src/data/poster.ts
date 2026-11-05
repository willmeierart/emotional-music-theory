/**
 * What his stated reason rests on:
 * - sound: the two chords themselves (quality, shared tones, dissonance, direction).
 * - minorHome: he reasons from A minor as the point of rest.
 * - majorGoal: C is the expected destination, or the move leaves C as home.
 */
export type Basis = 'sound' | 'minorHome' | 'majorGoal'

export type PosterEntry = {
  label: string
  /** Paraphrase of the reason he gives in the videos. */
  reason: string
  basis: Basis
}

/**
 * His C-major tonal map (Kinote's emotion table), keyed by
 * `kind:fromDegree>toDegree` with 0 = C, 1 = Dm, 2 = Em, 3 = F, 4 = G, 5 = Am, 6 = B°.
 */
export const POSTER: Record<string, PosterEntry> = {
  '2nds:0>1': {
    label: 'Dark development',
    reason: 'Everything slides up a step from the tonic: an energetic development, but on the dark side.',
    basis: 'sound',
  },
  '2nds:1>0': {
    label: 'Clouded peace',
    reason: 'Still a peaceful return to the tonic, but more complicated than F to C because the minor chord shades it.',
    basis: 'majorGoal',
  },
  '2nds:1>2': {
    label: 'Heightened dramatic intensity',
    reason: 'Two harmonically identical minor chords a step apart: the same thing, ramped up in tension.',
    basis: 'sound',
  },
  '2nds:2>1': {
    label: 'Faltering',
    reason: 'The opposite of the ramp from D minor to E minor: the same weight, sagging.',
    basis: 'sound',
  },
  '2nds:2>3': {
    label: 'Overcoming, Solace',
    reason: 'Reaching a haven of warmth at the end of a desert of minor chords.',
    basis: 'sound',
  },
  '2nds:3>2': {
    label: 'Loss, Fragility',
    reason: 'F could release straight to C; instead it drops a half step into a minor chord, so something feels lost.',
    basis: 'majorGoal',
  },
  '2nds:3>4': {
    label: 'Heightened joy',
    reason: 'Two identical major chords a step apart: more of the same, more intense, on the bright side.',
    basis: 'sound',
  },
  '2nds:4>3': {
    label: 'Calm',
    reason: 'Instead of the expected drop from G to C, stepping to F tempers the cadence.',
    basis: 'majorGoal',
  },
  '2nds:4>5': {
    label: 'Disappointment',
    reason: 'The deceptive cadence: we expected G to resolve to C and got A minor instead.',
    basis: 'majorGoal',
  },
  '2nds:5>4': {
    label: 'Positive transformation',
    reason: 'Leaving the minor side for G, which might release straight to C.',
    basis: 'majorGoal',
  },
  '2nds:5>6': {
    label: 'Confusion',
    reason: 'Because of the diminished chord’s quality, it is unclear where the B is heading.',
    basis: 'sound',
  },
  '2nds:6>5': {
    label: 'Dark resolution',
    reason: 'B diminished resolves to A minor without difficulty: a resolution, but on the dark side.',
    basis: 'minorHome',
  },
  '2nds:6>0': {
    label: 'Bright resolution',
    reason: 'B diminished resolves to C with much the same effect as G does.',
    basis: 'majorGoal',
  },
  '2nds:0>6': {
    label: 'Destabilisation',
    reason: 'Going straight from the tonic to the seventh degree destabilises the picture; too soon to say where it leads.',
    basis: 'majorGoal',
  },

  '3rds:0>2': {
    label: 'Lost balance, Loneliness',
    reason: 'The C that founded the tonic slips a half step to B, so you lose your foundation.',
    basis: 'majorGoal',
  },
  '3rds:2>0': {
    label: 'Soft return',
    reason: 'One note moves and peace is restored: a soft return to the tonic.',
    basis: 'majorGoal',
  },
  '3rds:2>4': {
    label: 'Strength, Happy surprise',
    reason: 'We land straight on the fifth degree that leads back to C, without going round the cycle.',
    basis: 'majorGoal',
  },
  '3rds:4>2': {
    label: 'Bad news, Left hanging',
    reason: 'The B we expected to resolve up to C just stays where it is.',
    basis: 'majorGoal',
  },
  '3rds:4>6': {
    label: 'Thickening, Added tension',
    reason: 'Moving into the diminished chord adds tension to the dominant.',
    basis: 'sound',
  },
  '3rds:6>4': {
    label: 'Release',
    reason: 'The diminished chord clarifies into G: tension released, clouds swept away.',
    basis: 'sound',
  },
  '3rds:6>1': {
    label: 'Negative surprise',
    reason: 'A missed opportunity: B diminished was expected to go to C, and things did not go that way.',
    basis: 'majorGoal',
  },
  '3rds:1>6': {
    label: 'Uncertainty',
    reason: 'Hesitation added to an already-minor chord by the unpredictable seventh degree.',
    basis: 'sound',
  },
  '3rds:1>3': {
    label: 'Help, sweetness',
    reason: 'The two usual pre-dominant chords; going from D minor to F clarifies and adds sweetness.',
    basis: 'sound',
  },
  '3rds:3>1': {
    label: 'Darkening',
    reason: 'The same pre-dominant pair, going the darker way.',
    basis: 'sound',
  },
  '3rds:3>5': {
    label: 'Hardship',
    reason: 'We do not get the peace we expected from F to C, only the minor relative: heavier, more problematic.',
    basis: 'majorGoal',
  },
  '3rds:5>3': {
    label: 'Redemption, Support',
    reason: 'The reverse of hardship: out of the minor relative into the warmth of F.',
    basis: 'sound',
  },
  '3rds:5>0': {
    label: 'Pure positive',
    reason: 'Oscillating between the minor and major relatives: the closest thing to a plus sign in music.',
    basis: 'sound',
  },
  '3rds:0>5': {
    label: 'Pure negative',
    reason: 'Oscillating between the major and minor relatives: the closest thing to a minus sign in music.',
    basis: 'sound',
  },

  '4ths:0>3': {
    label: 'Exploration, Warmth',
    reason: 'A warm move away from stability, venturing a little into the unknown.',
    basis: 'majorGoal',
  },
  '4ths:3>0': {
    label: 'Bright peace',
    reason: 'A peaceful resolution, calmer and less bright than G to C.',
    basis: 'majorGoal',
  },
  '4ths:3>6': {
    label: 'Drama, Tension, Alarm',
    reason: 'Out in the unknown, drama strikes: the diminished chord arrives.',
    basis: 'sound',
  },
  '4ths:6>3': {
    label: 'Mystery, Magic',
    reason: 'The diminished chord falling to F feels whimsical and magical.',
    basis: 'sound',
  },
  '4ths:6>2': {
    label: 'Despair, Anger',
    reason: 'After the drama comes loneliness, despair and anger, even more so if the E chord is made major.',
    basis: 'sound',
  },
  '4ths:2>6': {
    label: 'Unknown, Complexity',
    reason: 'A rare progression he found hard to qualify: very complex.',
    basis: 'sound',
  },
  '4ths:2>5': {
    label: 'Sad resolution, Acceptance',
    reason: 'A minor is another point of stability, but a sad one: you can rest, though still inside the minor chords.',
    basis: 'minorHome',
  },
  '4ths:5>2': {
    label: 'Gravitas, Epicness',
    reason: 'The minor dominant of A minor; normally major, in minor it has a medieval, modal weight.',
    basis: 'minorHome',
  },
  '4ths:5>1': {
    label: 'Painful energy, Hope',
    reason: 'Staying on the minor side and going from A minor to D minor: lots of energy, but dark, with hope if it leads on toward V.',
    basis: 'minorHome',
  },
  '4ths:1>5': {
    label: 'Closedness, Shyness',
    reason: 'A very closed progression: nothing glorious, just retreating inwards.',
    basis: 'minorHome',
  },
  '4ths:1>4': {
    label: 'Happy clarification',
    reason: 'D minor leading on to V, the chord of happy expectation before C.',
    basis: 'majorGoal',
  },
  '4ths:4>1': {
    label: 'Setback',
    reason: 'We are used to ii–V–I, so going from V to ii runs the opposite way from what we expect.',
    basis: 'majorGoal',
  },
  '4ths:4>0': {
    label: 'Bright resolution',
    reason: 'V, the chord of happy expectation, lands back on I.',
    basis: 'majorGoal',
  },
  '4ths:0>4': {
    label: 'Optimism, Energy',
    reason: 'Leaping up a fifth from home to the most joyful chord.',
    basis: 'majorGoal',
  },
}
