# 05 - Shared UI Primitives

Previous: [[03 - Code Walkthrough/04 - Wavelet Functions]]
Next: [[03 - Code Walkthrough/06 - Acoustic Properties and Wavelet Controls]]

## Select

```jsx
function Select({ label, value, onChange, options }) {
  return (
    <div className="mb-3">
      <label className="text-[11px] uppercase tracking-wider text-stone-500 block mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-[13px] border border-stone-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
      >
        {options.map(([k, lab]) => <option key={k} value={k}>{lab}</option>)}
      </select>
    </div>
  );
}
```

`Select` is used for categorical choices:

- overburden hardness
- underburden hardness
- lithology
- pore fluid

It expects options as `[value, label]` pairs.

## Slider

```jsx
function Slider({ label, value, onChange, min, max, step, unit, accent, fmt }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] uppercase tracking-wider text-stone-500">{label}</span>
        <span className="font-mono tabular-nums text-[13px] text-stone-900">
          {fmt(value)} <span className="text-stone-400 text-[11px]">{unit}</span>
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-lg appearance-none cursor-pointer"
        style={{ accentColor: accent, background: '#e7e5e4' }}
      />
    </div>
  );
}
```

`Slider` is used for continuous numeric controls. It takes a formatter function so each caller can choose precision.

Examples:

- porosity uses three decimals.
- gas saturation uses two decimals.
- wavelet frequency uses integer Hz.

## Stat

```jsx
function Stat({ label, value, color }) {
  return (
    <div className="flex justify-between items-baseline py-1 border-b border-stone-100 last:border-0">
      <span className="text-[11px] text-stone-500 uppercase tracking-wider">{label}</span>
      <span className="text-[13px] font-mono tabular-nums" style={{ color: color || '#1c1917' }}>{value}</span>
    </div>
  );
}
```

`Stat` is the compact row used in the acoustic properties panel.

## Rho Symbol

```jsx
function RhoSymbol() {
  return <span className="font-serif italic normal-case tracking-normal text-[1.08em]">ρ</span>;
}
```

This exists because a bare Greek rho in a small sans-serif label can look like a Latin `p`. The serif italic presentation makes density easier to recognize.

## Elastic Number

```jsx
function ElasticNumber({ value, onChange, step = 1, color }) {
  return (
    <input
      type="number"
      value={value}
      min={0}
      step={step}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-16 px-1 py-0.5 border border-stone-300 rounded text-right font-mono tabular-nums text-[12px] focus:outline-none focus:border-stone-500"
      style={{ color: color || '#1c1917' }}
    />
  );
}
```

`ElasticNumber` is used in custom acoustic-property mode. The name is inherited from the original "elastic properties" wording.

Related:

- [[03 - Code Walkthrough/06 - Acoustic Properties and Wavelet Controls]]

