# AVO Atlas v3

An interactive forward-modeling tool for **Amplitude Variation with Offset (AVO)** seismic reflection analysis. Explore rock physics, Shuey reflection coefficients, and direct hydrocarbon indicators through hands-on simulation and live visualization.

## What is AVO Atlas?

AVO Atlas is a teaching tool that demystifies AVO geophysics by letting you:

- **Build a three-layer earth** — specify overburden, reservoir, and underburden properties
- **Run forward models** — compute rock physics (Gassmann saturation, Reuss fluid mixing) in real time
- **Visualize reflection sequences** — see synthetic angle gathers, impedance logs, AVO curves, and A–B crossplots update live as you adjust the model
- **Understand DHIs** — learn why gas-charged sands produce different AVO signatures at different depths (Class I, II, III, IV)
- **Learn from scenarios** — work through 11 guided examples, from the muted brine baseline to polarity-reversal dim spots and depleted-reservoir time-lapse effects
- **Test wavelet effects** — switch between zero-phase Ricker and Ormsby-style wavelets, adjust dominant frequency, and see the tuning estimate update live

The tool uses **SEG normal polarity** and computes reflections using the Shuey three-term linearization of the Zoeppritz equations, making it suitable for angles up to ~40°.

## Key Features

- **Live physics computation** — Gassmann fluid substitution, Shuey coefficients, wavelet convolution, acoustic impedance, and Poisson ratio compute on every change
- **Interactive controls** — adjust lithology, porosity, fluid, saturation, column height, thickness, wavelet type, and dominant frequency with sliders, presets, and dropdowns
- **Rich visualization** — wiggle traces with variable-area fills, impedance step logs, reflectivity curves, and A–B class crossplots
- **Acoustic properties panel** — inspect Vp, Vs, density, acoustic impedance, and Poisson ratio; optionally override layer properties manually
- **Guided scenarios** — 11 worked examples with predictions and learning points; use compact atlas launchers or click "Try in Atlas" from the guide
- **DHI launchers** — test bright spots, flat spots, polarity reversals, dim spots, and Class IV anomalies without leaving the atlas view
- **Wavelet controls** — choose Ricker or Ormsby-style zero-phase wavelets, use frequency presets from 15-60 Hz, or sweep 10-80 Hz with a live wavelet preview
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

This repo deploys the built `dist/` directory to the `gh-pages` branch:

```bash
npm run deploy
```

That command runs the production build first, then publishes the result with `gh-pages -d dist`.

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
5. How wavelet frequency and reservoir thickness interact through tuning


## Notes

- Styling uses **Tailwind CSS via CDN** inside a Vite/React app
- Dry-rock moduli are simple empirical fits, not Hashin–Shtrikman — valid for learning AVO behavior, not production-grade rock physics
- The synthetic gather defaults to a **30 Hz zero-phase Ricker wavelet**, but users can select **Ricker** or **Ormsby-style** wavelets and sweep dominant frequency from **10-80 Hz**
- The gather samples up to **40° incidence angle**

## License

This project is licensed under the MIT License.

AVO Atlas is provided as-is for educational use. You may use, copy, modify, and distribute it freely, provided that the copyright and license notice are preserved. See [LICENSE](LICENSE) for details.
