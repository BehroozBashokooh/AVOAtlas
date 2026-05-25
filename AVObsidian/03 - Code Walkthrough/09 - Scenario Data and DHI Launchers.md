# 09 - Scenario Data and DHI Launchers

Previous: [[03 - Code Walkthrough/08 - Synthetic Gather Rendering]]
Next: [[03 - Code Walkthrough/10 - Guide Components and In-App Guide]]

## Scenario Object Shape

```jsx
const SCENARIOS = [
  {
    id: 'background_brine',
    number: 1,
    title: 'Background — brine-saturated sand',
    geology: '...',
    settings: { ob_hard: 'soft', ub_hard: 'medium', lithology: 'unconsolidated_sand', phi: 0.28, hc_fluid: 'brine', hc_sat: 0.80, column_height: 0, thickness: 50 },
    predictions: {
      impedanceLog: '...',
      gather: '...',
      avoCurves: '...',
      crossplot: '...',
    },
    observation: '...',
  },
  ...
];
```

Each scenario contains both machine-readable state and human-readable teaching text.

Machine-readable:

- `settings`

Human-readable:

- `title`
- `geology`
- `predictions`
- `observation`

This is why scenarios can power both:

- the app state changes
- the in-app guide and collaborator notes

## Why Predictions Are Stored With Scenarios

The app asks the user to predict, then verify. Keeping predictions next to settings makes each scenario self-contained.

This also makes [[06 - DHI and Scenario Notebook]] easier to maintain. If scenario text changes in the app, the notebook should be updated too.

## DHI Launchers

```jsx
const DHI_LAUNCHERS = [
  {
    id: 'dhi-bright-spot',
    name: 'Bright spot',
    actions: [
      { label: 'Try', scenarioId: 'class_III_gas' },
      { label: 'Compare brine', scenarioId: 'background_brine', secondary: true },
    ],
  },
  ...
];
```

`DHI_LAUNCHERS` is a compact index from interpretation concept to scenario. It lets the atlas page offer quick experimentation without forcing the user to scroll through the full guide.

Related:

- [[06 - DHI and Scenario Notebook#DHI Catalog]]

## Scenario Lookup

```jsx
const findScenario = id => SCENARIOS.find(s => s.id === id);
```

This tiny helper keeps launcher code readable.

Potential future improvement:

If scenario count grows, build a map once:

```jsx
const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map(s => [s.id, s]));
```

## Adding a Scenario

See [[08 - Contributor Workflow#Add a New Scenario]].

Important checks:

- Does the scenario teach a new concept?
- Does it duplicate an existing scenario?
- Should it appear in a DHI launcher?
- Does the README scenario count need updating?
- Does [[06 - DHI and Scenario Notebook]] need a new section?

