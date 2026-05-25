# 08 - Synthetic Gather Rendering

Previous: [[03 - Code Walkthrough/07 - Impedance Log Rendering]]
Next: [[03 - Code Walkthrough/09 - Scenario Data and DHI Launchers]]

## Component Signature

```jsx
function SyntheticGather({ interfaces, t_window, waveletType = 'ricker', f_dom = 30, width = 460, height = 380 }) {
```

Inputs:

- interface list with Shuey terms and times
- display time window
- wavelet type
- dominant frequency

The gather does not know about lithology, porosity, or fluids. It only knows about already-derived reflectivity events.

## Sampling Setup

```jsx
const angles = [0, 5, 10, 15, 20, 25, 30, 35, 40];
const traceSpacing = W / angles.length;
const ampScale = traceSpacing * 0.75;

const n_samples = 220;
const dt = (t_window[1] - t_window[0]) / n_samples;
```

The gather uses nine traces from 0 to 40 degrees. The amplitude scale is deliberately exaggerated so behavior is visible in a compact browser panel.

## Convolution Loop

```jsx
const traceData = angles.map(angle => {
  const samples = new Array(n_samples + 1);
  for (let i = 0; i <= n_samples; i++) {
    const t = t_window[0] + i * dt;
    let amp = 0;
    for (const intf of interfaces) {
      if (intf.time === null) continue;
      const R = reflAt(intf.A, intf.B, intf.C, angle);
      amp += R * waveletSample(t - intf.time, waveletType, f_dom);
    }
    samples[i] = amp;
  }
  return { angle, samples };
});
```

This is the seismic forward model in miniature.

For each angle:

1. Walk through time samples.
2. For each interface, evaluate reflectivity at that angle.
3. Sample the wavelet at the time offset from the interface.
4. Add each event's contribution into the trace.

This is why thin-bed tuning works in the app: nearby wavelets sum constructively or destructively.

Related:

- [[02 - AVO Theory Primer#Wavelets and Tuning]]
- [[06 - DHI and Scenario Notebook#Scenario 10 - Tuning Thickness Thin Bed Effects]]

## Interface Markers

```jsx
{interfaces.map((intf, i) => intf.time !== null && (
  <g key={i}>
    <line x1={margin.left} y1={yT(intf.time)} x2={margin.left + W} y2={yT(intf.time)}
          stroke={intf.cls.color} strokeWidth={0.6} strokeDasharray="2 4" opacity={0.5} />
    <text x={margin.left + W + 2} y={yT(intf.time) + 3} fontSize={9} fill={intf.cls.color} fontFamily="ui-monospace, monospace">
      {intf.label}
    </text>
  </g>
))}
```

The faint horizontal markers show where reflectivity events were placed before wavelet convolution. This helps users understand interference.

## Wiggle Path

```jsx
const wigglePath = samples.map((amp, j) => {
  const x = cx + amp * ampScale;
  const y = margin.top + (j / n_samples) * H;
  return `${j === 0 ? 'M' : 'L'} ${x} ${y}`;
}).join(' ');
```

Each trace is an SVG path where amplitude shifts the x-coordinate.

## Variable-Area Fill

```jsx
const fillPath = ['M ' + cx + ' ' + margin.top];
for (let j = 0; j <= n_samples; j++) {
  const a = samples[j] > 0 ? samples[j] : 0;
  const x = cx + a * ampScale;
  const y = margin.top + (j / n_samples) * H;
  fillPath.push('L ' + x + ' ' + y);
}
fillPath.push('L ' + cx + ' ' + (margin.top + H));
fillPath.push('Z');
```

Only positive amplitudes are filled. This matches the SEG normal polarity legend in [[05 - Visual Panels and Rendering#Polarity Legend]].

## Why This Panel Matters

The gather is where multiple effects meet:

- AVO reflectivity changes with angle.
- Wavelet shape affects event appearance.
- Thin beds cause interference.
- Fluid-contact geometry changes event timing.

This is why the gather can change even when the A-B crossplot does not.

