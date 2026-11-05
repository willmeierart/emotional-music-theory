export const ROOTS = [
  { pc: 0, name: 'C' },
  { pc: 1, name: 'C#', alt: 'Db' },
  { pc: 2, name: 'D' },
  { pc: 3, name: 'D#', alt: 'Eb' },
  { pc: 4, name: 'E' },
  { pc: 5, name: 'F' },
  { pc: 6, name: 'F#', alt: 'Gb' },
  { pc: 7, name: 'G' },
  { pc: 8, name: 'G#', alt: 'Ab' },
  { pc: 9, name: 'A' },
  { pc: 10, name: 'A#', alt: 'Bb' },
  { pc: 11, name: 'B' },
] as const

export const FAMILY_IDS = ['major', 'minor', 'dominant', 'suspended'] as const

export type FamilyId = (typeof FAMILY_IDS)[number]

export type Family = {
  id: FamilyId
  name: string
}

export const FAMILIES: Family[] = [
  { id: 'major', name: 'Major' },
  { id: 'minor', name: 'Minor' },
  { id: 'dominant', name: 'Dominant' },
  { id: 'suspended', name: 'Suspended' },
]

export type ScaleDef = {
  id: string
  name: string
  family: FamilyId
  /** Pitch classes from the tonic, including 0. */
  intervals: number[]
  /** True when the factory hardware never published intervals and this is a standard-theory stand-in. */
  inferred?: boolean
}

/**
 * Only scales his map can be held against: seven notes, every stacked triad
 * major / minor / diminished / augmented, and a major or minor tonic.
 */
export const SCALES: ScaleDef[] = [
  { id: 'major/major', family: 'major', name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'major/harmonic', family: 'major', name: 'Harmonic', intervals: [0, 2, 4, 5, 7, 8, 11] },
  { id: 'major/lydian', family: 'major', name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },

  { id: 'minor/dorian', family: 'minor', name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'minor/aeolian', family: 'minor', name: 'Aeolian', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'minor/phrygian', family: 'minor', name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'minor/romanian', family: 'minor', name: 'Romanian', intervals: [0, 2, 3, 6, 7, 9, 10] },
  { id: 'minor/melodic', family: 'minor', name: 'Melodic', intervals: [0, 2, 3, 5, 7, 9, 11] },
  { id: 'minor/harmonic', family: 'minor', name: 'Harmonic', intervals: [0, 2, 3, 5, 7, 8, 11] },

  { id: 'dominant/mixolydian', family: 'dominant', name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'dominant/lydian', family: 'dominant', name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 10] },
  { id: 'dominant/melodic-major', family: 'dominant', name: 'Melodic Major', intervals: [0, 2, 4, 5, 7, 8, 10] },
  { id: 'dominant/phrygian', family: 'dominant', name: 'Phrygian', intervals: [0, 1, 4, 5, 7, 8, 10] },

  { id: 'suspended/dorian-b2', family: 'suspended', name: 'Dorian (b2)', intervals: [0, 1, 3, 5, 7, 9, 10] },
]

export function scalesInFamily(family: FamilyId): ScaleDef[] {
  return SCALES.filter((s) => s.family === family)
}

export function getScale(id: string): ScaleDef | undefined {
  return SCALES.find((s) => s.id === id)
}
