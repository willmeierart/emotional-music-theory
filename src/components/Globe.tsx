import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { saveView, type GlobeView } from '../persist'
import { findEdge, type ScaleMap } from '../theory/map'
import type { MoveKind } from '../theory/cycles'
import type { Selection } from './selection'

/** Every loop is a meridian of this sphere, passing through the hub chord at the north pole. */
const R = 240
const CAMERA = 4 * R
const NODE = 17
/**
 * On-screen distance from each loop to its arrow tracks. Each direction keeps to the right of its
 * travel, offset perpendicular to both the loop and the line of sight, so the gap holds from any angle.
 */
const TRACK_GAP = 14
/** Below this foreshortening the offset shrinks instead of swinging around a loop seen end-on. */
const END_ON = 0.35
const SAMPLES = 14
const RECENTER_MS = 650
const DRAG_RAD_PER_PX = 0.008
const DRAG_SLOP = 4

const KINDS: MoveKind[] = ['2nds', '3rds', '4ths']

const COLOR: Record<MoveKind, string> = {
  '3rds': '#e23b32',
  '2nds': '#7fd4e6',
  '4ths': '#f0d24a',
}

/** Plane of each loop around the polar axis; from above, the hub's six neighbours form his star. */
const AZIMUTH: Record<MoveKind, number> = {
  '4ths': 0,
  '2nds': -Math.PI / 3,
  '3rds': Math.PI / 3,
}

type View = { pitch: number; yaw: number }

/** Yaw 0 sits midway between loop planes, so no loop is seen edge-on. */
const TILTED: View = { pitch: (30 * Math.PI) / 180, yaw: 0 }
const ABOVE: View = { pitch: Math.PI / 2, yaw: 0 }

type Vec = [number, number, number]
type Projected = { x: number; y: number; z: number; scale: number }
type Offsets = Record<MoveKind, number>

const RESTING: Offsets = { '2nds': 0, '3rds': 0, '4ths': 0 }

function onLoop(kind: MoveKind, position: number, count: number, radius: number): Vec {
  const a = (2 * Math.PI * position) / count
  const b = AZIMUTH[kind]
  const s = Math.sin(a)
  return [radius * s * Math.cos(b), radius * Math.cos(a), radius * s * Math.sin(b)]
}

function eye(view: View): Vec {
  const cp = Math.cos(view.pitch)
  return [CAMERA * cp * Math.sin(view.yaw), CAMERA * Math.sin(view.pitch), CAMERA * cp * Math.cos(view.yaw)]
}

/** A point beside the loop; `side` +1 is right of travel in increasing position, -1 the other side. */
function trackPoint(kind: MoveKind, position: number, count: number, side: number, from: Vec): Vec {
  const p = onLoop(kind, position, count, R)
  const a = (2 * Math.PI * position) / count
  const b = AZIMUTH[kind]
  const t: Vec = [Math.cos(a) * Math.cos(b), -Math.sin(a), Math.cos(a) * Math.sin(b)]
  const ray: Vec = [from[0] - p[0], from[1] - p[1], from[2] - p[2]]
  const rl = Math.hypot(...ray) || 1
  const v: Vec = [
    (t[1] * ray[2] - t[2] * ray[1]) / rl,
    (t[2] * ray[0] - t[0] * ray[2]) / rl,
    (t[0] * ray[1] - t[1] * ray[0]) / rl,
  ]
  const k = (side * TRACK_GAP) / Math.max(Math.hypot(...v), END_ON)
  return [p[0] + k * v[0], p[1] + k * v[1], p[2] + k * v[2]]
}

function project([x, y, z]: Vec, view: View): Projected {
  const cp = Math.cos(view.pitch)
  const sp = Math.sin(view.pitch)
  const cy = Math.cos(view.yaw)
  const sy = Math.sin(view.yaw)
  const X = x * cy - z * sy
  const Y = -x * sp * sy + y * cp - z * sp * cy
  const Z = x * cp * sy + y * sp + z * cp * cy
  const scale = CAMERA / (CAMERA - Z)
  return { x: X * scale, y: -Y * scale, z: Z, scale }
}

function fade(z: number): number {
  return Math.min(1, Math.max(0.4, 0.4 + (0.6 * (z + R)) / (2 * R)))
}

type Arc = { d: string; mid: Projected; head: string }

/** `side` 0 is the loop itself; otherwise see `trackPoint`. */
function arc(kind: MoveKind, p0: number, p1: number, count: number, view: View, side = 0): Arc {
  const from = eye(view)
  const pts: Projected[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const position = p0 + ((p1 - p0) * i) / SAMPLES
    const point = side === 0 ? onLoop(kind, position, count, R) : trackPoint(kind, position, count, side, from)
    pts.push(project(point, view))
  }
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
  const half = SAMPLES / 2
  const mid = pts[half]!
  const a = pts[half - 1]!
  const b = pts[half + 1]!
  const angle = Math.atan2(b.y - a.y, b.x - a.x)
  const c = 5 * mid.scale
  const w = 0.6
  const tip = { x: mid.x + c * Math.cos(angle), y: mid.y + c * Math.sin(angle) }
  const l = { x: mid.x - c * Math.cos(angle - w), y: mid.y - c * Math.sin(angle - w) }
  const r = { x: mid.x - c * Math.cos(angle + w), y: mid.y - c * Math.sin(angle + w) }
  const head = `M ${l.x.toFixed(2)} ${l.y.toFixed(2)} L ${tip.x.toFixed(2)} ${tip.y.toFixed(2)} L ${r.x.toFixed(2)} ${r.y.toFixed(2)}`
  return { d, mid, head }
}

/** Degrees of a loop in order, starting from the hub. */
function ringFrom(degrees: number[], hub: number): number[] | null {
  const i = degrees.indexOf(hub)
  if (i < 0) return null
  return degrees.map((_, k) => degrees[(i + k) % degrees.length]!)
}

function neighborsOf(map: ScaleMap, hub: number): Set<number> {
  const out = new Set<number>()
  for (const cycle of map.cycles) {
    const ring = ringFrom(cycle.degrees, hub)
    if (!ring || ring.length < 2) continue
    out.add(ring[1]!)
    out.add(ring[ring.length - 1]!)
  }
  return out
}

/** How many steps each loop must slide so the new hub travels up to the pole. */
function recenterShifts(map: ScaleMap, from: number, to: number): Offsets {
  const out: Offsets = { ...RESTING }
  for (const cycle of map.cycles) {
    const ring = ringFrom(cycle.degrees, from)
    const count = cycle.degrees.length
    if (!ring || count < 2) continue
    let shift = ring.indexOf(to)
    if (shift < 0) continue
    if (shift > count / 2) shift -= count
    out[cycle.kind] = shift
  }
  return out
}

function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

type Props = {
  map: ScaleMap
  hub: number
  selection: Selection
  onNode: (degree: number) => void
  onEdge: (edgeId: string, kind: MoveKind) => void
  onHome: () => void
  initialView?: GlobeView | null
}

/** Lines are always painted beneath nodes so a chord is never hidden by its own loop. */
type Item = { key: string; z: number; layer: 0 | 1; el: ReactNode }

type Recenter = { starts: Offsets }

export function Globe({ map, hub, selection, onNode, onEdge, onHome, initialView }: Props) {
  const [view, setView] = useState<View>(() =>
    initialView && Number.isFinite(initialView.pitch) && Number.isFinite(initialView.yaw)
      ? {
          pitch: Math.min(Math.PI / 2, Math.max(-Math.PI / 2, initialView.pitch)),
          yaw: initialView.yaw,
        }
      : TILTED,
  )
  const [shownHub, setShownHub] = useState(hub)
  const [recenter, setRecenter] = useState<Recenter | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null)
  const dragged = useRef(false)

  useEffect(() => {
    const id = window.setTimeout(() => saveView(view), 180)
    return () => window.clearTimeout(id)
  }, [view])

  if (hub !== shownHub) {
    setShownHub(hub)
    setRecenter({ starts: recenterShifts(map, shownHub, hub) })
    setElapsed(0)
  }

  useEffect(() => {
    if (!recenter) return
    let frame = 0
    let start: number | null = null
    const tick = (t: number) => {
      start ??= t
      const e = t - start
      setElapsed(e)
      if (e >= RECENTER_MS) setRecenter(null)
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const finish = window.setTimeout(() => setRecenter(null), RECENTER_MS + 120)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(finish)
    }
  }, [recenter])

  useEffect(() => {
    function move(e: PointerEvent) {
      const d = drag.current
      if (!d) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (!d.moved && Math.hypot(dx, dy) < DRAG_SLOP) return
      d.moved = true
      dragged.current = true
      setView({
        yaw: d.view.yaw - dx * DRAG_RAD_PER_PX,
        pitch: Math.min(Math.PI / 2, Math.max(-Math.PI / 2, d.view.pitch + dy * DRAG_RAD_PER_PX)),
      })
    }
    function end() {
      drag.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [])

  const n = map.chords.length
  if (n === 0) return <p className="empty">This scale has no pitches.</p>

  function startDrag(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    dragged.current = false
    drag.current = { x: e.clientX, y: e.clientY, view, moved: false }
  }

  const next = neighborsOf(map, hub)

  function pickNode(degree: number) {
    if (dragged.current) return
    if (degree !== hub && !next.has(degree)) return
    onNode(degree)
  }

  function pickEdge(id: string, kind: MoveKind) {
    if (dragged.current) return
    const edge = map.edges.find((e) => e.id === id)
    if (!edge || edge.from.degree !== hub) return
    onEdge(id, kind)
  }

  function swallowDrag(e: ReactMouseEvent<SVGSVGElement>) {
    if (dragged.current) e.stopPropagation()
  }

  const progress = recenter ? ease(Math.min(1, elapsed / RECENTER_MS)) : 1
  const offsets: Offsets = recenter
    ? {
        '2nds': recenter.starts['2nds'] * (1 - progress),
        '3rds': recenter.starts['3rds'] * (1 - progress),
        '4ths': recenter.starts['4ths'] * (1 - progress),
      }
    : RESTING
  const resting = recenter === null

  const selectedDegree = selection.kind === 'node' ? selection.degree : null
  const selectedEdge = selection.kind === 'edge' ? selection.edgeId : null

  const items: Item[] = []

  function nodeItem(key: string, degree: number, p: Projected, fill: string | null) {
    const chord = map.chords[degree]!
    const isHub = degree === hub
    const reachable = isHub || next.has(degree)
    items.push({
      key,
      z: p.z,
      layer: 1,
      el: (
        <g
          key={key}
          className={`node ${isHub ? 'hub' : ''} ${degree === 0 ? 'tonic' : ''} ${selectedDegree === degree ? 'is-on' : ''} ${reachable ? '' : 'is-far'}`}
          transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${p.scale.toFixed(3)})`}
          opacity={degree === 0 ? Math.max(0.88, fade(p.z)) : fade(p.z)}
          role={reachable ? 'button' : undefined}
          tabIndex={reachable ? 0 : undefined}
          aria-label={chord.symbol}
          aria-disabled={reachable ? undefined : true}
          onClick={
            reachable
              ? (e) => {
                  e.stopPropagation()
                  pickNode(degree)
                }
              : undefined
          }
          onKeyDown={
            reachable
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') onNode(degree)
                }
              : undefined
          }
        >
          {degree === 0 ? (
            <g className="tonic-halo" aria-hidden="true">
              <circle className="tonic-glow" r={(isHub ? NODE + 1 : NODE) + 10} />
              <circle className="tonic-orbit" r={(isHub ? NODE + 1 : NODE) + 8} />
              <circle className="tonic-orbit tonic-orbit-inner" r={(isHub ? NODE + 1 : NODE) + 5.5} />
            </g>
          ) : null}
          <circle
            className={isHub ? 'hub-node' : undefined}
            r={isHub ? NODE + 1 : NODE}
            fill={isHub ? undefined : fill ?? undefined}
          />
          <text className={`node-label ${isHub ? 'hub-label' : ''}`} y="5" textAnchor="middle">
            {chord.symbol}
          </text>
        </g>
      ),
    })
  }

  for (const cycle of map.cycles) {
    const count = cycle.degrees.length
    const ring = ringFrom(cycle.degrees, hub)
    if (!ring || count < 2) continue
    const kind = cycle.kind
    const o = offsets[kind]

    for (let k = 0; k < count; k++) {
      const from = ring[k]!
      const to = ring[(k + 1) % count]!
      const p0 = k + o
      const p1 = k + 1 + o

      const track = arc(kind, p0, p1, count, view)
      items.push({
        key: `track-${kind}-${k}`,
        z: track.mid.z,
        layer: 0,
        el: (
          <path
            key={`track-${kind}-${k}`}
            className="loop-track"
            d={track.d}
            strokeWidth={4.5 * track.mid.scale}
            opacity={fade(track.mid.z)}
          />
        ),
      })

      const fwd = findEdge(map, kind, from, to)
      const showFwd = fwd && (fwd.from.degree === hub || selectedEdge === fwd.id)
      if (fwd && showFwd) {
        const live = fwd.from.degree === hub
        const a = arc(kind, p0, p1, count, view, 1)
        items.push({
          key: fwd.id,
          z: a.mid.z,
          layer: 0,
          el: (
            <Edge
              key={fwd.id}
              arc={a}
              label={fwd.label}
              selected={selectedEdge === fwd.id}
              live={live}
              onPick={live ? () => pickEdge(fwd.id, kind) : undefined}
              onKey={live ? () => onEdge(fwd.id, kind) : undefined}
            />
          ),
        })
      }
      const back = findEdge(map, kind, to, from)
      const showBack = back && (back.from.degree === hub || selectedEdge === back.id)
      if (back && showBack) {
        const live = back.from.degree === hub
        const a = arc(kind, p1, p0, count, view, -1)
        items.push({
          key: back.id,
          z: a.mid.z,
          layer: 0,
          el: (
            <Edge
              key={back.id}
              arc={a}
              label={back.label}
              selected={selectedEdge === back.id}
              live={live}
              onPick={live ? () => pickEdge(back.id, kind) : undefined}
              onKey={live ? () => onEdge(back.id, kind) : undefined}
            />
          ),
        })
      }

      if (k === 0 && resting) continue
      const p = project(onLoop(kind, p0, count, R), view)
      nodeItem(`${kind}-n-${from}`, from, p, from === hub ? null : COLOR[kind])
    }
  }

  if (resting) nodeItem('hub', hub, project([0, R, 0], view), null)

  items.sort((a, b) => a.layer - b.layer || a.z - b.z)

  return (
    <div className="globe">
      <svg
        className="wheel"
        viewBox="-310 -310 620 620"
        role="img"
        aria-label="Triple loop globe"
        onPointerDown={startDrag}
        onClick={swallowDrag}
      >
        {items.map((item) => item.el)}
      </svg>
      <div className="globe-bar">
        <ul className="legend">
          {KINDS.map((kind) => (
            <li key={kind}>
              <span className="swatch" style={{ background: COLOR[kind] }} />
              {kind}
            </li>
          ))}
        </ul>
        <span className="hint">Drag to turn</span>
        <div className="views">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onHome()
            }}
            disabled={hub === 0}
          >
            Return to root
          </button>
          <button type="button" onClick={() => setView(ABOVE)}>
            From above
          </button>
          <button type="button" onClick={() => setView(TILTED)}>
            Tilted
          </button>
        </div>
      </div>
    </div>
  )
}

function Edge({
  arc,
  label,
  selected,
  live,
  onPick,
  onKey,
}: {
  arc: Arc
  label: string
  selected: boolean
  live: boolean
  onPick?: () => void
  onKey?: () => void
}) {
  return (
    <g
      className={`edge ${selected ? 'is-on' : ''} ${live ? '' : 'is-spent'}`}
      opacity={fade(arc.mid.z)}
      role={live ? 'button' : undefined}
      tabIndex={live ? 0 : undefined}
      aria-label={label}
      onClick={
        onPick
          ? (e) => {
              e.stopPropagation()
              onPick()
            }
          : undefined
      }
      onKeyDown={
        onKey
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onKey()
            }
          : undefined
      }
    >
      {live ? <path className="edge-hit" d={arc.d} /> : null}
      <path className="edge-line" d={arc.d} />
      <path className="edge-line edge-head" d={arc.head} />
    </g>
  )
}
