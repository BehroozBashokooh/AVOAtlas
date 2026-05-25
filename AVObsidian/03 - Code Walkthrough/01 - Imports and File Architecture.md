# 01 - Imports and File Architecture

Previous: [[03 - Code Walkthrough/00 - Walkthrough Orientation]]
Next: [[03 - Code Walkthrough/02 - Physics Constants and Presets]]

## Code

```jsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, ScatterChart, Scatter, ReferenceArea
} from 'recharts';
import { RotateCcw, Droplet, Layers, Waves } from 'lucide-react';
```

## What This Does

The app uses three external packages:

- React for state and rendering.
- Recharts for the reflectivity-vs-angle chart and intercept-gradient crossplot.
- Lucide icons for compact control-panel visual cues.

`useState` holds the model controls. `useMemo` caches derived physics values until their dependencies change. `useCallback` keeps event handlers stable enough for readability and avoids redefining larger handlers unnecessarily.

## Why Recharts and SVG Both Appear

The app uses:

- Recharts for conventional charts.
- Hand-authored SVG for seismic-specific panels.

This split is deliberate. Recharts is efficient for axes, tooltips, and scatter/line charts. The impedance log and synthetic gather are domain-specific drawings, so SVG gives tighter control over wiggle traces, fills, contact lines, labels, and polarity conventions.

Related:

- [[03 - Code Walkthrough/07 - Impedance Log Rendering]]
- [[03 - Code Walkthrough/08 - Synthetic Gather Rendering]]
- [[05 - Visual Panels and Rendering]]

## File Architecture

The first major comment block starts the physics section:

```jsx
/* ════════════════════════════════════════════════════════════════════
   PHYSICS — fluids, minerals, dry-rock, Gassmann, Shuey
   ════════════════════════════════════════════════════════════════════ */
```

These large comments divide the file into readable chapters. When adding a new feature, try to place it where it fits the dependency flow:

- Physical equations before components that consume them.
- Generic UI primitives before composed panels.
- Data before components that render it.
- Main state and final layout at the bottom.

Design note:

The file currently exports `AVOAtlasV2` even though the file is `AVOAtlasV3.jsx`. This is a naming mismatch inherited from earlier versions. It is harmless at runtime but should be cleaned up in a future refactor. See [[07 - Design Roadmap#Code Organization]].

