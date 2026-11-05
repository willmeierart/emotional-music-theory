import { FAMILIES, ROOTS, scalesInFamily, type FamilyId } from '../data/scales'
import { isExperimental } from '../theory/map'

type Props = {
  rootPc: number
  family: FamilyId
  scaleId: string
  onRoot: (pc: number) => void
  onFamily: (family: FamilyId) => void
  onScale: (id: string) => void
}

export function Selectors({ rootPc, family, scaleId, onRoot, onFamily, onScale }: Props) {
  const scales = scalesInFamily(family)

  return (
    <div className="selectors">
      <label className="field">
        <span>Root</span>
        <select value={rootPc} onChange={(e) => onRoot(Number(e.target.value))}>
          {ROOTS.map((r) => (
            <option key={r.pc} value={r.pc}>
              {'alt' in r ? `${r.name} / ${r.alt}` : r.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Family</span>
        <select
          value={family}
          onChange={(e) => {
            const next = e.target.value as FamilyId
            onFamily(next)
            const first = scalesInFamily(next)[0]
            if (first) onScale(first.id)
          }}
        >
          {FAMILIES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Scale</span>
        <select value={scaleId} onChange={(e) => onScale(e.target.value)}>
          {scales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.inferred ? ' ·' : ''}
              {isExperimental(s.id) ? ' (experimental)' : ''}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
