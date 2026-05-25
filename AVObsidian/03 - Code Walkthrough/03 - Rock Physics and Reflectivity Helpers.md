# 03 - Rock Physics and Reflectivity Helpers

Previous: [[03 - Code Walkthrough/02 - Physics Constants and Presets]]
Next: [[03 - Code Walkthrough/04 - Wavelet Functions]]

## Fluid Mixing

```jsx
function mixFluid(hcKey, sat_hc) {
  const fhc = FLUIDS[hcKey];
  const fbr = FLUIDS.brine;
  const Sw = 1 - sat_hc;
  const K_fl = 1 / (sat_hc / fhc.K + Sw / fbr.K);
  const rho_fl = sat_hc * fhc.rho + Sw * fbr.rho;
  return { K_fl, rho_fl };
}
```

`mixFluid` computes effective pore-fluid properties for the hydrocarbon zone.

The important detail is the harmonic average for bulk modulus:

```text
K_fl = 1 / (S_hc / K_hc + S_w / K_brine)
```

This is why small gas saturations have a large effect. Gas has such a low bulk modulus that it dominates the denominator.

Related:

- [[02 - AVO Theory Primer#Fluids and Reuss Mixing]]
- [[06 - DHI and Scenario Notebook#Scenario 03 - Fizz Water Saturation Ambiguity]]

## Gassmann Saturation

```jsx
function gassmannSaturate(lithKey, phi, K_fl, rho_fl) {
  const L = LITHOLOGY[lithKey];
  const K_dry = L.dryK(phi);
  const mu_dry = L.dryMu(phi);
  const K_min = L.K_min;
  const num = Math.pow(1 - K_dry / K_min, 2);
  const denom = phi / K_fl + (1 - phi) / K_min - K_dry / (K_min * K_min);
  const K_sat = K_dry + num / denom;
  const mu_sat = mu_dry; // Gassmann: shear unchanged
  const rho_sat = (1 - phi) * L.rho_grain + phi * rho_fl;
  const Vp = Math.sqrt((K_sat + (4 / 3) * mu_sat) * 1e9 / (rho_sat * 1000));
  const Vs = Math.sqrt(mu_sat * 1e9 / (rho_sat * 1000));
  return { Vp, Vs, rho: rho_sat, AI: Vp * rho_sat / 1000, K_sat, mu_sat };
}
```

This is the reservoir rock-physics engine. It turns a dry frame, porosity, and pore fluid into saturated rock properties.

Key choices:

- `mu_sat = mu_dry` because fluids do not support shear.
- density is mixed from grain and fluid densities.
- velocities convert GPa and g/cc into SI units.
- `AI` is scaled as `Vp * rho / 1000`.

Downstream:

- `hcResDefault` uses mixed HC/brine fluid.
- `brResDefault` uses pure brine.
- The contrast between those two creates the fluid-contact response.

Related:

- [[02 - AVO Theory Primer#Gassmann Fluid Substitution]]
- [[04 - Data Flow and State Model#Derived Acoustic Properties]]

## Shuey Terms

```jsx
function shueyTerms(Vp1, Vs1, r1, Vp2, Vs2, r2) {
  const Vp = (Vp1 + Vp2) / 2;
  const Vs = (Vs1 + Vs2) / 2;
  const rho = (r1 + r2) / 2;
  const dVp = Vp2 - Vp1, dVs = Vs2 - Vs1, drho = r2 - r1;
  const A = 0.5 * (dVp / Vp + drho / rho);
  const k2 = (Vs / Vp) ** 2;
  const B = dVp / (2 * Vp) - 4 * k2 * (dVs / Vs) - 2 * k2 * (drho / rho);
  const C = dVp / (2 * Vp);
  return { A, B, C };
}
```

`shueyTerms` converts an upper/lower interface into AVO coefficients.

Inputs use the upper layer first and lower layer second. This direction matters: reversing the order flips the sign of contrasts and changes the reflection.

The output feeds:

- interface chips
- reflectivity curves
- crossplot
- synthetic gather

Related:

- [[02 - AVO Theory Primer#Shuey Approximation]]

## Poisson Ratio

```jsx
function poissonRatio(Vp, Vs) {
  const vp2 = Vp * Vp;
  const vs2 = Vs * Vs;
  const denom = 2 * (vp2 - vs2);
  if (denom === 0) return NaN;
  return (vp2 - 2 * vs2) / denom;
}
```

Poisson ratio is reported in the acoustic properties panel. It is not directly used in `shueyTerms`, but it helps the user interpret why `Vp/Vs` changes affect AVO gradients.

Related:

- [[02 - AVO Theory Primer#Poisson Ratio]]
- [[03 - Code Walkthrough/06 - Acoustic Properties and Wavelet Controls]]

## Reflectivity at an Angle

```jsx
const reflAt = (A, B, C, deg) => {
  const t = (deg * Math.PI) / 180;
  const s2 = Math.sin(t) ** 2;
  const tn2 = Math.tan(t) ** 2;
  return A + B * s2 + C * (tn2 - s2);
};
```

`reflAt` evaluates Shuey's approximation at a given angle. It is called in two places:

- when constructing `avoCurves`
- when building every synthetic gather trace

See [[03 - Code Walkthrough/08 - Synthetic Gather Rendering]].

## Classification

```jsx
function classify(A, B) {
  if (A < -0.02 && B > 0) return { cls: 'IV', color: '#1d4ed8' };

  if (A > 0 && A <= 0.04 && B < 0) {
    const R_30 = A + B * 0.25;
    if (R_30 < -0.02) return { cls: 'IIp', color: '#7e22ce' };
  }

  if (A > 0.04 && B < 0)            return { cls: 'I',   color: '#a16207' };
  if (Math.abs(A) <= 0.04 && B < 0) return { cls: 'II',  color: '#9a3412' };
  if (A < -0.04 && B < 0)           return { cls: 'III', color: '#b91c1c' };
  if (A > 0 && B > 0)               return { cls: '+/+', color: '#374151' };
  return { cls: '—', color: '#6b7280' };
}
```

This is a teaching classifier, not a universal interpretation rule.

The Class IIp logic is intentionally more than `A > 0 && B < 0`. It checks whether the response has actually crossed negative by 30 degrees:

```text
R_30 = A + B * sin^2(30°)
```

Since `sin^2(30°) = 0.25`, the code uses `A + B * 0.25`.

Downstream:

- class chips
- crossplot colors
- interface time marker colors

