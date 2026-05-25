# AVO Atlas Guidebook

This folder is an Obsidian-style knowledge repository for **AVO Atlas**. It is not part of the deployed app. It is meant for collaborators who want to understand the theory, the design choices, and the code before changing the project.

## Reading Path

Start here:

1. [[01 - Project Map and Design Intent]]
2. [[02 - AVO Theory Primer]]
3. [[03 - Code Walkthrough]]
4. [[04 - Data Flow and State Model]]
5. [[05 - Visual Panels and Rendering]]
6. [[06 - DHI and Scenario Notebook]]
7. [[07 - Design Roadmap]]
8. [[08 - Contributor Workflow]]

## What This Vault Covers

- The reasoning behind the app structure.
- The rock-physics and AVO theory used in the model.
- The role of each major section in `src/AVOAtlasV3.jsx`.
- How the synthetic gather, AVO curves, crossplot, impedance log, and scenario launchers are connected.
- Scenario-by-scenario interpretation notes with places to add screenshots.
- A roadmap for improving the app without breaking its teaching purpose.

## Snapshot Convention

Scenario screenshots should live in:

`AVObsidian/assets/snapshots/`

Use filenames like:

- `scenario-02-class-iii-gas-atlas.png`
- `scenario-02-class-iii-gas-guide.png`
- `dhi-flat-spot-sand.png`

In notes, embed them with Obsidian syntax:

```md
![[assets/snapshots/scenario-02-class-iii-gas-atlas.png]]
```

The worked atlas snapshots now live in [[06 - DHI and Scenario Notebook]] and are embedded from `assets/snapshots/`.
