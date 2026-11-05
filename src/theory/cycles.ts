export type MoveKind = '2nds' | '3rds' | '4ths'

export const CYCLE_STEPS: { kind: MoveKind; step: number }[] = [
  { kind: '2nds', step: 1 },
  { kind: '3rds', step: 2 },
  { kind: '4ths', step: 3 },
]

export type Cycle = {
  kind: MoveKind
  step: number
  /** Degree orbit starting at tonic. */
  degrees: number[]
  complete: boolean
  visited: number
  total: number
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = y
    y = x % y
    x = t
  }
  return x || 1
}

export function orbitFromTonic(n: number, step: number): number[] {
  if (n <= 0) return []
  const s = ((step % n) + n) % n
  if (s === 0) return [0]
  const out = [0]
  let d = s % n
  while (d !== 0) {
    out.push(d)
    d = (d + s) % n
  }
  return out
}

export function buildCycles(n: number): Cycle[] {
  return CYCLE_STEPS.map(({ kind, step }) => {
    const degrees = orbitFromTonic(n, step)
    const complete = n > 0 && degrees.length === n
    return {
      kind,
      step,
      degrees,
      complete,
      visited: degrees.length,
      total: n,
    }
  })
}

export function stepBetween(from: number, to: number, n: number): number {
  return ((to - from) % n + n) % n
}
