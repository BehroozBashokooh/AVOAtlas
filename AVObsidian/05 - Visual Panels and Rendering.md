# Visual Panels and Rendering

This note explains the main display panels.

## Impedance Log

Code:

- `ImpedanceLog`

Inputs:

- overburden AI
- hydrocarbon-reservoir AI
- brine-reservoir AI
- underburden AI
- column height
- timing values

What it shows:

- A stepped acoustic-impedance profile.
- Reservoir fluid tinting.
- Fluid-contact dashed line when applicable.

Interpretation:

Leftward steps are lower AI. Rightward steps are higher AI. The top-reservoir step is often the intuitive "bright spot" or "hard kick" indicator, but the app encourages users to compare this with the gather and crossplot.

## Synthetic Angle Gather

Code:

- `SyntheticGather`

Inputs:

- interface list with times
- wavelet type
- dominant frequency
- display time window

What it shows:

- Wiggle traces from 0 to 40 degrees.
- Positive variable-area fill.
- Interface time markers.

The gather is where AVO becomes visually intuitive. A Class III top-reservoir reflection grows more negative with angle; a Class I event starts positive and dims or reverses; a fluid contact may appear as a flat-spot event.

## Wavelet Panel

Code:

- `WaveletPanel`
- `WaveletPreview`

Controls:

- Ricker / Ormsby wavelet type.
- Dominant frequency slider.
- Frequency presets.
- Reset to Ricker 30 Hz.

Readout:

- Quarter-wavelength tuning estimate.

Design reasoning:

This panel teaches that seismic observations are not only interface physics. Bandwidth and tuning can alter what the interpreter sees.

## Polarity Legend

Code:

- `PolarityLegend`

Purpose:

The app uses SEG normal polarity. The legend makes the wiggle-fill convention explicit:

- positive reflection -> filled/right-deflecting peak
- negative reflection -> trough/left-deflecting event

This is especially important for polarity reversal examples.

## Reflectivity vs Angle

Code:

- Recharts `LineChart`
- data from `avoCurves`

Purpose:

Shows the mathematical AVO behavior before wavelet convolution. This helps separate interface physics from tuning and interference.

Key teaching point:

If the reflectivity curves do not change but the gather changes, the cause is geometry/wavelet interference, not a changed interface property.

## Intercept-Gradient Crossplot

Code:

- Recharts `ScatterChart`
- interface classes from `classify`

Purpose:

Shows where each interface sits in A-B space.

Design reasoning:

The crossplot turns qualitative class labels into a spatial mental model. Users can see that top reservoir, fluid contact, and base reservoir may occupy different AVO regimes at the same time.

## AI vs Depth Diagram

Code:

- `AIDepthDiagram`

Purpose:

Explains why gas sands can shift from Class III to Class II/IIp/I with depth. It is schematic, not a calibrated basin model.

