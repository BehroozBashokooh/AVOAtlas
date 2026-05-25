# 02 - Physics Constants and Presets

Previous: [[03 - Code Walkthrough/01 - Imports and File Architecture]]
Next: [[03 - Code Walkthrough/03 - Rock Physics and Reflectivity Helpers]]

## Code: Fluids

```jsx
const FLUIDS = {
  gas:   { name: 'Gas',   K: 0.04, rho: 0.20, color: '#dc2626' },
  oil:   { name: 'Oil',   K: 1.0,  rho: 0.80, color: '#15803d' },
  brine: { name: 'Brine', K: 2.5,  rho: 1.05, color: '#2563eb' },
};
```

## Explanation

`FLUIDS` defines pore-fluid presets. Each fluid has:

- `name` for UI labels.
- `K` bulk modulus in GPa.
- `rho` density in g/cc.
- `color` for reservoir tinting and UI accents.

The values are intentionally simple and educational. Gas has extremely low bulk modulus, which is the key driver behind the gas-sand effects explored in [[06 - DHI and Scenario Notebook#Scenario 02 - Class III Classic Gas Bright Spot]] and [[06 - DHI and Scenario Notebook#Scenario 03 - Fizz Water Saturation Ambiguity]].

## Code: Lithology

```jsx
const LITHOLOGY = {
  unconsolidated_sand: {
    name: 'Unconsolidated sand',
    K_min: 37, rho_grain: 2.65,
    dryK:  phi => 8  * Math.exp(-4 * phi),
    dryMu: phi => 10 * Math.exp(-4 * phi),
    phiRange: [0.20, 0.38],
  },
  consolidated_sand: {
    name: 'Consolidated sand',
    K_min: 37, rho_grain: 2.65,
    dryK:  phi => 25 * Math.exp(-5 * phi),
    dryMu: phi => 28 * Math.exp(-5 * phi),
    phiRange: [0.05, 0.28],
  },
  carbonate: {
    name: 'Carbonate (calcite)',
    K_min: 70, rho_grain: 2.71,
    dryK:  phi => 55 * Math.exp(-5 * phi),
    dryMu: phi => 30 * Math.exp(-4 * phi),
    phiRange: [0.03, 0.25],
  },
};
```

## Explanation

`LITHOLOGY` defines reservoir-frame behavior. The app does not ask users to supply dry-frame moduli directly. Instead, each lithology maps porosity to dry bulk and shear moduli.

Important fields:

- `K_min` is the mineral bulk modulus.
- `rho_grain` is grain density.
- `dryK(phi)` is dry-frame bulk modulus.
- `dryMu(phi)` is dry-frame shear modulus.
- `phiRange` constrains the porosity slider to a reasonable range.

Design reasoning:

The exponential dry-frame functions are empirical teaching fits. They are not a calibrated rock-physics model. Their job is to produce plausible trends:

- unconsolidated sands are soft and fluid-sensitive.
- consolidated sands are stiffer and can create Class I / II behavior.
- carbonates are stiff-framed and have small fluid effects.

Related:

- [[02 - AVO Theory Primer#Gassmann Fluid Substitution]]
- [[06 - DHI and Scenario Notebook#Scenario 08 - Carbonate Reservoir Small Fluid Effects]]

## Code: Hardness Presets

```jsx
const HARDNESS = {
  very_soft: { name: 'Very soft',  Vp: 1900, Vs: 750,  rho: 1.95 },
  soft:      { name: 'Soft',       Vp: 2300, Vs: 1050, rho: 2.20 },
  medium:    { name: 'Medium',     Vp: 2700, Vs: 1400, rho: 2.30 },
  hard:      { name: 'Hard',       Vp: 3300, Vs: 1850, rho: 2.45 },
  very_hard: { name: 'Very hard',  Vp: 4200, Vs: 2400, rho: 2.60 },
};
```

## Explanation

`HARDNESS` defines overburden and underburden presets. Unlike reservoir properties, these are not computed through Gassmann. They are simple elastic/acoustic presets representing qualitative sealing and basement rocks.

These presets strongly affect:

- top-reservoir contrast
- base-reservoir contrast
- AVO class
- crossplot position

For example, moving from `soft` to `hard` overburden can turn a familiar Class III gas response into Class IV behavior. See [[06 - DHI and Scenario Notebook#Scenario 06 - Class IV Anomalous Gradient]].

## Downstream Consumers

These constants feed:

- [[03 - Code Walkthrough/03 - Rock Physics and Reflectivity Helpers]]
- [[03 - Code Walkthrough/11 - Main App State and Derived Model]]
- [[03 - Code Walkthrough/12 - Main Render Layout]]

