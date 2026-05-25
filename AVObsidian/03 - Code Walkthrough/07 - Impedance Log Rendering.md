# 07 - Impedance Log Rendering

Previous: [[03 - Code Walkthrough/06 - Acoustic Properties and Wavelet Controls]]
Next: [[03 - Code Walkthrough/08 - Synthetic Gather Rendering]]

## Component Signature

```jsx
function ImpedanceLog({ ob, hc_res, br_res, ub, column_height, hc_fluid, t_top, t_FC, t_BR, t_window, width = 240, height = 380 }) {
```

The impedance log receives fully derived acoustic properties and timing. It does not compute Gassmann, Shuey, or scenario settings itself.

Inputs come from:

- [[03 - Code Walkthrough/11 - Main App State and Derived Model#Derived Acoustic Properties]]
- [[03 - Code Walkthrough/11 - Main App State and Derived Model#Timing Model]]

## Zone Selection

```jsx
const has_FC = column_height > 0 && column_height < 1;
const AI_upper = column_height > 0 ? hc_res.AI : br_res.AI;
const AI_lower = column_height < 1 ? br_res.AI : hc_res.AI;
```

This handles three cases:

- no hydrocarbon column: reservoir is brine.
- partial column: upper reservoir is HC, lower reservoir is brine.
- full hydrocarbon column: whole reservoir is HC.

## Axis Scaling

```jsx
const allAI = [ob.AI, AI_upper, AI_lower, ub.AI];
let AImin = Math.min(...allAI);
let AImax = Math.max(...allAI);
const range = AImax - AImin || 1;
AImin -= range * 0.15;
AImax += range * 0.15;

const xAI = ai => margin.left + ((ai - AImin) / (AImax - AImin)) * W;
const yT  = t  => margin.top + ((t - t_window[0]) / (t_window[1] - t_window[0])) * H;
```

The display is scaled locally to the current model. This makes the step pattern readable for both soft sands and stiff carbonates.

## Step Path

```jsx
const path = has_FC ? [
  `M ${xAI(ob.AI)} ${yTop}`,
  `L ${xAI(ob.AI)} ${yTR}`,
  `L ${xAI(AI_upper)} ${yTR}`,
  `L ${xAI(AI_upper)} ${yFC}`,
  `L ${xAI(AI_lower)} ${yFC}`,
  `L ${xAI(AI_lower)} ${yBR}`,
  `L ${xAI(ub.AI)} ${yBR}`,
  `L ${xAI(ub.AI)} ${yBot}`,
].join(' ') : [...]
```

The path is a stepped polyline. It moves vertically within a layer and horizontally at interfaces.

If there is a fluid contact, the path includes a step at `yFC`. If not, the reservoir is drawn as one interval.

## Fluid Tints

```jsx
const yContact = column_height >= 1 ? yBR
               : column_height <= 0 ? yTR
               : yFC;
const upperHeight = yContact - yTR;
const lowerHeight = yBR - yContact;
```

This block makes edge cases visually correct:

- `column_height = 0` tints the reservoir as brine.
- `column_height = 1` tints the reservoir as hydrocarbon.
- intermediate values split the reservoir at the fluid contact.

## Interpretation

The impedance log answers:

- Does the top reservoir step left or right?
- Is there a fluid-contact step?
- Is the base reservoir contrast large or small?

But it does not tell the whole AVO story. Always compare it with:

- [[03 - Code Walkthrough/08 - Synthetic Gather Rendering]]
- [[03 - Code Walkthrough/12 - Main Render Layout#Reflectivity Curves and Crossplot]]

