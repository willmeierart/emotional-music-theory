import type { MoveKind } from '../theory/cycles'

export type Selection =
  | { kind: 'none' }
  | { kind: 'node'; degree: number }
  | { kind: 'edge'; edgeId: string; moveKind: MoveKind }
