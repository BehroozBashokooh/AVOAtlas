# Design Roadmap

This note captures likely future work and the reasoning behind it.

## Roadmap Principles

The app should stay:

- Easy to use in a browser.
- Useful for teaching AVO intuition.
- Transparent enough for collaborators to reason about.
- Small enough that changes can be reviewed without needing a full app architecture diagram.

## Code Organization

Current state:

- Most code lives in `src/AVOAtlasV3.jsx`.

Possible refactor:

```text
src/
  physics/
    fluids.js
    gassmann.js
    shuey.js
    wavelets.js
  data/
    scenarios.js
    presets.js
  components/
    controls/
    charts/
    guide/
  AVOAtlasV3.jsx
```

When to do it:

Only after the current feature set stabilizes. Premature splitting can make the teaching flow harder to follow.

## Scenario Snapshots

Goal:

Keep screenshots in [[06 - DHI and Scenario Notebook]] synchronized with the current app behavior.

Current workflow:

- Use the local dev server.
- Apply each scenario.
- Capture consistent viewport screenshots.
- Store them in `AVObsidian/assets/snapshots/`.

Future automation:

Use Playwright or another browser automation tool to generate the scenario snapshots after code changes.

## Agent-Maintained Vault Updates

Goal:

Create a small local agent skill that reviews code changes and keeps the vault aligned with the app.

What the skill should do:

- Inspect diffs after updates to `src/AVOAtlasV3.jsx` and related files.
- Identify notes affected by the change, especially the code walkthrough, data flow note, visual panels note, and DHI/scenario notebook.
- Add a short change-log entry explaining what changed and why it matters.
- Refresh scenario snapshots when visual behavior changes.
- Check for stale Obsidian links and missing snapshot embeds.
- Avoid rewriting the vault wholesale; preserve the explanatory voice and cross-link structure.

Why it matters:

The vault is most useful when it stays close to the living code. A focused documentation-review skill would make that maintenance part of the normal development loop instead of a separate cleanup task.

## Wavelet Improvements

Current state:

- Ricker and Ormsby-style zero-phase wavelets.
- Dominant frequency slider and presets.
- Tuning estimate.

Possible future features:

- Minimum phase wavelet.
- Phase rotation.
- Custom Ormsby corner frequencies.
- A tooltip explaining how Ormsby corners are derived from dominant frequency.

Design caution:

Wavelet controls should teach bandwidth and tuning, not become a seismic processing UI.

## Better Rock Physics

Current state:

- Empirical dry-frame fits.
- Gassmann substitution.

Possible future features:

- Optional calibrated presets by basin/depth.
- Hashin-Shtrikman bounds as a teaching overlay.
- Log import for advanced users.

Design caution:

The current app is intentionally qualitative. If quantitative workflows are added, the UI must clearly separate "teaching mode" from "calibrated mode."

## Accessibility and Usability

Potential improvements:

- More keyboard-accessible controls.
- Better mobile layout for wide charts.
- Tooltips for symbols like `A`, `B`, `AI`, `nu`, `Vp`, `Vs`.
- Export scenario state as JSON.
- Shareable URLs for scenarios.

## Collaboration Workflow

Good future contributor tasks:

- Add images to [[06 - DHI and Scenario Notebook]].
- Split physics helpers into tested modules.
- Add unit tests for `mixFluid`, `gassmannSaturate`, `shueyTerms`, and wavelets.
- Add a snapshot-generation script.
- Improve guide cross-links and glossary terms.
