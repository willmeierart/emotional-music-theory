import { DEFAULT_DECAY, DEFAULT_TONE, MAX_DECAY, MIN_DECAY, TONES, type ToneId } from './audio/synth'
import type { Selection } from './components/selection'
import { FAMILY_IDS, getScale, type FamilyId } from './data/scales'
import type { MoveKind } from './theory/cycles'
import { buildScaleMap } from './theory/map'

const KEY = 'emotion-scales:v1'

export type GlobeView = { pitch: number; yaw: number }

export type Session = {
  rootPc: number
  family: FamilyId
  scaleId: string
  selection: Selection
  hub: number
  tone: ToneId
  decay: number
  view: GlobeView | null
}

const DEFAULTS: Session = {
  rootPc: 0,
  family: 'major',
  scaleId: 'major/major',
  selection: { kind: 'none' },
  hub: 0,
  tone: DEFAULT_TONE,
  decay: DEFAULT_DECAY,
  view: null,
}

function readRaw(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function writeRaw(patch: Record<string, unknown>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readRaw(), ...patch }))
  } catch {
    /* private mode or full */
  }
}

function isFamily(value: unknown): value is FamilyId {
  return typeof value === 'string' && (FAMILY_IDS as readonly string[]).includes(value)
}

function isTone(value: unknown): value is ToneId {
  return typeof value === 'string' && TONES.some((t) => t.id === value)
}

function isMoveKind(value: unknown): value is MoveKind {
  return value === '2nds' || value === '3rds' || value === '4ths'
}

function parseSelection(value: unknown): Selection {
  if (!value || typeof value !== 'object') return { kind: 'none' }
  const raw = value as Record<string, unknown>
  if (raw.kind === 'none') return { kind: 'none' }
  if (raw.kind === 'node' && Number.isInteger(raw.degree) && (raw.degree as number) >= 0) {
    return { kind: 'node', degree: raw.degree as number }
  }
  if (raw.kind === 'edge' && typeof raw.edgeId === 'string' && isMoveKind(raw.moveKind)) {
    return { kind: 'edge', edgeId: raw.edgeId, moveKind: raw.moveKind }
  }
  return { kind: 'none' }
}

function parseView(value: unknown): GlobeView | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.pitch !== 'number' || typeof raw.yaw !== 'number') return null
  if (!Number.isFinite(raw.pitch) || !Number.isFinite(raw.yaw)) return null
  return { pitch: raw.pitch, yaw: raw.yaw }
}

export function readSession(): Session {
  const raw = readRaw()
  const scaleId = typeof raw.scaleId === 'string' && getScale(raw.scaleId) ? raw.scaleId : DEFAULTS.scaleId
  const scale = getScale(scaleId)!
  const family = isFamily(raw.family) && raw.family === scale.family ? raw.family : scale.family
  const rootPc = Number.isInteger(raw.rootPc) && (raw.rootPc as number) >= 0 && (raw.rootPc as number) <= 11
    ? (raw.rootPc as number)
    : DEFAULTS.rootPc
  const map = buildScaleMap(rootPc, scaleId)
  const degrees = map?.chords.length ?? 0
  const hub = Number.isInteger(raw.hub) && (raw.hub as number) >= 0 && (raw.hub as number) < degrees ? (raw.hub as number) : 0
  const parsed = parseSelection(raw.selection)
  const selection: Selection =
    (parsed.kind === 'node' && parsed.degree >= degrees) ||
    (parsed.kind === 'edge' && !map?.edges.some((e) => e.id === parsed.edgeId))
      ? { kind: 'none' }
      : parsed
  const tone = isTone(raw.tone) ? raw.tone : DEFAULTS.tone
  const decay =
    typeof raw.decay === 'number' && Number.isFinite(raw.decay)
      ? Math.min(MAX_DECAY, Math.max(MIN_DECAY, raw.decay))
      : DEFAULTS.decay

  return {
    rootPc,
    family,
    scaleId,
    selection,
    hub,
    tone,
    decay,
    view: parseView(raw.view),
  }
}

export function saveSession(session: Omit<Session, 'view'>) {
  writeRaw(session)
}

export function saveView(view: GlobeView) {
  writeRaw({ view })
}
