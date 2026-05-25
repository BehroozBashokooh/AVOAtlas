# Project Map and Design Intent

## Purpose

AVO Atlas is a teaching-oriented forward model for amplitude variation with offset. The core design choice is that the user should be able to adjust a geological model and immediately see the consequences in several linked views:

- Acoustic impedance profile.
- Synthetic angle gather.
- Reflectivity-vs-angle curves.
- Intercept-gradient crossplot.
- Acoustic properties table.
- Scenario and DHI launchers.

The app is intentionally more like a live notebook than a production seismic package. It favors transparency, immediacy, and interpretable controls over exhaustive geophysical realism.

Related notes:

- [[02 - AVO Theory Primer]]
- [[03 - Code Walkthrough]]
- [[05 - Visual Panels and Rendering]]
- [[06 - DHI and Scenario Notebook]]

## Repository Shape

Important files:

- `src/AVOAtlasV3.jsx` - the main app: physics helpers, UI primitives, visual panels, guide, scenarios, and app state.
- `src/main.jsx` - React entry point.
- `index.html` - Vite HTML shell.
- `vite.config.js` - deployment base path for GitHub Pages.
- `README.md` - public-facing project summary.
- `AVObsidian/` - this collaborator guidebook.

## Why One Large Component?

`AVOAtlasV3.jsx` currently keeps most logic in one file. That is not because this is the ideal final architecture; it is because the app has grown as an exploratory teaching artifact. The advantage is that a reader can follow the whole pipeline in one place:

1. Define rock and fluid properties.
2. Compute saturated properties.
3. Compute interface reflectivity.
4. Render linked seismic displays.
5. Apply scenarios and explain the results.

The cost is that the file is now long. One design roadmap item is to split it into modules once the teaching behavior is stable. See [[07 - Design Roadmap]].

## App Philosophy

The app should remain:

- **Interactive** - a change in a control should immediately alter the visual result.
- **Explanatory** - every major display should be traceable back to a physical idea.
- **Scenario-driven** - users learn by comparing cases, not only by reading theory.
- **Conservative in UI scope** - expose controls that teach a principle, not every parameter a processing package might expose.

## Current High-Level Flow

```text
User controls / scenario settings
  -> fluid + lithology + geometry state
  -> Gassmann / density / Vp / Vs / AI
  -> interface list
  -> Shuey A, B, C
  -> wavelet convolution
  -> visual panels
```

For a more detailed data-flow view, see [[04 - Data Flow and State Model]].

