# Data Flow and State Model

This note explains how user choices become the linked displays.

## State Inputs

Main state lives in the exported app component:

- `ob_hard`
- `ub_hard`
- `lithology`
- `phi`
- `hc_fluid`
- `hc_sat`
- `column_height`
- `thickness`
- `waveletType`
- `waveletFrequency`
- `customElastic`
- `elasticOverrides`
- `view`

Most controls update one of these values directly.

## Scenario Application

`applyScenario` takes a scenario settings object and updates the relevant state:

```text
scenario.settings
  -> overburden / underburden hardness
  -> lithology / porosity
  -> fluid / saturation / column height
  -> thickness
  -> reset custom acoustic overrides
  -> return to atlas view
```

Wavelet settings are deliberately not part of scenarios. This lets a user compare the same geology at different bandwidths.

## Derived Acoustic Properties

The app computes defaults:

- `obDefault`
- `ubDefault`
- `hcResDefault`
- `brResDefault`

These are combined into `elasticDefaults`.

If custom acoustic overrides are off, the effective properties are the defaults. If overrides are on, each zone merges defaults with edited values and recomputes AI.

```text
defaults + optional overrides -> effectiveElastic
```

Related:

- [[03 - Code Walkthrough/06 - Acoustic Properties and Wavelet Controls]]

## Interface Construction

The interface list is derived from:

- overburden properties
- hydrocarbon reservoir properties
- brine reservoir properties
- underburden properties
- effective column height

The possible interfaces are:

- `TR` - top reservoir.
- `FC` - fluid contact, only when `0 < column_height < 1`.
- `BR` - base reservoir.

Each interface stores:

- name
- label
- upper layer
- lower layer
- Shuey terms
- AVO class

## Timing Model

The timing model anchors top reservoir at 1.000 s TWT.

Reservoir thickness, column height, and reservoir velocities determine:

- `t_top`
- `t_FC`
- `t_BR`
- display time window

This timing model controls both the impedance log and the synthetic gather.

## Reflectivity Curves

`avoCurves` builds angle rows from 0 to 45 degrees. For each interface, it evaluates:

```text
R(theta) = A + B sin^2(theta) + C (tan^2(theta) - sin^2(theta))
```

Those rows feed the Recharts line chart.

## Synthetic Gather

The gather uses:

- interface times
- interface Shuey coefficients
- selected wavelet type
- selected dominant frequency

For every angle and time sample:

```text
amplitude += R_interface(theta) * wavelet(time - interface_time)
```

That creates the wiggle trace.

See:

- [[05 - Visual Panels and Rendering#Synthetic Angle Gather]]

## Guide Navigation

`openGuideSection` switches to the guide view and scrolls to a DOM id. This is what makes the scenario names in the atlas launcher behave like Obsidian-ish internal links in the app UI.
