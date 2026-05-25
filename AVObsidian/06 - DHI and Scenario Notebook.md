# DHI and Scenario Notebook

This note is the collaborator-facing version of the in-app scenario guide. It collects the Direct Hydrocarbon Indicator (DHI) catalog, the worked scenario text, and the atlas snapshots captured from the running app.

Related notes:

- [[02 - AVO Theory Primer]]
- [[05 - Visual Panels and Rendering]]
- [[03 - Code Walkthrough/11 - Guide and Scenario Components]]

## Snapshot Set

The images in this note were captured from the live atlas and stored in `AVObsidian/assets/snapshots/`. Each scenario snapshot shows the atlas immediately after the corresponding guide case is applied.

## DHI Catalog

### Bright Spot

Primary scenario:

- [[06 - DHI and Scenario Notebook#Scenario 02 - Class III - Classic Gas Bright Spot]]

Representative snapshot:

![[assets/snapshots/dhi-bright-spot.png]]

Guide text:

**What it is.** A reflection significantly stronger than the surrounding background, indicating an anomalously large impedance contrast. The classical DHI - and the one most students learn first - but also the source of the most false-positive interpretations in real exploration.

**What causes it.** A gas-charged soft sand below a normal shale overburden (Class III). The gas crashes the reservoir AI, producing a large negative contrast and a strong negative reflection. Brightens further with offset because of the Class III gradient.

**Pitfalls.** Tuning of thin clean sands, hard streaks, salt or basalt edges, igneous bodies, top-of-coal reflections, and shallow chalk crests can all produce strong reflections that mimic a gas bright spot. The AVO behaviour (brightening with offset) is what distinguishes a real Class III from a hard kick.

### Flat Spot

Primary scenarios:

- [[06 - DHI and Scenario Notebook#Scenario 02 - Class III - Classic Gas Bright Spot]]
- [[06 - DHI and Scenario Notebook#Scenario 08 - Carbonate Reservoir - Small Fluid Effects]]

Representative snapshot:

![[assets/snapshots/dhi-flat-spot.png]]

Guide text:

**What it is.** A horizontal reflection cutting across structural dip, marking the gas-water or gas-oil contact inside the reservoir. The most direct of the DHIs because fluid contacts are flat (or nearly so) under gravity, while structural features dip - a flat reflection in a dipping reservoir cannot be a stratigraphic feature.

**What causes it.** The impedance contrast between the hydrocarbon-saturated reservoir above and the brine-saturated reservoir below. Both have the same matrix; only the pore fluid differs. The AVO character of the flat spot is typically positive intercept with mixed gradient - frequently both A and B positive (so it sits in the "+/+" region) because the Vs changes only slightly across the contact while density rises substantially.

**Carbonates beware.** Because Gassmann fluid substitution moves stiff carbonates only slightly, the flat spot in a gas carbonate reservoir is typically tiny - barely detectable above noise. DHI workflows tuned for clastics fail in carbonate provinces precisely here.

### Polarity Reversal

Primary scenarios:

- [[06 - DHI and Scenario Notebook#Scenario 11 - Class IIp - Dim-Spot via Polarity Reversal]]
- [[06 - DHI and Scenario Notebook#Scenario 04 - Class I - Hard Reservoir Below Soft Shale]]

Representative snapshot:

![[assets/snapshots/dhi-polarity-reversal.png]]

Guide text:

**What it is.** A reflection whose sign changes - either across angle within a single gather, or laterally along a stacked section. The within-gather version is the AVO diagnostic of Class IIp (and sometimes Class I when the gradient is strong enough). The lateral version occurs where a stratigraphic horizon transitions from wet (positive amplitude) to gas-charged (negative amplitude) along its updip extent.

**What causes it (within gather).** Reflection coefficient R(θ) = A + B sin²θ + ... crosses zero somewhere between near and far offset. The intercept and the gradient have opposite signs - a small positive A combined with a strongly negative B produces this reversal.

**How to recognise it.** The black-filled wavelet on the near-trace turns into an unfilled trough on the far-trace, or vice versa. On angle-gather displays it is one of the most visually striking DHIs.

### Dim Spot

Primary scenarios:

- [[06 - DHI and Scenario Notebook#Scenario 05 - Class II - Near-Zero Impedance Contrast]]
- [[06 - DHI and Scenario Notebook#Scenario 11 - Class IIp - Dim-Spot via Polarity Reversal]]

Representative snapshot:

![[assets/snapshots/dhi-dim-spot.png]]

Guide text:

**What it is.** An anomalously weak reflection where geological context predicts a stronger one. The opposite signature to a bright spot - and harder to see because you are looking for an absence rather than a presence.

**What causes it.** Two mechanisms produce dim spots in hydrocarbon reservoirs. (i) Class II - the gas softens the reservoir just enough to bring AI close to the overburden, so the stacked amplitude is near zero. The reservoir hides itself on the near-offset stack. (ii) Class IIp - the positive near and negative far cancel out when stacked across the full angle range, again leaving near-zero amplitude. In both cases the hydrocarbon is genuinely there but invisible to a casual interpretation.

**How to find them.** Gradient stacks (B-stacks) and far-offset stacks reveal both forms. The Class IIp version also gives itself away on the gather as polarity reversal - the most direct signature.

### Anomalous Gradient

Primary scenario:

- [[06 - DHI and Scenario Notebook#Scenario 06 - Class IV - Anomalous Gradient]]

Representative snapshot:

![[assets/snapshots/dhi-class-iv.png]]

Guide text:

**What it is.** A bright soft loop on the near offset that weakens with offset - the opposite of the classical bright-spot AVO behaviour. Counter-intuitively, this is sometimes a real gas signature rather than a wet sand.

**What causes it.** Very hard cap rock - typically a carbon-rich shale (source rock with anomalously low Vs from kerogen) or a tight compacted shale - over a soft gas-charged unconsolidated sand. The high Vp/Vs contrast at the interface flips the sign of the gradient term, producing dimming with offset despite gas being present.

**Why it matters.** Misinterpreting a Class IV bright spot as a wet sand is a classic exploration mistake. Conversely, drilling a Class IV anomaly as if it were Class III (expecting bigger gas effects) leads to overestimated reserves.

## Worked Scenarios

### Scenario 01 - Background - Brine-Saturated Sand

![[assets/snapshots/scenario-01-background-brine.png]]

Settings applied: `ob_hard = soft`, `ub_hard = medium`, `lithology = unconsolidated_sand`, `phi = 0.28`, `hc_fluid = brine`, `hc_sat = 0.80`, `column_height = 0`, `thickness = 50`.

Geological setting:

Soft shale overburden seals an unconsolidated brine-saturated sand at 28% porosity, with medium-hardness underburden below. No hydrocarbons. This is the muted baseline against which all anomalies are judged.

Predictions:

**Impedance log.** Small step rightward at top reservoir (brine sand slightly harder than soft shale), straight line down through the reservoir, slightly larger step rightward at base into medium UB. No dashed contact line.

**Synthetic gather.** Two faint positive events. No flat-spot wavelet at any depth - the reservoir contains a single fluid and has no internal interface.

**AVO curves.** TR is small positive with a mild negative gradient - right on the Class I/II boundary (A ≈ 0.040). BR is a similar weak positive event with a slightly steeper negative gradient.

**A-B crossplot.** Both dots sit close to the origin, hugging the mudrock background trend in the upper portion of the lower-right and upper-right quadrants.

Observation:

This is what "no anomaly" looks like. Memorise the quiet character of these wavelets. When you see a much brighter event on real seismic, this is your visual reference. Notice also that the class boundary is heuristic - TR sits right on it, so the class label here means little; the physics is "background trend".

### Scenario 02 - Class III - Classic Gas Bright Spot

![[assets/snapshots/scenario-02-class-iii-gas.png]]

Settings applied: `ob_hard = soft`, `ub_hard = medium`, `lithology = unconsolidated_sand`, `phi = 0.28`, `hc_fluid = gas`, `hc_sat = 0.80`, `column_height = 0.55`, `thickness = 50`.

Geological setting:

Same soft-shale-over-unconsolidated-sand system as the baseline, but now the upper 55% of the reservoir is gas-charged at 80% saturation. This is the canonical North-Sea-style Tertiary clastic gas accumulation.

Predictions:

**Impedance log.** Large step LEFTward at top reservoir (gas sand is much softer than shale - Vp drops from 2300 to about 1880, density from 2.20 to 2.01). Small step rightward at the dashed contact. Step rightward at base.

**Synthetic gather.** Strong negative trough at top reservoir, getting visibly more negative (deeper trough) toward higher angles - the textbook Class III brightening. Positive peak at the contact (the flat spot). Weak positive peak at base.

**AVO curves.** TR curve starts deep below zero (A ≈ -0.15) and dives further with angle (B ≈ -0.28). FC and BR curves are positive.

**A-B crossplot.** TR firmly in the Class III region (lower-left). FC sits in the upper-right (both A and B positive - characteristic flat spot). BR mildly positive A, negative B (Class I-like).

Observation:

All three textbook direct hydrocarbon indicators in one section: bright spot at TR, AVO brightening of that bright spot with offset, and a flat-spot reflection at the contact. This is the configuration that built much of the offshore exploration industry in the 1970s-80s.

### Scenario 03 - Fizz Water - The Saturation Ambiguity

![[assets/snapshots/scenario-03-fizz-water.png]]

Settings applied: `ob_hard = soft`, `ub_hard = medium`, `lithology = unconsolidated_sand`, `phi = 0.28`, `hc_fluid = gas`, `hc_sat = 0.10`, `column_height = 0.55`, `thickness = 50`.

Geological setting:

Identical reservoir and geometry to the bright-spot case, but with gas saturation reduced from 80% to 10% in the HC zone. Geologically this is residual gas in a paleo-trap, or a small recent charge that has not displaced most of the brine.

Predictions:

**Impedance log.** Step leftward at top reservoir is nearly as large as the 80%-gas case (gas zone AI ≈ 4.18 vs 3.78 with 80% gas, vs 5.48 brine).

**Synthetic gather.** Visually almost indistinguishable from scenario 2 at normal display scales.

**AVO curves.** TR is still Class III (A ≈ -0.10, B ≈ -0.26) - slightly less extreme than the 80%-gas case but still firmly in the brightening regime.

**A-B crossplot.** TR has moved only slightly toward the origin compared to scenario 2.

Observation:

This is Gassmann's curse made visible: 10% gas mimics 80% gas. The Reuss harmonic average is dominated by the most compressible component - once any gas enters the pore space, the fluid bulk modulus collapses from 2.5 GPa to a few hundred MPa, and adding more gas barely changes things further. AVO detects gas presence with high sensitivity, but cannot reliably tell you how much.

### Scenario 04 - Class I - Hard Reservoir Below Soft Shale

![[assets/snapshots/scenario-04-class-i-hard.png]]

Settings applied: `ob_hard = medium`, `ub_hard = very_hard`, `lithology = consolidated_sand`, `phi = 0.15`, `hc_fluid = gas`, `hc_sat = 0.80`, `column_height = 0.55`, `thickness = 50`.

Geological setting:

Medium-stiffness shale overburden above a deeper, consolidated, lower-porosity gas-charged sand, with very-hard underburden below (e.g., cemented sand or carbonate). Typical of deeper or more cemented sandstone reservoirs.

Predictions:

**Impedance log.** Large step rightward at top (consolidated gas sand is still harder than shale because the cemented frame dominates). Small step rightward at the dashed contact (gas -> brine). Step rightward at base into hard UB.

**Synthetic gather.** Positive peak at top reservoir, visibly dimming with offset - the defining behaviour of Class I. The 0° trace shows a strong positive wavelet that fades by 30-40°, even crossing zero at far angles. Flat spot is a small positive event. Base reservoir a small positive event.

**AVO curves.** TR curve starts positive (A ≈ +0.14) and decreases steeply with angle (B ≈ -0.63). It crosses zero around 30° and goes negative - far-stack polarity reversal.

**A-B crossplot.** TR sits firmly in the Class I region (upper-left, positive A and strongly negative B).

Observation:

Hard reservoirs do not bright-spot. Their AVO signature lives in the change of amplitude with offset, not in the absolute amplitude. Far-offset stacks may show actual polarity reversal at the top reservoir, which is itself a strong DHI.

### Scenario 05 - Class II - Near-Zero Impedance Contrast

![[assets/snapshots/scenario-05-class-ii-balanced.png]]

Settings applied: `ob_hard = medium`, `ub_hard = medium`, `lithology = consolidated_sand`, `phi = 0.25`, `hc_fluid = gas`, `hc_sat = 0.80`, `column_height = 0.55`, `thickness = 50`.

Geological setting:

Medium-hardness shale above a moderate-porosity gas-charged consolidated sand where the impedance happens to be nearly identical at zero offset. Hydrocarbon is present but invisible on a near-offset stack - only AVO can find it.

Predictions:

**Impedance log.** TR step is barely visible (gas-sand AI ≈ 6.12 vs OB AI = 6.21 - only a 1.5% contrast). FC and BR steps are visible.

**Synthetic gather.** Top reservoir wavelet has near-zero amplitude on the 0° trace, then grows negatively with offset. Watching the trace amplitudes across angle is the only way to see it.

**AVO curves.** TR curve starts near zero (A ≈ -0.01) and slopes strongly negative (B ≈ -0.36). The gradient does all the work.

**A-B crossplot.** TR sits very near the vertical A=0 axis, in the lower half. This is the Class II region.

Observation:

On a near-offset stack this reservoir is essentially invisible. It reveals itself only on far-offset or angle-stack data. Real exploration in many basins relies on this AVO-only signature - Class II discoveries cannot be made by amplitude interpretation alone.

### Scenario 06 - Class IV - Anomalous Gradient

![[assets/snapshots/scenario-06-class-iv.png]]

Settings applied: `ob_hard = hard`, `ub_hard = medium`, `lithology = unconsolidated_sand`, `phi = 0.20`, `hc_fluid = gas`, `hc_sat = 0.80`, `column_height = 0.55`, `thickness = 50`.

Geological setting:

Hard caprock (compacted shale, hard mudstone, or tight silt) over a soft gas-charged unconsolidated sand. The conventional gas-sand bright-spot intuition breaks down here because the Vs contrast across the interface is large.

Predictions:

**Impedance log.** Very large step LEFTward at top (huge impedance drop from AI 8.09 to AI 4.63). Step rightward at the dashed contact. Step rightward at base.

**Synthetic gather.** Strong negative trough at top, but watch with offset: the amplitude *decreases* in magnitude - opposite to Class III. The wavelet on the 0° trace is the deepest; by 40° it has shallowed appreciably.

**AVO curves.** TR curve starts strongly negative (A ≈ -0.28) and slopes UPWARD (B ≈ +0.24, positive). The negative reflectivity moves toward zero with angle.

**A-B crossplot.** TR in the Class IV region - strongly negative A, but positive B. Lower-right of A=0 axis, above B=0.

Observation:

A bright spot that dims with offset would, on conventional logic, suggest a wet sand or interpretation error. But here it is real gas. Class IV occurs when the caprock has a higher Vp/Vs ratio than the reservoir - the second Shuey term flips sign because ΔVs is strongly negative. Blind use of AVO classification can fail in unconventional reservoirs.

### Scenario 07 - Depleted Reservoir - 4D-Style Time-Lapse

![[assets/snapshots/scenario-07-depleted-reservoir.png]]

Settings applied: `ob_hard = soft`, `ub_hard = medium`, `lithology = unconsolidated_sand`, `phi = 0.28`, `hc_fluid = gas`, `hc_sat = 0.80`, `column_height = 0.15`, `thickness = 50`.

Geological setting:

Same bright-spot reservoir as scenario 2, but after years of production: the gas cap has shrunk to 15% of reservoir thickness as the gas has been swept out or the oil-water contact has risen.

Predictions:

**Impedance log.** The dashed contact line has risen close to the top of the reservoir - only a thin gas band remains at the top. Most of the reservoir interval is brine-tinted now.

**Synthetic gather.** The flat-spot wavelet now sits very close to the top-reservoir wavelet - they partly interfere. Base reservoir wavelet is unchanged from baseline.

**AVO curves.** Identical to scenario 2 - the AVO at each interface depends only on the contrast at that interface, not on the column geometry.

**A-B crossplot.** TR, FC and BR dots are in identical positions to scenario 2. The differences are purely geometric.

Observation:

Compare this side by side with scenario 2 - this is what 4D (time-lapse) seismic looks for. The flat-spot rises in time, and the interference between TR and FC wavelets changes the apparent character of the top reservoir even though no per-interface AVO has changed. Real 4D analysis subtracts the baseline (scenario 2) from the monitor (scenario 7) to isolate production-induced changes.

### Scenario 08 - Carbonate Reservoir - Small Fluid Effects

![[assets/snapshots/scenario-08-carbonate.png]]

Settings applied: `ob_hard = medium`, `ub_hard = medium`, `lithology = carbonate`, `phi = 0.10`, `hc_fluid = gas`, `hc_sat = 0.80`, `column_height = 0.55`, `thickness = 50`.

Geological setting:

Medium-hardness overburden, calcite carbonate reservoir at 10% porosity, medium underburden. Same geometry as the gas scenarios, but the rock matrix is fundamentally stiffer.

Predictions:

**Impedance log.** Very large step rightward at top (carbonate AI ≈ 12.2 vs shale AI = 6.2 - almost double). FC step is tiny - barely visible on the line. Very large step leftward at base into the soft UB.

**Synthetic gather.** Strong positive peak at top, dimming with offset (Class I). FC wavelet is small. Strong negative trough at base (Class IV - soft UB below hard carbonate).

**AVO curves.** TR strongly positive A, strongly negative B. FC curve nearly flat near zero. BR is mirror-image of TR - strongly negative A with positive B.

**A-B crossplot.** TR far into Class I, BR far into Class IV, FC near the origin.

Observation:

Carbonates are stiff-framed: K_dry is already close to K_mineral, so Gassmann fluid substitution moves K_sat only slightly. The flat-spot reflection in a carbonate gas reservoir is therefore typically tiny - DHI workflows tuned for clastics generally fail in carbonate provinces. The dominant reflections are lithology contrasts at top and base.

### Scenario 09 - Oil Leg Instead of Gas

![[assets/snapshots/scenario-09-oil-versus-gas.png]]

Settings applied: `ob_hard = soft`, `ub_hard = medium`, `lithology = unconsolidated_sand`, `phi = 0.28`, `hc_fluid = oil`, `hc_sat = 0.80`, `column_height = 0.55`, `thickness = 50`.

Geological setting:

Identical geometry to the bright-spot scenario, but the hydrocarbon is oil at 80% saturation instead of gas.

Predictions:

**Impedance log.** Step at top reservoir is small (oil-sand AI ≈ 4.69 vs OB AI = 5.06 - only a mild leftward step). FC step is also small (oil-sand AI 4.69 -> brine-sand AI 5.48).

**Synthetic gather.** TR wavelet much weaker than the gas case. FC wavelet noticeably weaker. BR similar to gas case.

**AVO curves.** TR is now in the Class II region (small negative A ≈ -0.04, moderate negative B ≈ -0.18) rather than Class III. The reflection grows mildly more negative with offset but never approaches the magnitude of the gas case.

**A-B crossplot.** TR has moved up and toward the origin from its gas-case position - it now sits near the A = 0 line in the lower-half.

Observation:

Oil resembles brine acoustically far more than gas does - its bulk modulus is about 40% of brine's, versus less than 2% for gas. AVO discriminates gas from brine well; oil from brine, much less reliably. Many real oil discoveries lack a strong AVO signature and require alternative DHI methods (such as resistivity anomalies on EM).

### Scenario 10 - Tuning Thickness - Thin Bed Effects

![[assets/snapshots/scenario-10-thin-bed-tuning.png]]

Settings applied: `ob_hard = soft`, `ub_hard = medium`, `lithology = unconsolidated_sand`, `phi = 0.28`, `hc_fluid = gas`, `hc_sat = 0.80`, `column_height = 0.55`, `thickness = 18`.

Geological setting:

Bright-spot gas reservoir as scenario 2, but with thickness reduced from 50 m to 18 m - just below the default tuning thickness for a 30 Hz wavelet (≈20 m given Vp ≈ 2400 m/s in the gas zone).

Predictions:

**Impedance log.** Reservoir interval is visually compressed - top, dashed contact, and base are all close together in time.

**Synthetic gather.** The three wavelets overlap and interfere. Top-reservoir trough and base-reservoir peak begin to constructively-and-destructively combine. Apparent amplitudes can be enhanced or suppressed by the interference, not by AVO behaviour.

**AVO curves.** Identical to scenario 2 - these are interface properties and have no thickness dependence.

**A-B crossplot.** Identical to scenario 2 for the same reason.

Observation:

Sweep thickness from 80 m down to 15 m and watch the gather change character even though the AVO crossplot does not move. This is the tuning effect - a separate physics phenomenon from AVO. Below tuning thickness, amplitude maps may actually be measuring bed thickness, not fluid content. Many false bright-spot anomalies on real data turn out to be tuning effects in thin clean sands.

### Scenario 11 - Class IIp - Dim-Spot via Polarity Reversal

![[assets/snapshots/scenario-11-class-iip-dim.png]]

Settings applied: `ob_hard = medium`, `ub_hard = medium`, `lithology = consolidated_sand`, `phi = 0.22`, `hc_fluid = gas`, `hc_sat = 0.80`, `column_height = 0.55`, `thickness = 50`.

Geological setting:

Medium-stiffness shale over a moderate-porosity gas-charged consolidated sand. The reservoir is gas-bearing but its impedance is just slightly above the overburden at zero offset, so the AVO behaviour flips polarity within the gather.

Predictions:

**Impedance log.** Small step rightward at top (gas sand AI ≈ 6.70 vs shale 6.21). Small step right at the dashed contact. Step leftward at base (medium UB is softer than the consolidated brine leg).

**Synthetic gather.** Small positive peak at TR on the 0° trace that fades to nothing by about 15°, then becomes a negative trough that grows with angle - the polarity reverses across the gather. FC is a faint positive. BR is a moderate negative trough that intensifies with offset (Class IV at base).

**AVO curves.** TR starts just above zero (A ≈ +0.04) and slopes strongly negative (B ≈ -0.44), crossing zero around 15°. This is the polarity-reversal signature that defines Class IIp.

**A-B crossplot.** TR sits just inside the lower-right quadrant near the A-axis - the Class IIp region (small positive A with negative B sufficient to flip sign at far angles).

Observation:

On a stacked section averaging across the full angle range, the small positive near offset and the negative far offset largely cancel - the reservoir produces a dim spot exactly where the hydrocarbon is. The TR reflection nearly disappears on the stack while surrounding background events stay normal. Counter-intuitively, here it is the absence of amplitude rather than a bright spot that flags the prospect. Far-offset stacks or AVO gradient products are required to detect this signature.
