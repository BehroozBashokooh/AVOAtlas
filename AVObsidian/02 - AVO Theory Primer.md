# AVO Theory Primer

This note explains the theory that the app uses. It is deliberately written to match the code path in [[03 - Code Walkthrough]].

## The Teaching Model

AVO Atlas models a three-layer system:

1. Overburden.
2. Reservoir.
3. Underburden.

The reservoir can contain a hydrocarbon-filled upper interval and a brine leg below it. When both are present, their boundary is the fluid contact, or flat spot.

See also:

- [[04 - Data Flow and State Model]]
- [[06 - DHI and Scenario Notebook]]

## Fluids and Reuss Mixing

The app defines fluids in `FLUIDS`:

- Gas.
- Oil.
- Brine.

For mixed hydrocarbon and brine saturation, the fluid bulk modulus is calculated with a Reuss average:

```text
1 / K_fl = S_hc / K_hc + S_w / K_brine
```

Density is mixed linearly:

```text
rho_fl = S_hc * rho_hc + S_w * rho_brine
```

The key teaching point is that gas dominates the Reuss average because it is extremely compressible. This is why a small gas saturation can mimic much higher gas saturation acoustically.

## Gassmann Fluid Substitution

The reservoir properties are calculated using Gassmann substitution. In code, this lives in `gassmannSaturate`.

Conceptually:

```text
dry frame + mineral + pore fluid + porosity -> saturated rock
```

Outputs:

- `Vp`
- `Vs`
- `rho`
- `AI`
- saturated bulk modulus
- saturated shear modulus

Important physical assumptions:

- Fluids affect the saturated bulk modulus.
- Fluids do not support shear, so the shear modulus stays equal to the dry-frame shear modulus.
- Saturated density comes from matrix and pore-fluid mass balance.

## Acoustic Impedance

Acoustic impedance is:

```text
AI = Vp * rho
```

The app reports AI in a scaled form:

```text
AI = Vp * rho / 1000
```

AI is the main driver of zero-offset reflectivity and the impedance-log display.

## Poisson Ratio

The acoustic properties panel also reports Poisson ratio:

```text
nu = (Vp^2 - 2 Vs^2) / (2 (Vp^2 - Vs^2))
```

This matters because AVO gradients are sensitive to `Vs/Vp`, and therefore to Poisson-ratio contrast.

## Shuey Approximation

The app uses Shuey's three-term approximation:

```text
R(theta) = A + B sin^2(theta) + C (tan^2(theta) - sin^2(theta))
```

Where:

- `A` is the intercept.
- `B` is the gradient.
- `C` is the far-angle curvature term.

In the code, this is `shueyTerms` plus `reflAt`.

## AVO Classes

The app classifies interfaces using a simplified A-B taxonomy:

- Class I - hard reservoir, positive intercept, negative gradient.
- Class II - near-zero intercept, negative gradient.
- Class IIp - small positive intercept that reverses polarity with offset.
- Class III - soft bright spot, negative intercept, negative gradient.
- Class IV - negative intercept, positive gradient.
- `+/+` - positive intercept and positive gradient, often useful for flat spots in this teaching model.

The classification is a heuristic. It is useful for teaching, but boundaries are not geological absolutes.

## Wavelets and Tuning

The app convolves angle-dependent reflectivity with a selectable zero-phase wavelet:

- Ricker.
- Ormsby-style bandpass.

The default is a 30 Hz Ricker wavelet.

The wavelet control also reports a quarter-wavelength tuning estimate:

```text
lambda / 4 ~= Vp / (4 f)
```

This is central to the thin-bed scenario. When bed thickness approaches tuning thickness, wavelets from top reservoir, fluid contact, and base reservoir interfere. The AVO crossplot stays the same, but the gather changes because the events overlap.

For code details, see [[03 - Code Walkthrough/04 - Wavelet Functions]] and [[03 - Code Walkthrough/08 - Synthetic Gather Rendering]].
