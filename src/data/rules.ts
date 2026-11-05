import type { Chord, FunctionName } from '../theory/chords'
import {
  containsTritone,
  hasPitch,
  isBright,
  isConsonant,
  isDark,
  leadingTonePc,
  sharedTones,
} from '../theory/chords'
import type { MoveKind } from '../theory/cycles'

export type RuleHit = {
  label: string
  because: string
  priority: number
}

export type MoveContext = {
  from: Chord
  to: Chord
  kind: MoveKind
  ascending: boolean
  tonicPc: number
  chords: Chord[]
}

function hasLT(chord: Chord, tonicPc: number): boolean {
  return hasPitch(chord.notes, leadingTonePc(tonicPc))
}

function related(a: Chord, b: Chord): boolean {
  return sharedTones(a.notes, b.notes).length >= 2
}

function fn(c: Chord, name: FunctionName): boolean {
  return c.fn === name
}

function rootInterval(from: Chord, to: Chord): number {
  return ((to.rootPc - from.rootPc) % 12 + 12) % 12
}

function pairAddsTritone(from: Chord, to: Chord): boolean {
  return !containsTritone(from.notes) && containsTritone(to.notes)
}

/**
 * Re-apply the video's stated reasons to the actual chords.
 * Highest priority hit wins. A fallback always defines the leftover pairs.
 */
export function evaluateMove(ctx: MoveContext): RuleHit {
  const hits: RuleHit[] = []
  const { from, to, kind, tonicPc } = ctx
  const ltFrom = hasLT(from, tonicPc)
  const ltTo = hasLT(to, tonicPc)

  // --- arriving home ---
  if (fn(to, 'tonic')) {
    if (fn(from, 'dominant') && ltFrom) {
      hits.push({
        priority: 100,
        label: to.quality === 'min' ? 'Dark resolution' : 'Bright resolution',
        because:
          to.quality === 'min'
            ? 'The leading tone resolves, but into a minor tonic: a resolution on the dark side.'
            : 'Dominant function plus a leading tone: the chord already promises the tonic.',
      })
    } else if (fn(from, 'dominantVariant')) {
      hits.push({
        priority: 98,
        label: to.quality === 'min' ? 'Dark resolution' : 'Bright resolution',
        because:
          to.quality === 'min'
            ? 'The unstable chord resolves into a minor tonic: a resolution, but on the dark side.'
            : 'The unstable dominant-variant (leading tone / tritone) collapses into the resting point.',
      })
    } else if (fn(from, 'relativeTonic') && from.quality === 'min' && to.quality === 'maj') {
      hits.push({
        priority: 96,
        label: 'Pure positive',
        because: 'Same two shared tones as the tonic, now in the major realm — a net gain, not a new object.',
      })
    } else if (fn(from, 'relativeTonic') && from.quality === 'maj' && to.quality === 'min') {
      hits.push({
        priority: 96,
        label: 'Soft return',
        because: 'The relative major settles back into the minor tonic: same material, shaded.',
      })
    } else if (fn(from, 'subdominant')) {
      hits.push({
        priority: 92,
        label: to.quality === 'min' ? 'Clouded peace' : 'Bright peace',
        because: 'Plagal return from the fourth above the tonic — home, without dominant gravity.',
      })
    } else if (kind === '2nds' && fn(from, 'subdominantRelative')) {
      hits.push({
        priority: 90,
        label: 'Clouded peace',
        because: 'Stepwise drop onto the tonic from the subdominant’s relative: peace with leftover nostalgia.',
      })
    } else if (kind === '3rds' && isDark(from.quality)) {
      hits.push({
        priority: 88,
        label: 'Soft return',
        because: 'A third away and darker: one note slides and the tonic is restored without a cadence.',
      })
    } else {
      hits.push({
        priority: 70,
        label: 'Peace',
        because: 'Arrival at the tonic, the resting point of the map.',
      })
    }
  }

  // --- leaving tonic ---
  if (fn(from, 'tonic')) {
    if (to.rootPc === (tonicPc + 5) % 12) {
      hits.push({
        priority: 100,
        label: to.quality === 'maj' ? 'Exploration, Warmth' : 'New, darkened',
        because:
          to.quality === 'maj'
            ? 'The fourth above the tonic is a fifth below it — falling onto something bigger — and that pitch is not in the tonic’s harmonic series.'
            : 'Same fall onto the fourth below the tonic, but the minor quality keeps the newness and takes the warmth away.',
      })
    }
    if (fn(to, 'dominant') && ltTo) {
      hits.push({
        priority: 97,
        label: 'Optimism, Energy',
        because: 'The fifth above the tonic, carrying a leading tone, already contains the promise of return.',
      })
    } else if (fn(to, 'dominant') && !ltTo) {
      hits.push({
        priority: 72,
        label: 'Open, unresolved',
        because: 'Root is a fifth above the tonic, but there is no leading tone — the Ionian “promise of home” does not fire.',
      })
    }
    if (fn(to, 'relativeTonic') && to.quality === 'min') {
      hits.push({
        priority: 94,
        label: 'Pure negative',
        because: 'Nothing wild is happening: the tonic is shaded into its other realm, two tones still shared.',
      })
    } else if (fn(to, 'relativeTonic') && to.quality === 'maj') {
      hits.push({
        priority: 94,
        label: 'Lift into the relative',
        because: 'The tonic’s relative major is the other-realm rest — brighter, still the same neighborhood.',
      })
    }
    if (fn(to, 'dominantVariant') || to.quality === 'dim' || to.quality === 'aug') {
      hits.push({
        priority: 93,
        label: 'Destabilisation',
        because: 'From homeostasis straight into an unstable sonority: too soon to say where it leads — a question mark.',
      })
    }
    if (kind === '3rds' && to.quality === 'min' && !fn(to, 'relativeTonic')) {
      hits.push({
        priority: 91,
        label: 'Lost balance, Loneliness',
        because: 'A third from tonic, one note moving, into a minor chord that wants the relative more than it wants home.',
      })
    }
    if (kind === '2nds' && (fn(to, 'subdominantRelative') || (to.quality === 'min' && rootInterval(from, to) === 2))) {
      hits.push({
        priority: 90,
        label: 'Dark development',
        because: 'Sliding up a step from the tonic into a minor chord: an energetic development, but on the dark side.',
      })
    }
  }

  // --- stepwise realm crossing (seconds do not share two tones) ---
  if (kind === '2nds' && from.quality === 'min' && to.quality === 'maj' && !fn(to, 'tonic')) {
    hits.push({
      priority: 83,
      label: fn(to, 'subdominant') ? 'Overcoming, Solace' : 'Oasis',
      because: 'Crossing from a darker chord into a brighter one a step away: warmth after the minor-side stretch.',
    })
  }
  if (kind === '2nds' && from.quality === 'maj' && to.quality === 'min' && !fn(from, 'tonic') && !fn(to, 'tonic')) {
    hits.push({
      priority: 83,
      label: 'Loss, Fragility',
      because: 'Crossing from a brighter chord into a darker one a step away: the warmth drops out at once.',
    })
  }

  // --- dissonance spike ---
  if ((to.quality === 'dim' || to.quality === 'aug' || pairAddsTritone(from, to)) && !fn(from, 'tonic')) {
    if (fn(from, 'subdominant') || fn(from, 'subdominantRelative')) {
      hits.push({
        priority: 95,
        label: 'Drama, Tension, Alarm',
        because: 'Consonant pre-dominant material slams into a diminished / tritone sonority — a blow to the landscape.',
      })
    } else if (fn(from, 'dominant') && (to.quality === 'dim' || fn(to, 'dominantVariant'))) {
      hits.push({
        priority: 86,
        label: 'Thickening, Added tension',
        because: 'Dominant and its variant are cousins; adding the extra dissonance (often a tritone) ramps the same function.',
      })
    } else if (kind === '2nds' && isConsonant(from.quality)) {
      hits.push({
        priority: 80,
        label: 'Confusion',
        because: 'A step into a diminished chord: its quality makes it unclear where the line is heading.',
      })
    } else if (isConsonant(from.quality)) {
      hits.push({
        priority: 80,
        label: 'Negative surprise',
        because: 'A sudden jump into a highly unstable chord — the “terrible blow” reason, wherever the qualities actually do that.',
      })
    }
  }

  if ((from.quality === 'dim' || from.quality === 'aug') && isConsonant(to.quality) && !fn(to, 'tonic')) {
    if (fn(to, 'dominant')) {
      hits.push({
        priority: 87,
        label: 'Release',
        because: 'The unstable chord clarifies into ordinary dominant function: clouds swept, focus achieved.',
      })
    } else if (fn(to, 'relativeTonic')) {
      hits.push({
        priority: 85,
        label: 'Dark resolution',
        because: 'Painful, but the relative tonic is still a rest — darkness with a floor.',
      })
    } else if (to.quality === 'min' && !related(from, to) && kind === '3rds') {
      hits.push({
        priority: 84,
        label: 'Miscalculation',
        because: 'Tense diminished material landing on an unrelated minor triad: an unfortunate surprise.',
      })
    } else if (fn(to, 'dominantRelative') || (to.quality === 'min' && kind === '4ths')) {
      hits.push({
        priority: 83,
        label: 'Despair, Anger',
        because: 'Alarm crossing into a darker stable chord — the drama is no longer a question, it is a state.',
      })
    }
  }

  // --- realm crossing (thirds-related quality flip) ---
  if (related(from, to) && from.quality !== to.quality) {
    if (from.quality === 'min' && to.quality === 'maj' && !fn(to, 'tonic')) {
      hits.push({
        priority: 82,
        label: fn(to, 'subdominant') ? 'Overcoming, Solace' : 'Oasis',
        because: 'Minor-side material crossing into a related major chord: warmth after isolation.',
      })
    }
    if (from.quality === 'maj' && to.quality === 'min' && !fn(from, 'tonic') && !fn(to, 'tonic')) {
      hits.push({
        priority: 82,
        label: 'Loss, Fragility',
        because: 'Major-side material crossing into a related minor chord: the warmth drops out at once.',
      })
    }
    if (fn(from, 'relativeTonic') && fn(to, 'subdominant')) {
      hits.push({
        priority: 89,
        label: 'Redemption, Support',
        because: 'A buoy out of the minor realm: the subdominant stops the sink into darker chords below.',
      })
    }
    if (fn(from, 'subdominant') && fn(to, 'relativeTonic')) {
      hits.push({
        priority: 89,
        label: 'Hardship',
        because: 'Leaving the solace of the fourth straight into the other-realm tonic — film-drama, not a cadence.',
      })
    }
  }

  // --- same quality seconds ---
  if (kind === '2nds' && from.quality === to.quality && from.quality !== 'other') {
    if (ctx.ascending && from.quality === 'maj') {
      hits.push({
        priority: 78,
        label: 'Heightened joy',
        because: 'Two matching major triads a step apart: the same object, cranked one notch on the bright side.',
      })
    } else if (ctx.ascending && from.quality === 'min') {
      hits.push({
        priority: 78,
        label: 'Heightened dramatic intensity',
        because: 'Two matching minor triads a step apart: the same tension, one notch higher.',
      })
    } else if (!ctx.ascending && from.quality === 'min') {
      hits.push({
        priority: 79,
        label: 'Faltering',
        because: 'The same minor weight, one step lower: shoulders fail and the line sags.',
      })
    } else if (!ctx.ascending && from.quality === 'maj') {
      hits.push({
        priority: 78,
        label: 'Easing off',
        because: 'Two matching major triads a step apart, descending: the bright object un-cranks one notch.',
      })
    }
  }

  const minorPair = from.quality === 'min' && to.quality === 'min'
  if (kind === '4ths' && minorPair && fn(from, 'relativeTonic') && fn(to, 'subdominantRelative')) {
    hits.push({
      priority: 80,
      label: 'Painful energy, Hope',
      because: 'Staying on the minor side and pushing on to the next minor chord: energy, but dark, with hope if it leads toward V.',
    })
  }
  if (kind === '4ths' && minorPair && fn(from, 'relativeTonic') && fn(to, 'dominantRelative')) {
    hits.push({
      priority: 80,
      label: 'Gravitas, Epicness',
      because: 'From the other-realm tonic back toward the darker dominant-relative: weight, still on the minor side.',
    })
  }

  // --- dim / unstable landings the earlier spike rules miss ---
  if ((from.quality === 'dim' || from.quality === 'aug') && to.quality === 'min' && kind === '3rds') {
    hits.push({
      priority: 86,
      label: 'Negative surprise',
      because: 'Unstable material landing on an unrelated minor triad a third away: an unfortunate surprise.',
    })
  }
  if ((from.quality === 'dim' || from.quality === 'aug') && isBright(to.quality) && kind === '4ths' && !fn(to, 'tonic')) {
    hits.push({
      priority: 88,
      label: 'Mystery, Magic',
      because: 'The wild card falling back toward the fourth: dissonance dissolving into something older, not home.',
    })
  }
  if (kind === '4ths' && !ctx.ascending && isDark(from.quality) && (to.quality === 'dim' || fn(to, 'dominantVariant'))) {
    hits.push({
      priority: 81,
      label: 'Unknown, Complexity',
      because: 'Walking backward on the fourths cycle into the unstable degree: a question with no promised answer.',
    })
  }
  if (kind === '3rds' && fn(from, 'subdominantRelative') && (to.quality === 'dim' || fn(to, 'dominantVariant'))) {
    hits.push({
      priority: 96,
      label: 'Uncertainty',
      because: 'The already-minor pre-dominant picks up the unpredictable seventh: hesitation on top of resignation.',
    })
  }
  if (kind === '3rds' && fn(from, 'subdominantRelative') && fn(to, 'subdominant')) {
    hits.push({
      priority: 85,
      label: 'Help, sweetness',
      because: 'The two subdominant relatives mesh: same ethos, brightened and softened.',
    })
  }
  if (kind === '3rds' && fn(from, 'subdominant') && fn(to, 'subdominantRelative')) {
    hits.push({
      priority: 85,
      label: 'Darkening',
      because: 'Same subdominant neighborhood, the major warmth taken off — a less exuberant version of the fourth.',
    })
  }

  // --- deceptive ---
  if (fn(from, 'dominant') && fn(to, 'relativeTonic') && ltFrom) {
    hits.push({
      priority: 99,
      label: 'Disappointment',
      because: 'A deceptive cadence: the dominant promised home and the bass takes the relative instead.',
    })
  }

  // --- relative as rest ---
  if (fn(to, 'relativeTonic') && !fn(from, 'tonic') && !fn(from, 'dominant')) {
    hits.push(
      to.quality === 'maj' && kind === '4ths'
        ? {
            priority: 74,
            label: 'Bright resolution',
            because: 'A fifth falling onto the relative major: a resolution on the bright side, though not home.',
          }
        : {
            priority: 74,
            label: 'Sad resolution, Acceptance',
            because: 'Arrival at the tonic’s relative: a temporary rest in the other realm, not homeostasis.',
          },
    )
  }

  // --- dominant without LT, leaving it ---
  if (fn(from, 'dominant') && fn(to, 'subdominant')) {
    hits.push({
      priority: 82,
      label: 'Calm',
      because: 'Challenging the expected drop to the tonic by stepping to the fourth instead tempers the cadence.',
    })
  }

  if (fn(from, 'relativeTonic') && fn(to, 'dominant') && ltTo) {
    hits.push({
      priority: 88,
      label: 'Positive transformation',
      because: 'Leaving the minor realm for a dominant that may release straight to the tonic.',
    })
  }

  if (fn(from, 'subdominantRelative') && fn(to, 'dominant')) {
    hits.push({
      priority: 75,
      label: 'Happy clarification',
      because: 'The pre-dominant leads on to V, the chord of happy expectation before home.',
    })
  }

  if (fn(from, 'dominant') && fn(to, 'subdominantRelative')) {
    hits.push({
      priority: 73,
      label: 'Setback',
      because: 'Dominant falling the “wrong” way, into the darker pre-dominant, instead of home.',
    })
  }

  if (kind === '3rds' && fn(from, 'dominant') && ltFrom && fn(to, 'dominantRelative')) {
    hits.push({
      priority: 90,
      label: 'Bad news, Left hanging',
      because: 'The leading tone we expected to resolve to the tonic just stays put in a darker chord.',
    })
  }

  if (kind === '3rds' && fn(from, 'dominantRelative') && fn(to, 'dominant') && isBright(to.quality)) {
    hits.push({
      priority: 90,
      label: 'Strength, Happy surprise',
      because: 'From the darker dominant-relative into V: unexpected ease, still inside dominant function.',
    })
  }

  if (kind === '4ths' && minorPair && fn(from, 'subdominantRelative') && fn(to, 'relativeTonic')) {
    hits.push({
      priority: 80,
      label: 'Closedness, Shyness',
      because: 'From the pre-dominant into the minor rest: nothing glorious, just retreating inwards.',
    })
  }

  hits.push(fallbackMove(ctx))
  hits.sort((a, b) => b.priority - a.priority)
  return hits[0]!
}

/** Last resort: every remaining pair still gets a named relationship. */
function fallbackMove(ctx: MoveContext): RuleHit {
  const { from, to, kind, ascending } = ctx

  if (fn(to, 'tonic')) {
    return {
      priority: 1,
      label: 'Peace',
      because: 'Arrival at the tonic, the resting point of the map.',
    }
  }
  if (fn(from, 'tonic')) {
    return {
      priority: 1,
      label: 'Leaving home',
      because: 'Leaving the tonic along this cycle — the resting point is behind you.',
    }
  }

  if (to.quality === 'dim' || to.quality === 'aug') {
    if (kind === '3rds') {
      return {
        priority: 1,
        label: 'Uncertainty',
        because: 'A third into an unstable chord: the seventh degree can still go almost anywhere.',
      }
    }
    if (kind === '2nds') {
      return {
        priority: 1,
        label: 'Negative surprise',
        because: 'A step into dissonance — the landscape lurches.',
      }
    }
    return {
      priority: 1,
      label: 'Drama, Tension, Alarm',
      because: 'A fourth into an unstable chord: a blow, not a cadence.',
    }
  }

  if (from.quality === 'dim' || from.quality === 'aug') {
    if (kind === '4ths' && isBright(to.quality)) {
      return {
        priority: 1,
        label: 'Mystery, Magic',
        because: 'The wild card dissolving into a brighter chord that is still not home.',
      }
    }
    if (to.quality === 'min') {
      return {
        priority: 1,
        label: kind === '4ths' ? 'Despair, Anger' : 'Negative surprise',
        because: 'Unstable material finding a darker floor — the alarm becomes a state.',
      }
    }
    return {
      priority: 1,
      label: 'Release',
      because: 'The unstable chord clarifies into something consonant.',
    }
  }

  if (from.quality === to.quality) {
    if (from.quality === 'min') {
      if (kind === '2nds') {
        return {
          priority: 1,
          label: ascending ? 'Heightened dramatic intensity' : 'Faltering',
          because: 'Two minor triads a step apart: the same tension, shifted one notch.',
        }
      }
      if (kind === '4ths') {
        return {
          priority: 1,
          label: ascending ? 'Closedness, Shyness' : 'Gravitas, Epicness',
          because: 'Two minor chords on the fourths cycle: staying in the dark realm.',
        }
      }
      return {
        priority: 1,
        label: 'Kindred shift',
        because: 'Two minor chords a third apart: same darkness, one note sliding.',
      }
    }
    if (from.quality === 'maj') {
      if (kind === '2nds') {
        return {
          priority: 1,
          label: ascending ? 'Heightened joy' : 'Easing off',
          because: 'Two major triads a step apart: the same bright object, one notch different.',
        }
      }
      if (kind === '4ths') {
        return {
          priority: 1,
          label: ascending ? 'Continuing the fall' : 'Turning back',
          because: 'Two major chords on the fourths cycle: gravity without a quality change.',
        }
      }
      return {
        priority: 1,
        label: 'Bright kinship',
        because: 'Two major chords a third apart: one note moves, the sun stays out.',
      }
    }
    return {
      priority: 1,
      label: 'Same-color step',
      because: `A ${kind} move between matching ${from.quality} sonorities.`,
    }
  }

  if (from.quality === 'min' && to.quality === 'maj') {
    return {
      priority: 1,
      label: kind === '2nds' ? 'Overcoming, Solace' : 'Oasis',
      because: 'Darker material crossing into a brighter chord: warmth after isolation.',
    }
  }
  if (from.quality === 'maj' && to.quality === 'min') {
    return {
      priority: 1,
      label: 'Loss, Fragility',
      because: 'Brighter material crossing into a darker chord: the warmth drops out.',
    }
  }

  return {
    priority: 1,
    label: 'Color shift',
    because: `A ${kind} ${ascending ? 'up' : 'down'} from ${from.quality} to ${to.quality}.`,
  }
}

export function structuralLine(from: Chord, to: Chord, kind: MoveKind, ascending: boolean): string {
  const interval = kind === '2nds' ? '2nd' : kind === '3rds' ? '3rd' : '4th'
  return `${ascending ? 'Up' : 'Down'} a ${interval}, ${from.quality} → ${to.quality}`
}
