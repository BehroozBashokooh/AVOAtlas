# 06 - Acoustic Properties and Wavelet Controls

Previous: [[03 - Code Walkthrough/05 - Shared UI Primitives]]
Next: [[03 - Code Walkthrough/07 - Impedance Log Rendering]]

## Acoustic Properties Panel

```jsx
function ElasticPropertiesPanel({
  defaults,
  values,
  customElastic,
  onEnableCustom,
  onReset,
  onElasticChange,
  hcColor,
}) {
  const rows = [
    { key: 'ob', label: 'OB', color: '#1c1917' },
    { key: 'hc_res', label: 'HC res', color: hcColor },
    { key: 'br_res', label: 'Brine res', color: FLUIDS.brine.color },
    { key: 'ub', label: 'UB', color: '#1c1917' },
  ];
  const formatPoisson = rock => {
    const nu = poissonRatio(rock.Vp, rock.Vs);
    return Number.isFinite(nu) ? nu.toFixed(3) : '—';
  };
```

The component receives both `defaults` and `values`:

- `defaults` are the model-computed acoustic properties.
- `values` are the effective values after optional custom overrides.

The rows correspond to the four possible zones:

- overburden
- hydrocarbon-saturated reservoir
- brine-saturated reservoir
- underburden

## Normal Mode

```jsx
{!customElastic ? (
  <>
    <Stat label="OB · AI" value={values.ob.AI.toFixed(2)} />
    <Stat label="OB · Poisson ratio" value={formatPoisson(values.ob)} />
    <Stat label="HC-sat reservoir · Vp" value={values.hc_res.Vp.toFixed(0) + ' m/s'} color={hcColor} />
    <Stat label={<>HC-sat reservoir · density <RhoSymbol /></>} value={values.hc_res.rho.toFixed(3) + ' g/cc'} color={hcColor} />
    ...
  </>
) : (...)}
```

Normal mode is a compact stats display. It is intentionally not a full editable table, because most users should learn from the model before overriding it.

## Custom Mode

```jsx
<ElasticNumber value={Math.round(v.Vp)} onChange={next => onElasticChange(row.key, 'Vp', next)} color={row.color} />
<ElasticNumber value={Math.round(v.Vs)} onChange={next => onElasticChange(row.key, 'Vs', next)} color={row.color} />
<ElasticNumber value={v.rho.toFixed(3)} step={0.001} onChange={next => onElasticChange(row.key, 'rho', next)} color={row.color} />
```

Custom mode allows manual edits to `Vp`, `Vs`, and density. AI is not directly edited; it is recalculated from `Vp * rho / 1000`.

This is wired in [[03 - Code Walkthrough/11 - Main App State and Derived Model#Custom Acoustic Overrides]].

## Wavelet Preview

```jsx
function WaveletPreview({ type, frequency, width = 220, height = 72 }) {
  ...
  const path = Array.from({ length: samples + 1 }, (_, i) => {
    const t = -duration / 2 + (i / samples) * duration;
    return `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(waveletSample(t, type, frequency)).toFixed(1)}`;
  }).join(' ');
```

This component draws a small preview of the selected wavelet. It uses the same `waveletSample` helper as the synthetic gather, so the preview and gather cannot drift apart.

Related:

- [[03 - Code Walkthrough/04 - Wavelet Functions]]

## Wavelet Panel

```jsx
function WaveletPanel({ type, frequency, onTypeChange, onFrequencyChange, tuningThickness }) {
  const presets = [15, 25, 30, 40, 60];
  const typeOptions = [['ricker', 'Ricker'], ['ormsby', 'Ormsby']];
```

The panel controls:

- wavelet type
- dominant frequency
- frequency presets
- reset to Ricker 30 Hz
- tuning-thickness readout

```jsx
<Slider
  label="Dominant frequency"
  value={frequency}
  onChange={onFrequencyChange}
  min={10}
  max={80}
  step={1}
  unit="Hz"
  accent="#57534e"
  fmt={v => v.toFixed(0)}
/>
```

The frequency is part of app state. It affects:

- the preview trace
- the synthetic gather
- the tuning estimate

## Tuning Readout

```jsx
<span className="font-medium text-stone-800">λ/4 tuning estimate:</span>{' '}
<span className="font-mono tabular-nums">{tuningThickness.toFixed(1)} m</span>
```

The panel does not calculate tuning itself. It receives `tuningThickness` from the main app. That keeps physics-derived state in one place.

Related:

- [[03 - Code Walkthrough/11 - Main App State and Derived Model#Tuning Thickness]]
- [[06 - DHI and Scenario Notebook#Scenario 10 - Tuning Thickness Thin Bed Effects]]

