# 04 - Wavelet Functions

Previous: [[03 - Code Walkthrough/03 - Rock Physics and Reflectivity Helpers]]
Next: [[03 - Code Walkthrough/05 - Shared UI Primitives]]

## Ricker Wavelet

```jsx
const ricker = (t, f) => {
  const x = Math.PI * f * t;
  const x2 = x * x;
  return (1 - 2 * x2) * Math.exp(-x2);
};
```

This returns a zero-phase Ricker wavelet sample at time offset `t` and dominant frequency `f`.

The default app setting is Ricker at 30 Hz.

Related:

- [[02 - AVO Theory Primer#Wavelets and Tuning]]

## Sinc Helper

```jsx
const sinc = x => (Math.abs(x) < 1e-9 ? 1 : Math.sin(x) / x);
```

The Ormsby-style wavelet uses sinc functions. The special case near zero avoids dividing by zero.

## Ormsby-Style Wavelet

```jsx
function ormsby(t, f) {
  const corners = [0.35, 0.65, 1.35, 1.65].map(scale => Math.max(1, f * scale));
  const raw = (time) => {
    const [f1, f2, f3, f4] = corners;
    const term = (hi, lo) => {
      const pHi = Math.PI * hi;
      const pLo = Math.PI * lo;
      return ((pHi ** 2) * (sinc(pHi * time) ** 2) - (pLo ** 2) * (sinc(pLo * time) ** 2)) / (pHi - pLo);
    };
    return term(f4, f3) - term(f2, f1);
  };
  const norm = raw(0);
  return norm === 0 ? 0 : raw(t) / norm;
}
```

The Ormsby implementation derives four bandpass corners from the selected dominant frequency. This avoids exposing four extra frequency inputs in the UI.

Design choice:

The app needs to teach that wavelet shape and bandwidth matter. It does not need to behave like a processing suite with arbitrary corner-frequency editing.

Future roadmap:

- expose custom Ormsby corners in advanced mode.
- add phase rotation.

See [[07 - Design Roadmap#Wavelet Improvements]].

## Wavelet Selector

```jsx
function waveletSample(t, type, frequency) {
  return type === 'ormsby' ? ormsby(t, frequency) : ricker(t, frequency);
}
```

This keeps the synthetic gather simple. `SyntheticGather` does not need to know the details of each wavelet; it only asks for a sample.

Downstream:

- [[03 - Code Walkthrough/06 - Acoustic Properties and Wavelet Controls#Wavelet Preview]]
- [[03 - Code Walkthrough/08 - Synthetic Gather Rendering#Convolution Loop]]

