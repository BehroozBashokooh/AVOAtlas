# 13 - Change Recipes

Previous: [[03 - Code Walkthrough/12 - Main Render Layout]]
Next: [[03 - Code Walkthrough]]

This note gives practical recipes for common code changes.

## Add a New Fluid

1. Add an entry to `FLUIDS`.
2. Add it to the pore-fluid `Select` options in the render layout.
3. Choose a color that is distinct from gas, oil, and brine.
4. Add at least one scenario or guide note if it teaches a new behavior.

Related:

- [[03 - Code Walkthrough/02 - Physics Constants and Presets#Code Fluids]]

## Add a New Lithology

1. Add an entry to `LITHOLOGY`.
2. Define:
   - `name`
   - `K_min`
   - `rho_grain`
   - `dryK`
   - `dryMu`
   - `phiRange`
3. Test with gas, oil, and brine.
4. Add a scenario only if the lithology changes the teaching space.

Related:

- [[03 - Code Walkthrough/02 - Physics Constants and Presets#Code Lithology]]

## Add a New Scenario

1. Add an object to `SCENARIOS`.
2. Include complete `settings`.
3. Add `predictions` for all four displays.
4. Add an `observation`.
5. Update [[06 - DHI and Scenario Notebook]].
6. Add to `DHI_LAUNCHERS` if relevant.

Related:

- [[03 - Code Walkthrough/09 - Scenario Data and DHI Launchers]]
- [[08 - Contributor Workflow#Add a New Scenario]]

## Add a New Chart or Visual Panel

1. Decide whether it is generic charting or seismic-specific rendering.
2. Use Recharts for conventional axes/tooltips.
3. Use SVG for seismic-specific panels.
4. Derive its data in the main app with `useMemo`.
5. Pass only the needed derived data into the panel.

Related:

- [[05 - Visual Panels and Rendering]]
- [[03 - Code Walkthrough/12 - Main Render Layout]]

## Add a New Wavelet

1. Add a helper near `ricker` and `ormsby`.
2. Add a case to `waveletSample`.
3. Add a type option in `WaveletPanel`.
4. Confirm both `WaveletPreview` and `SyntheticGather` use it.
5. Update [[02 - AVO Theory Primer#Wavelets and Tuning]].

Related:

- [[03 - Code Walkthrough/04 - Wavelet Functions]]
- [[03 - Code Walkthrough/06 - Acoustic Properties and Wavelet Controls#Wavelet Panel]]

## Rename `AVOAtlasV2`

This is a cleanup task.

1. Rename the exported function to `AVOAtlasV3`.
2. Check `src/main.jsx` import behavior.
3. Run `npm run build`.
4. Update walkthrough notes that mention the old name.

This should be behavior-neutral.

