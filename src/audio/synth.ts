let ctx: AudioContext | null = null
let master: GainNode | null = null

export const TONES = [
  { id: 'warm', name: 'Warm' },
  { id: 'organ', name: 'Organ' },
  { id: 'reed', name: 'Reed' },
  { id: 'bell', name: 'Bell' },
  { id: 'choir', name: 'Choir' },
] as const

export type ToneId = (typeof TONES)[number]['id']

export type SynthOpts = {
  tone: ToneId
  decay: number
}

export const DEFAULT_TONE: ToneId = 'warm'
export const DEFAULT_DECAY = 0.9
export const MIN_DECAY = 0.3
export const MAX_DECAY = 2.4

type Voice = {
  pc: number
  midi: number
  tone: ToneId
  oscs: OscillatorNode[]
  extras: AudioNode[]
  gain: GainNode
  until: number
}

let voices: Voice[] = []

const PEAK: Record<ToneId, number> = {
  warm: 0.22,
  organ: 0.15,
  reed: 0.1,
  bell: 0.18,
  choir: 0.14,
}

const ATTACK: Record<ToneId, number> = {
  warm: 0.02,
  organ: 0.045,
  reed: 0.03,
  bell: 0.008,
  choir: 0.07,
}

function context(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function out(): GainNode {
  const ac = context()
  if (!master) {
    master = ac.createGain()
    master.gain.value = 0.8
    master.connect(ac.destination)
  }
  return master
}

function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

function voicing(pcs: number[]): { pc: number; midi: number }[] {
  const unique = [...new Set(pcs.map((pc) => ((pc % 12) + 12) % 12))]
  const base = 48
  return unique.map((pc, i) => {
    let midi = base + pc
    while (i > 0 && midi <= base + unique[0]!) midi += 12
    if (midi < 52) midi += 12
    return { pc, midi }
  })
}

function addOsc(ac: AudioContext, dest: AudioNode, type: OscillatorType, hz: number, detune = 0): OscillatorNode {
  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.value = hz
  osc.detune.value = detune
  osc.connect(dest)
  return osc
}

function buildTone(ac: AudioContext, midi: number, tone: ToneId, dest: AudioNode): { oscs: OscillatorNode[]; extras: AudioNode[] } {
  const hz = midiToHz(midi)
  const oscs: OscillatorNode[] = []
  const extras: AudioNode[] = []

  if (tone === 'warm') {
    const body = ac.createGain()
    body.gain.value = 0.35
    body.connect(dest)
    extras.push(body)
    oscs.push(addOsc(ac, dest, 'triangle', hz), addOsc(ac, body, 'sine', hz))
    return { oscs, extras }
  }

  if (tone === 'organ') {
    const drawbars: [number, number][] = [
      [0.5, 0.28],
      [1, 0.7],
      [2, 0.28],
      [3, 0.12],
      [4, 0.08],
    ]
    for (const [ratio, level] of drawbars) {
      const g = ac.createGain()
      g.gain.value = level
      g.connect(dest)
      extras.push(g)
      oscs.push(addOsc(ac, g, 'sine', hz * ratio))
    }
    return { oscs, extras }
  }

  if (tone === 'reed') {
    const filter = ac.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = Math.min(2200, hz * 3.6)
    filter.Q.value = 1.1
    filter.connect(dest)
    extras.push(filter)
    oscs.push(addOsc(ac, filter, 'sawtooth', hz))
    return { oscs, extras }
  }

  if (tone === 'bell') {
    const carrier = ac.createOscillator()
    const mod = ac.createOscillator()
    const modGain = ac.createGain()
    carrier.type = 'sine'
    mod.type = 'sine'
    carrier.frequency.value = hz
    mod.frequency.value = hz * 2.01
    modGain.gain.value = hz * 1.6
    mod.connect(modGain)
    modGain.connect(carrier.frequency)
    carrier.connect(dest)
    oscs.push(carrier, mod)
    extras.push(modGain)
    return { oscs, extras }
  }

  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 980
  filter.Q.value = 0.7
  filter.connect(dest)
  extras.push(filter)
  for (const detune of [-9, 0, 12]) {
    oscs.push(addOsc(ac, filter, 'sine', hz, detune))
  }
  return { oscs, extras }
}

function shapeGain(param: AudioParam, t: number, peak: number, attack: number, decay: number, legato: boolean) {
  param.cancelScheduledValues(t)
  if (legato) {
    const now = context().currentTime
    const held = t <= now + 0.012 ? Math.max(param.value, peak * 0.4) : peak
    param.setValueAtTime(Math.max(held, 0.0001), t)
    param.linearRampToValueAtTime(peak, t + attack * 0.45)
  } else {
    param.setValueAtTime(0.0001, t)
    param.linearRampToValueAtTime(peak, t + attack)
  }
  const hold = t + Math.max(attack, Math.min(0.07, decay * 0.18))
  param.setValueAtTime(peak, hold)
  param.exponentialRampToValueAtTime(0.0008, t + decay)
}

function startVoice(pc: number, midi: number, t: number, tone: ToneId, peak: number, decay: number): Voice {
  const ac = context()
  const gain = ac.createGain()
  gain.connect(out())
  const { oscs, extras } = buildTone(ac, midi, tone, gain)
  shapeGain(gain.gain, t, peak, ATTACK[tone], decay, false)
  for (const osc of oscs) osc.start(t)
  return { pc, midi, tone, oscs, extras, gain, until: t + decay }
}

function releaseVoice(voice: Voice, t: number) {
  const release = 0.12
  voice.gain.gain.cancelScheduledValues(t)
  const now = context().currentTime
  const level = t <= now + 0.012 ? Math.max(voice.gain.gain.value, 0.0001) : 0.0001
  voice.gain.gain.setValueAtTime(Math.max(level, 0.0001), t)
  voice.gain.gain.exponentialRampToValueAtTime(0.0008, t + release)
  voice.until = t + release
}

function reap(t: number) {
  const keep: Voice[] = []
  for (const voice of voices) {
    if (t < voice.until + 0.04) {
      keep.push(voice)
      continue
    }
    for (const osc of voice.oscs) {
      try {
        osc.stop(t)
      } catch {
        /* already stopped */
      }
    }
    try {
      voice.gain.disconnect()
    } catch {
      /* already disconnected */
    }
  }
  voices = keep
}

function playPcs(pcs: number[], start: number, opts: SynthOpts, velocity: number) {
  const tone = opts.tone
  const decay = Math.min(MAX_DECAY, Math.max(MIN_DECAY, opts.decay)) * (tone === 'bell' ? 0.78 : 1)
  const notes = voicing(pcs)
  const peak = (PEAK[tone] * velocity) / Math.max(notes.length, 1)
  const incoming = new Map(notes.map((n) => [n.pc, n]))

  reap(start)

  const next: Voice[] = []
  for (const voice of voices) {
    const keep = incoming.get(voice.pc)
    if (keep && voice.tone === tone && voice.until > start) {
      shapeGain(voice.gain.gain, start, peak, ATTACK[tone], decay, true)
      voice.until = start + decay
      incoming.delete(voice.pc)
      next.push(voice)
    } else {
      releaseVoice(voice, start)
      next.push(voice)
    }
  }

  for (const note of incoming.values()) {
    next.push(startVoice(note.pc, note.midi, start, tone, peak, decay))
  }
  voices = next
}

export function cutAll() {
  const t = ctx?.currentTime ?? 0
  for (const voice of voices) {
    for (const osc of voice.oscs) {
      try {
        osc.stop(t)
      } catch {
        /* already stopped */
      }
    }
    try {
      voice.gain.disconnect()
    } catch {
      /* already disconnected */
    }
  }
  voices = []
}

export async function resumeAudio(): Promise<void> {
  const ac = context()
  if (ac.state === 'suspended') await ac.resume()
}

export async function playChord(pcs: number[], opts: SynthOpts): Promise<void> {
  await resumeAudio()
  playPcs(pcs, context().currentTime, opts, 1)
}

export async function playMove(from: number[], to: number[], opts: SynthOpts): Promise<void> {
  await resumeAudio()
  const t = context().currentTime
  const gap = Math.max(0.16, Math.min(opts.decay * 0.48, 0.4))
  playPcs(from, t, opts, 0.88)
  playPcs(to, t + gap, opts, 1.05)
}
