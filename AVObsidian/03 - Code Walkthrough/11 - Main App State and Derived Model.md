# 11 - Main App State and Derived Model

Previous: [[03 - Code Walkthrough/10 - Guide Components and In-App Guide]]
Next: [[03 - Code Walkthrough/12 - Main Render Layout]]

## Main Component

```jsx
export default function AVOAtlasV2() {
```

This is the exported app component. The function name is historically stale; the current file is `AVOAtlasV3.jsx`.

## State

```jsx
const [ob_hard, setObHard] = useState('soft');
const [ub_hard, setUbHard] = useState('medium');
const [lithology, setLithology] = useState('unconsolidated_sand');
const [phi, setPhi] = useState(0.28);
const [hc_fluid, setHcFluid] = useState('gas');
const [hc_sat, setHcSat] = useState(0.80);
const [column_height, setColumnHeight] = useState(0.55);
const [thickness, setThickness] = useState(50);
const [waveletType, setWaveletType] = useState('ricker');
const [waveletFrequency, setWaveletFrequency] = useState(30);
```

This state is the user-editable model.

Additional state:

```jsx
const [thickness_min, setThicknessMin] = useState(15);
const [thickness_max, setThicknessMax] = useState(120);
const [customElastic, setCustomElastic] = useState(false);
const [elasticOverrides, setElasticOverrides] = useState(null);
const [view, setView] = useState('atlas');
```

These handle UI flexibility and navigation.

## Applying Scenarios

```jsx
const applyScenario = useCallback((s) => {
  setObHard(s.ob_hard);
  setUbHard(s.ub_hard);
  setLithology(s.lithology);
  setPhi(s.phi);
  setHcFluid(s.hc_fluid);
  setHcSat(s.hc_sat);
  setColumnHeight(s.column_height);
  setThickness(s.thickness);
  setCustomElastic(false);
  setElasticOverrides(null);
  setThicknessMin(prev => Math.min(prev, s.thickness));
  setThicknessMax(prev => Math.max(prev, s.thickness));
  setView('atlas');
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
}, []);
```

Applying a scenario resets custom acoustic overrides. This keeps scenario behavior predictable: when a scenario is selected, the visible physics matches the scenario text.

Wavelet type/frequency are not reset by scenarios. That is deliberate: users can test the same geology with different wavelets.

## Guide Section Navigation

```jsx
const openGuideSection = useCallback((sectionId) => {
  setView('guide');
  if (typeof window === 'undefined') return;
  window.history.replaceState(null, '', `#${sectionId}`);
  window.setTimeout(() => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 0);
}, []);
```

This lets names in the compact launcher behave like guide links.

## Derived Acoustic Properties

```jsx
const hcResDefault = useMemo(() => {
  const { K_fl, rho_fl } = mixFluid(hc_fluid, hc_sat);
  return gassmannSaturate(lithology, phi, K_fl, rho_fl);
}, [lithology, phi, hc_fluid, hc_sat]);

const brResDefault = useMemo(() => gassmannSaturate(lithology, phi, FLUIDS.brine.K, FLUIDS.brine.rho), [lithology, phi]);
```

The app computes two reservoir versions:

- hydrocarbon-saturated reservoir
- brine-saturated reservoir

That is what allows a fluid contact to exist inside the reservoir.

## Custom Acoustic Overrides

```jsx
const effectiveElastic = useMemo(() => {
  if (!customElastic || !elasticOverrides) return elasticDefaults;

  const mergeRock = key => {
    const merged = { ...elasticDefaults[key], ...elasticOverrides[key] };
    const Vp = Math.max(1, merged.Vp);
    const Vs = Math.max(1, merged.Vs);
    const rho = Math.max(0.001, merged.rho);
    return { ...merged, Vp, Vs, rho, AI: Vp * rho / 1000 };
  };
  ...
}, [customElastic, elasticOverrides, elasticDefaults]);
```

Overrides are merged with defaults, clamped to positive values, and AI is recomputed.

## Tuning Thickness

```jsx
const tuningThickness = useMemo(() => {
  const eff = hc_fluid === 'brine' ? 0 : column_height;
  const reservoirVp = eff > 0 ? hc_res.Vp : br_res.Vp;
  return reservoirVp / (4 * waveletFrequency);
}, [hc_fluid, column_height, hc_res.Vp, br_res.Vp, waveletFrequency]);
```

This is a teaching estimate for quarter-wavelength tuning. It uses the velocity of the reservoir interval currently occupying the top of the reservoir.

Related:

- [[06 - DHI and Scenario Notebook#Scenario 10 - Tuning Thickness Thin Bed Effects]]

## Interfaces

```jsx
const effective_column_height = hc_fluid === 'brine' ? 0 : column_height;

const interfaces = useMemo(() => {
  const eff = hc_fluid === 'brine' ? 0 : column_height;
  const list = [];
  const reservoir_upper = eff > 0 ? hc_res : br_res;
  const reservoir_lower = eff < 1 ? br_res : hc_res;
  ...
}, [ob, ub, hc_res, br_res, column_height, hc_fluid]);
```

The app always creates:

- top reservoir
- base reservoir

It creates fluid contact only when:

```text
0 < effective column height < 1
```

Each interface then receives Shuey terms and a class.

## Timing Model

```jsx
const t_top = 1.000;
...
t_FC = t_top + 2 * eff * thickness / Vp_upper;
t_BR = t_FC + 2 * (1 - eff) * thickness / Vp_lower;
```

The timing model converts true thickness to two-way time. It is simple but effective for showing event movement and tuning.

## AVO Curves

```jsx
const avoCurves = useMemo(() => {
  const angles = Array.from({ length: 46 }, (_, i) => i);
  return angles.map(deg => {
    const row = { angle: deg };
    interfaces.forEach(intf => {
      row[intf.label] = reflAt(intf.A, intf.B, intf.C, deg);
    });
    return row;
  });
}, [interfaces]);
```

This creates data for the Recharts line chart. It is separate from the synthetic gather so users can distinguish interface reflectivity from wavelet-convolved display.

