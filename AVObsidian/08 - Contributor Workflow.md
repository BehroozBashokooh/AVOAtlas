0# Contributor Workflow

This note explains how a collaborator can work safely on AVO Atlas.

## Local Setup

```bash
npm install
npm run dev
```

Open the URL printed by Vite. For GitHub Pages compatibility, the app is usually served under:

```text
/AVOAtlas/
```

## Build Check

Before proposing a change:

```bash
npm run build
```

This catches JSX and bundling errors.

## What to Read First

Recommended order:

1. [[01 - Project Map and Design Intent]]
2. [[02 - AVO Theory Primer]]
3. [[03 - Code Walkthrough]]
4. [[04 - Data Flow and State Model]]
5. [[06 - DHI and Scenario Notebook]]

## Common Change Types

### Add a New Scenario

1. Add an object to `SCENARIOS`.
2. Include:
   - `id`
   - `number`
   - `title`
   - `geology`
   - `settings`
   - `predictions`
   - `observation`
3. Check that `number` remains ordered.
4. Decide whether it belongs in `DHI_LAUNCHERS`.
5. Add an entry to [[06 - DHI and Scenario Notebook]].

### Add a New DHI Launcher

1. Add an entry to `DHI_LAUNCHERS`.
2. Point its actions to existing scenario ids.
3. Add an anchor section in the in-app guide if needed.
4. Add a matching note in [[06 - DHI and Scenario Notebook#DHI Catalog]].

### Add a Physics Feature

Before coding:

- Write the theory in [[02 - AVO Theory Primer]].
- Decide where it enters the data flow in [[04 - Data Flow and State Model]].
- Keep the UI small and explanatory.

After coding:

- Add interpretation notes to [[06 - DHI and Scenario Notebook]] if it changes visible behavior.

### Add or Update Screenshots

Store images in:

```text
AVObsidian/assets/snapshots/
```

Then embed with:

```md
![[assets/snapshots/example.png]]
```

## Deployment

The source branch is `main`.

Deploy the static site with:

```bash
npm run deploy
```

This builds `dist/` and publishes it to `gh-pages`.

## Review Checklist

Before asking for review:

- `npm run build` passes.
- The relevant scenario still loads.
- The guide text agrees with the app behavior.
- README changes are included if the user-facing feature changed.
- This Obsidian guide is updated if the architecture, theory, or scenarios changed.

