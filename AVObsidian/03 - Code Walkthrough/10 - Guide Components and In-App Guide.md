# 10 - Guide Components and In-App Guide

Previous: [[03 - Code Walkthrough/09 - Scenario Data and DHI Launchers]]
Next: [[03 - Code Walkthrough/11 - Main App State and Derived Model]]

## Tabs

```jsx
function Tabs({ view, setView }) {
  const tabs = [{ id: 'atlas', label: 'Atlas' }, { id: 'guide', label: 'Guide' }];
  return (
    <div className="inline-flex border border-stone-300 rounded overflow-hidden">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setView(t.id)}
          className={`text-[13px] px-4 py-1.5 font-medium transition-colors ${
            view === t.id ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
```

`Tabs` switches between the live atlas and the in-app guide.

## Equation Block

```jsx
const Eq = ({ children }) => (
  <div className="my-2 px-3 py-2 bg-stone-50 border-l-2 border-stone-400 font-mono text-[13px] tracking-tight overflow-x-auto">
    {children}
  </div>
);
```

`Eq` is a small formatting helper for equations in the guide.

## Scenario Card

```jsx
function ScenarioCard({ scenario, onApply }) {
  return (
    <section id={`scenario-${scenario.id}`} className="border border-stone-200 rounded p-5 bg-stone-50/40 scroll-mt-6">
      ...
      <button onClick={() => onApply(scenario.settings)}>
        Try in Atlas →
      </button>
      ...
    </section>
  );
}
```

`ScenarioCard` renders one worked scenario in the guide. The `id` is important because atlas-page scenario links scroll directly to it.

The card contains:

- title and number
- Try button
- geology setting
- predictions for each panel
- learning point

Related:

- [[06 - DHI and Scenario Notebook#Worked Scenarios]]

## Compact Scenario Launchers

```jsx
function CompactScenarioLaunchers({ onApplyScenario, onOpenGuideSection }) {
  const buttonClass = action => action.secondary
    ? 'text-[11px] px-2.5 py-1 bg-stone-100 text-stone-700 rounded hover:bg-stone-200 font-medium whitespace-nowrap'
    : 'text-[11px] px-2.5 py-1 bg-stone-900 text-white rounded hover:bg-stone-700 font-medium whitespace-nowrap';
```

The compact launcher solves a workflow problem:

Originally, users had to open the guide, click "Try in Atlas", then return to the guide to test another scenario. The launcher lets users test scenarios directly from the atlas page.

It has two columns:

- DHI concepts.
- Worked scenarios.

The name links jump to the guide. The Try buttons apply settings directly.

## Guide View

`GuideView` is the large in-app explanation. It covers:

- theory
- AVO classes
- DHI catalog
- worked scenarios
- exercises
- calibration note

This Obsidian vault is meant to be a deeper companion to `GuideView`, not a replacement for it.

Maintenance rule:

If the in-app guide changes its interpretation of a scenario, update [[06 - DHI and Scenario Notebook]] too.

