import { MAX_DECAY, MIN_DECAY, TONES, type ToneId } from '../audio/synth'

type Props = {
  tone: ToneId
  decay: number
  onTone: (tone: ToneId) => void
  onDecay: (decay: number) => void
  onHear: () => void
}

export function SynthBar({ tone, decay, onTone, onDecay, onHear }: Props) {
  return (
    <footer
      className="synth-bar"
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <label className="field">
        <span>Tone</span>
        <select value={tone} onChange={(e) => onTone(e.target.value as ToneId)}>
          {TONES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Decay</span>
        <div className="decay-row">
          <input
            type="range"
            min={MIN_DECAY}
            max={MAX_DECAY}
            step={0.1}
            value={decay}
            aria-valuetext={`${decay.toFixed(1)} seconds`}
            onChange={(e) => onDecay(Number(e.target.value))}
            onPointerUp={onHear}
            onKeyUp={onHear}
          />
          <span className="decay-readout">{decay.toFixed(1)}s</span>
        </div>
      </label>
    </footer>
  )
}
