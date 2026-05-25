# AVO Atlas v3

An interactive forward-modeling tool for **Amplitude Variation with Offset (AVO)** seismic reflection analysis. Explore rock physics, Shuey reflection coefficients, and direct hydrocarbon indicators through hands-on simulation and live visualization.

## What is AVO Atlas?

AVO Atlas is a teaching tool that demystifies AVO geophysics by letting you:

- **Build a three-layer earth** — specify overburden, reservoir, and underburden properties
- **Run forward models** — compute rock physics (Gassmann saturation, Reuss fluid mixing) in real time
- **Visualize reflection sequences** — see synthetic angle gathers, impedance logs, AVO curves, and A–B crossplots update live as you adjust the model
- **Understand DHIs** — learn why gas-charged sands produce different AVO signatures at different depths (Class I, II, III, IV)
- **Learn from scenarios** — work through 10 guided examples, from the muted brine baseline to depleted-reservoir time-lapse effects

The tool uses **SEG normal polarity** and computes reflections using the Shuey three-term linearization of the Zoeppritz equations, making it suitable for angles up to ~40°.

## Key Features

- **Live physics computation** — Gassmann fluid substitution, Shuey coefficients, and Ricker wavelet convolution compute on every change
- **Interactive controls** — adjust lithology, porosity, fluid, saturation, column height, and thickness with sliders and dropdowns
- **Rich visualization** — wiggle traces with variable-area fills, impedance step logs, reflectivity curves, and A–B class crossplots
- **Guided scenarios** — 10 worked examples with predictions and learning points; click "Try in Atlas" to load them live
- **Theory in context** — read the full theory section (Gassmann, Shuey, AVO classes, DHIs) and connect it to live results

## Installation

Requires **Node.js 16+** and npm.

```bash
npm install
npm run dev
```

Open the app at `http://localhost:5173` (or the URL Vite prints).

### Build for production

```bash
npm run build
npm run preview
```

## Project Structure

```
.
├── index.html              # Vite entry point
├── src/
│   ├── main.jsx           # React boot
│   └── AVOAtlasV3.jsx     # Main component (physics, UI, scenarios)
├── package.json           # Dependencies: React, Vite, Recharts, Lucide icons
└── README.md              # This file
```

## Deployment

This is a static Vite/React app and can be hosted for free.

- Live demo: https://behroozbashokooh.github.io/AVOAtlas/
- The app uses `vite.config.js` with `base: '/AVOAtlas/'` so GitHub Pages finds the built assets correctly.

### GitHub Pages

1. Push this repo to GitHub.
2. In repository settings, enable GitHub Pages from the `main` branch.
3. Build the app locally with:

```bash
npm run build
```

4. Serve the generated `dist/` directory with GitHub Pages or a simple static host.

### Other free hosts

- **Vercel** — automatic build and deployment from `main`
- **Netlify** — automatic deploy from GitHub with a Vite build command

Both work well for this app because it has no backend.

## Why This Matters

Explorers and development geoscientists may end up using AVO classification as a "black box" — remembering that Class III = bright spot and Class I dims with offset, but not understanding *why*. AVO Atlas builds intuition by showing you:

1. How rock properties drive the physics (Gassmann)
2. How interfaces produce angle-dependent reflections (Shuey)
3. Why the same reservoir can flip from Class III at shallow depths to Class I at depth (impedance trends)
4. How fluid contacts (flat spots) and production depletion alter the seismic signature (time-lapse)


## Notes

- Styling uses **Tailwind CSS via CDN** — no build step needed
- Dry-rock moduli are simple empirical fits, not Hashin–Shtrikman — valid for learning AVO behavior, not production-grade rock physics
- The synthetic gather uses a **30 Hz Ricker wavelet** and samples up to **40° incidence angle**

## License

This project is licensed under the MIT License.

AVO Atlas is provided as-is for educational use. You may use, copy, modify, and distribute it freely, provided that the copyright and license notice are preserved. See [LICENSE](LICENSE) for details.
