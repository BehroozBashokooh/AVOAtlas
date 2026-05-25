# 12 - Main Render Layout

Previous: [[03 - Code Walkthrough/11 - Main App State and Derived Model]]
Next: [[03 - Code Walkthrough/13 - Change Recipes]]

## Top-Level Layout

```jsx
return (
  <div className="w-full min-h-screen bg-[#faf9f5] py-6 px-4 md:px-8" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
    <div className="max-w-[1400px] mx-auto">
      ...
    </div>
  </div>
);
```

The app uses a full-page background with a max-width content container.

## Header

```jsx
<header className="mb-5 pb-4 border-b border-stone-300 flex items-baseline justify-between flex-wrap gap-3">
  ...
  <Tabs view={view} setView={setView} />
  {view === 'atlas' && (
    <button onClick={reset}>...</button>
  )}
</header>
```

The header contains:

- app title
- version subtitle
- atlas/guide tabs
- reset button only in atlas view

## Atlas Grid

```jsx
{view === 'atlas' && (<>
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
    <aside className="lg:col-span-3 space-y-4">
      ...
    </aside>
    <main className="lg:col-span-9 space-y-4">
      ...
    </main>
  </div>
</>)}
```

The atlas has:

- a left control column
- a wider visualization column

On small screens, these stack vertically.

## Control Column

The control column includes:

1. Sealing rocks.
2. Reservoir matrix.
3. Fluid fill.
4. Wavelet.
5. Acoustic properties.

These controls map directly to state described in [[03 - Code Walkthrough/11 - Main App State and Derived Model#State]].

## Main Visualization Section

```jsx
<ImpedanceLog ... />
<SyntheticGather ... />
<PolarityLegend />
```

These three panels are grouped because they share the same time/depth story:

- impedance log shows layer properties and contacts
- synthetic gather shows convolved seismic response
- polarity legend explains visual convention

## Reflectivity Curves and Crossplot

The next grid contains:

- `LineChart` for `avoCurves`
- `ScatterChart` for A-B points

These charts use `interfaces`, not time samples. They represent interface physics before wavelet convolution.

## Scenario Launchers

```jsx
<CompactScenarioLaunchers
  onApplyScenario={applyScenario}
  onOpenGuideSection={openGuideSection}
/>
```

This lives under the charts so a user can test cases without leaving the atlas.

Related:

- [[03 - Code Walkthrough/09 - Scenario Data and DHI Launchers]]
- [[06 - DHI and Scenario Notebook]]

## Footer

The footer states the model assumptions:

- Gassmann fluid substitution.
- Shuey AVO.
- selectable zero-phase wavelet.
- empirical dry-rock moduli.

This is important because the app is educational, not calibrated production software.

## Guide View

```jsx
{view === 'guide' && <GuideView onApplyScenario={applyScenario} />}
```

The guide receives `applyScenario`, so its Try buttons can modify the live atlas state.

