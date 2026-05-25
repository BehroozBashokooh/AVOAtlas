# 00 - Walkthrough Orientation

This folder is a collaborator-facing code tour for `src/AVOAtlasV3.jsx`.

Previous: [[03 - Code Walkthrough]]
Next: [[03 - Code Walkthrough/01 - Imports and File Architecture]]

## The File at a Glance

`AVOAtlasV3.jsx` is a single-file React application. It contains:

- Imports.
- Physics constants and helper functions.
- Generic UI primitives.
- Custom panels for acoustic properties and wavelets.
- SVG visualizations.
- Scenario data.
- Guide components.
- Main app state and derived calculations.
- The rendered atlas and guide layouts.

This is not the final ideal architecture. It is a compact teaching artifact that keeps the whole model visible in one file. The roadmap for splitting it is in [[07 - Design Roadmap#Code Organization]].

## Dependency Direction

The file mostly flows from low-level to high-level:

```text
constants
  -> physics helpers
  -> UI primitives
  -> visual components
  -> scenario data
  -> guide components
  -> main app state
  -> final render
```

The main app component at the bottom wires everything together.

## Mental Model

When a user moves a slider or applies a scenario:

```text
React state changes
  -> useMemo recomputes acoustic properties
  -> interfaces are rebuilt
  -> Shuey terms are recomputed
  -> timing is recomputed
  -> charts and SVG panels rerender
```

The code is designed so that most derived values are recalculated from state rather than mutated manually.

See also:

- [[04 - Data Flow and State Model]]
- [[03 - Code Walkthrough/11 - Main App State and Derived Model]]

