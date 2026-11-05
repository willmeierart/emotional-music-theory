# Triple Wheel

A static map of every chord change inside a scale: the only moves are a **2nd**, a **3rd**, or a **4th**. Pick a root, a family, and a scale. Click a node to hear the triad; click an arrow to hear the move.

Emotion labels are generated from reasons about tonic function, overtones, leading tones, and chord quality — reapplied to the chords you actually have. They are not a copy-paste of a C major poster. C major is the case those reasons were written for.

```bash
npm install
npm run dev
npm run build
```

`dist/` is a static site (`base: './'`) and can be dropped on any static host.

Interval formulas for a few obscure factory-scale aliases are marked with a trailing `·` in the scale menu.
