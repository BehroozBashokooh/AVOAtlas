import React, { useState, useMemo, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, ScatterChart, Scatter, ReferenceArea
} from 'recharts';
import { RotateCcw, Droplet, Layers, Waves } from 'lucide-react';

/* ════════════════════════════════════════════════════════════════════
   PHYSICS — fluids, minerals, dry-rock, Gassmann, Shuey
   ════════════════════════════════════════════════════════════════════ */

const FLUIDS = {
  gas:   { name: 'Gas',   K: 0.04, rho: 0.20, color: '#dc2626' },
  oil:   { name: 'Oil',   K: 1.0,  rho: 0.80, color: '#15803d' },
  brine: { name: 'Brine', K: 2.5,  rho: 1.05, color: '#2563eb' },
};

// Reservoir lithology — dry rock moduli as f(porosity). Calibrated by hand
// to give plausible Vp/Vs/ρ for each rock type across porosities of interest.
const LITHOLOGY = {
  unconsolidated_sand: {
    name: 'Unconsolidated sand',
    K_min: 37, rho_grain: 2.65,
    dryK:  phi => 8  * Math.exp(-4 * phi),
    dryMu: phi => 10 * Math.exp(-4 * phi),
    phiRange: [0.20, 0.38],
  },
  consolidated_sand: {
    name: 'Consolidated sand',
    K_min: 37, rho_grain: 2.65,
    dryK:  phi => 25 * Math.exp(-5 * phi),
    dryMu: phi => 28 * Math.exp(-5 * phi),
    phiRange: [0.05, 0.28],
  },
  carbonate: {
    name: 'Carbonate (calcite)',
    K_min: 70, rho_grain: 2.71,
    dryK:  phi => 55 * Math.exp(-5 * phi),
    dryMu: phi => 30 * Math.exp(-4 * phi),
    phiRange: [0.03, 0.25],
  },
};

// Qualitative hardness presets for overburden and underburden
const HARDNESS = {
  very_soft: { name: 'Very soft',  Vp: 1900, Vs: 750,  rho: 1.95 },
  soft:      { name: 'Soft',       Vp: 2300, Vs: 1050, rho: 2.20 },
  medium:    { name: 'Medium',     Vp: 2700, Vs: 1400, rho: 2.30 },
  hard:      { name: 'Hard',       Vp: 3300, Vs: 1850, rho: 2.45 },
  very_hard: { name: 'Very hard',  Vp: 4200, Vs: 2400, rho: 2.60 },
};

// Reuss average for fluid mixture (Sw fraction brine + Shc fraction HC fluid)
function mixFluid(hcKey, sat_hc) {
  const fhc = FLUIDS[hcKey];
  const fbr = FLUIDS.brine;
  const Sw = 1 - sat_hc;
  const K_fl = 1 / (sat_hc / fhc.K + Sw / fbr.K);
  const rho_fl = sat_hc * fhc.rho + Sw * fbr.rho;
  return { K_fl, rho_fl };
}

// Gassmann fluid substitution. Returns saturated Vp (m/s), Vs (m/s), rho (g/cc), AI.
function gassmannSaturate(lithKey, phi, K_fl, rho_fl) {
  const L = LITHOLOGY[lithKey];
  const K_dry = L.dryK(phi);
  const mu_dry = L.dryMu(phi);
  const K_min = L.K_min;
  const num = Math.pow(1 - K_dry / K_min, 2);
  const denom = phi / K_fl + (1 - phi) / K_min - K_dry / (K_min * K_min);
  const K_sat = K_dry + num / denom;
  const mu_sat = mu_dry; // Gassmann: shear unchanged
  const rho_sat = (1 - phi) * L.rho_grain + phi * rho_fl;
  // K, mu in GPa; rho in g/cc. Convert for Vp,Vs in m/s.
  const Vp = Math.sqrt((K_sat + (4 / 3) * mu_sat) * 1e9 / (rho_sat * 1000));
  const Vs = Math.sqrt(mu_sat * 1e9 / (rho_sat * 1000));
  return { Vp, Vs, rho: rho_sat, AI: Vp * rho_sat / 1000, K_sat, mu_sat };
}

function shueyTerms(Vp1, Vs1, r1, Vp2, Vs2, r2) {
  const Vp = (Vp1 + Vp2) / 2;
  const Vs = (Vs1 + Vs2) / 2;
  const rho = (r1 + r2) / 2;
  const dVp = Vp2 - Vp1, dVs = Vs2 - Vs1, drho = r2 - r1;
  const A = 0.5 * (dVp / Vp + drho / rho);
  const k2 = (Vs / Vp) ** 2;
  const B = dVp / (2 * Vp) - 4 * k2 * (dVs / Vs) - 2 * k2 * (drho / rho);
  const C = dVp / (2 * Vp);
  return { A, B, C };
}

function akiRichardsTerms(Vp1, Vs1, r1, Vp2, Vs2, r2) {
  const Vp = (Vp1 + Vp2) / 2;
  const Vs = (Vs1 + Vs2) / 2;
  const rho = (r1 + r2) / 2;
  const dVp = Vp2 - Vp1, dVs = Vs2 - Vs1, drho = r2 - r1;
  const A = 0.5 * (dVp / Vp + drho / rho);
  const C = 0.5 * (dVp / Vp);
  const k2 = (Vs / Vp) ** 2;
  const B = C - 2 * k2 * (drho / rho + 2 * (dVs / Vs));
  return { A, B, C };
}

function poissonRatio(Vp, Vs) {
  const vp2 = Vp * Vp;
  const vs2 = Vs * Vs;
  const denom = 2 * (vp2 - vs2);
  if (denom === 0) return NaN;
  return (vp2 - 2 * vs2) / denom;
}

const reflAt = (A, B, C, deg) => {
  const t = (deg * Math.PI) / 180;
  const s2 = Math.sin(t) ** 2;
  const tn2 = Math.tan(t) ** 2;
  return A + B * s2 + C * (tn2 - s2);
};

function classify(A, B) {
  // Class IV: negative intercept with positive gradient — soft reservoir below hard cap
  if (A < -0.02 && B > 0) return { cls: 'IV', color: '#1d4ed8' };

  // Class IIp: small positive intercept with strong negative gradient → polarity reversal at far offset
  // (R = A + B sin²θ crosses zero somewhere in the gather)
  if (A > 0 && A <= 0.04 && B < 0) {
    const R_30 = A + B * 0.25; // sin²(30°) = 0.25
    if (R_30 < -0.02) return { cls: 'IIp', color: '#7e22ce' };
  }

  if (A > 0.04 && B < 0)            return { cls: 'I',   color: '#a16207' };
  if (Math.abs(A) <= 0.04 && B < 0) return { cls: 'II',  color: '#9a3412' };
  if (A < -0.04 && B < 0)           return { cls: 'III', color: '#b91c1c' };
  if (A > 0 && B > 0)               return { cls: '+/+', color: '#374151' };
  return { cls: '—', color: '#6b7280' };
}

// Ricker wavelet (zero-phase)
const ricker = (t, f) => {
  const x = Math.PI * f * t;
  const x2 = x * x;
  return (1 - 2 * x2) * Math.exp(-x2);
};

const sinc = x => (Math.abs(x) < 1e-9 ? 1 : Math.sin(x) / x);

function ormsby(t, f) {
  const corners = [0.35, 0.65, 1.35, 1.65].map(scale => Math.max(1, f * scale));
  const raw = (time) => {
    const [f1, f2, f3, f4] = corners;
    const term = (hi, lo) => {
      const pHi = Math.PI * hi;
      const pLo = Math.PI * lo;
      return ((pHi ** 2) * (sinc(pHi * time) ** 2) - (pLo ** 2) * (sinc(pLo * time) ** 2)) / (pHi - pLo);
    };
    return term(f4, f3) - term(f2, f1);
  };
  const norm = raw(0);
  return norm === 0 ? 0 : raw(t) / norm;
}

function waveletSample(t, type, frequency) {
  return type === 'ormsby' ? ormsby(t, frequency) : ricker(t, frequency);
}

/* ════════════════════════════════════════════════════════════════════
   UI PRIMITIVES
   ════════════════════════════════════════════════════════════════════ */

function Select({ label, value, onChange, options }) {
  return (
    <div className="mb-3">
      <label className="text-[11px] uppercase tracking-wider text-stone-500 block mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-[13px] border border-stone-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
      >
        {options.map(([k, lab]) => <option key={k} value={k}>{lab}</option>)}
      </select>
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step, unit, accent, fmt }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] uppercase tracking-wider text-stone-500">{label}</span>
        <span className="font-mono tabular-nums text-[13px] text-stone-900">
          {fmt(value)} <span className="text-stone-400 text-[11px]">{unit}</span>
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-lg appearance-none cursor-pointer"
        style={{ accentColor: accent, background: '#e7e5e4' }}
      />
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="flex justify-between items-baseline py-1 border-b border-stone-100 last:border-0">
      <span className="text-[11px] text-stone-500 uppercase tracking-wider">{label}</span>
      <span className="text-[13px] font-mono tabular-nums" style={{ color: color || '#1c1917' }}>{value}</span>
    </div>
  );
}

function RhoSymbol() {
  return <span className="font-serif italic normal-case tracking-normal text-[1.08em]">ρ</span>;
}

function ElasticNumber({ value, onChange, step = 1, color }) {
  return (
    <input
      type="number"
      value={value}
      min={0}
      step={step}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-16 px-1 py-0.5 border border-stone-300 rounded text-right font-mono tabular-nums text-[12px] focus:outline-none focus:border-stone-500"
      style={{ color: color || '#1c1917' }}
    />
  );
}

function ElasticPropertiesPanel({
  defaults,
  values,
  customElastic,
  onEnableCustom,
  onReset,
  onElasticChange,
  hcColor,
}) {
  const rows = [
    { key: 'ob', label: 'OB', color: '#1c1917' },
    { key: 'hc_res', label: 'HC res', color: hcColor },
    { key: 'br_res', label: 'Brine res', color: FLUIDS.brine.color },
    { key: 'ub', label: 'UB', color: '#1c1917' },
  ];
  const formatPoisson = rock => {
    const nu = poissonRatio(rock.Vp, rock.Vs);
    return Number.isFinite(nu) ? nu.toFixed(3) : '—';
  };

  return (
    <section className="bg-white border border-stone-200 rounded p-4">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-stone-100 gap-2">
        <h2 className="font-serif text-base text-stone-900">Acoustic properties</h2>
        {customElastic ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[11px] text-stone-600 border border-stone-300 rounded px-2 py-1 hover:bg-stone-50"
          >
            <RotateCcw size={12} /> reset
          </button>
        ) : (
          <button
            type="button"
            onClick={onEnableCustom}
            className="text-[11px] text-stone-600 border border-stone-300 rounded px-2 py-1 hover:bg-stone-50"
          >
            custom
          </button>
        )}
      </div>

      {!customElastic ? (
        <>
          <Stat label="OB · AI" value={values.ob.AI.toFixed(2)} />
          <Stat label="OB · Poisson ratio" value={formatPoisson(values.ob)} />
          <Stat label="HC-sat reservoir · Vp" value={values.hc_res.Vp.toFixed(0) + ' m/s'} color={hcColor} />
          <Stat label={<>HC-sat reservoir · density <RhoSymbol /></>} value={values.hc_res.rho.toFixed(3) + ' g/cc'} color={hcColor} />
          <Stat label="HC-sat reservoir · Poisson ratio" value={formatPoisson(values.hc_res)} color={hcColor} />
          <Stat label="HC-sat reservoir · AI" value={values.hc_res.AI.toFixed(2)} color={hcColor} />
          <Stat label="Brine-sat reservoir · Vp" value={values.br_res.Vp.toFixed(0) + ' m/s'} color={FLUIDS.brine.color} />
          <Stat label={<>Brine-sat reservoir · density <RhoSymbol /></>} value={values.br_res.rho.toFixed(3) + ' g/cc'} color={FLUIDS.brine.color} />
          <Stat label="Brine-sat reservoir · Poisson ratio" value={formatPoisson(values.br_res)} color={FLUIDS.brine.color} />
          <Stat label="Brine-sat reservoir · AI" value={values.br_res.AI.toFixed(2)} color={FLUIDS.brine.color} />
          <Stat label="UB · AI" value={values.ub.AI.toFixed(2)} />
          <Stat label="UB · Poisson ratio" value={formatPoisson(values.ub)} />
        </>
      ) : (
        <div className="space-y-2 overflow-x-auto">
          <div className="grid min-w-[24rem] grid-cols-[3.8rem_3.75rem_3.75rem_4.5rem_3.25rem_3.5rem] gap-1 items-center text-[10px] uppercase tracking-wider text-stone-400">
            <span>zone</span>
            <span className="text-right">Vp</span>
            <span className="text-right">Vs</span>
            <span className="text-right">Density <RhoSymbol /></span>
            <span className="text-right">ν</span>
            <span className="text-right">AI</span>
          </div>
          {rows.map(row => {
            const v = values[row.key];
            const d = defaults[row.key];
            return (
              <div key={row.key} className="grid min-w-[24rem] grid-cols-[3.8rem_3.75rem_3.75rem_4.5rem_3.25rem_3.5rem] gap-1 items-center">
                <span className="text-[11px] text-stone-500 uppercase tracking-wider">{row.label}</span>
                <ElasticNumber value={Math.round(v.Vp)} onChange={next => onElasticChange(row.key, 'Vp', next)} color={row.color} />
                <ElasticNumber value={Math.round(v.Vs)} onChange={next => onElasticChange(row.key, 'Vs', next)} color={row.color} />
                <ElasticNumber value={v.rho.toFixed(3)} step={0.001} onChange={next => onElasticChange(row.key, 'rho', next)} color={row.color} />
                <span className="text-[12px] font-mono tabular-nums text-right" style={{ color: row.color }}>
                  {formatPoisson(v)}
                </span>
                <span className="text-[12px] font-mono tabular-nums text-right" style={{ color: row.color }}>
                  {v.AI.toFixed(2)}
                </span>
                <span className="col-start-2 col-span-5 text-[10px] text-stone-400 font-mono tabular-nums">
                  default {d.Vp.toFixed(0)} / {d.Vs.toFixed(0)} / {d.rho.toFixed(3)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function WaveletPreview({ type, frequency, width = 220, height = 72 }) {
  const margin = { top: 8, right: 12, bottom: 16, left: 12 };
  const W = width - margin.left - margin.right;
  const H = height - margin.top - margin.bottom;
  const midY = margin.top + H / 2;
  const duration = 0.16;
  const samples = 96;
  const xAt = i => margin.left + (i / samples) * W;
  const yAt = amp => midY - amp * H * 0.42;
  const path = Array.from({ length: samples + 1 }, (_, i) => {
    const t = -duration / 2 + (i / samples) * duration;
    return `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(waveletSample(t, type, frequency)).toFixed(1)}`;
  }).join(' ');
  const label = type === 'ormsby' ? 'zero-phase Ormsby' : 'zero-phase Ricker';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[72px] bg-stone-50 rounded border border-stone-200">
      <line x1={margin.left} y1={midY} x2={margin.left + W} y2={midY} stroke="#d6d3d1" strokeWidth={0.8} />
      <path d={path} stroke="#1c1917" strokeWidth={1.6} fill="none" />
      <text x={width / 2} y={height - 5} textAnchor="middle" fontSize={9} fill="#78716c" fontStyle="italic">
        {label} · {frequency.toFixed(0)} Hz
      </text>
    </svg>
  );
}

function WaveletPanel({ type, frequency, onTypeChange, onFrequencyChange, tuningThickness }) {
  const presets = [15, 25, 30, 40, 60];
  const typeOptions = [['ricker', 'Ricker'], ['ormsby', 'Ormsby']];

  return (
    <section className="bg-white border border-stone-200 rounded p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100 gap-2">
        <h2 className="font-serif text-base text-stone-900 flex items-center gap-2">
          <Waves size={15} className="text-stone-500" /> Wavelet
        </h2>
        <button
          type="button"
          onClick={() => {
            onTypeChange('ricker');
            onFrequencyChange(30);
          }}
          className="text-[11px] text-stone-600 border border-stone-300 rounded px-2 py-1 hover:bg-stone-50"
        >
          reset
        </button>
      </div>

      <div className="mb-3">
        <label className="text-[11px] uppercase tracking-wider text-stone-500 block mb-1">Type</label>
        <div className="inline-flex border border-stone-300 rounded overflow-hidden">
          {typeOptions.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onTypeChange(key)}
              className={`text-[12px] px-3 py-1 font-medium ${
                type === key ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 hover:bg-stone-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Slider
        label="Dominant frequency"
        value={frequency}
        onChange={onFrequencyChange}
        min={10}
        max={80}
        step={1}
        unit="Hz"
        accent="#57534e"
        fmt={v => v.toFixed(0)}
      />

      <div className="flex gap-1.5 flex-wrap mb-3">
        {presets.map(preset => (
          <button
            key={preset}
            type="button"
            onClick={() => onFrequencyChange(preset)}
            className={`text-[11px] px-2 py-1 rounded border ${
              frequency === preset
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
            }`}
          >
            {preset} Hz
          </button>
        ))}
      </div>

      <WaveletPreview type={type} frequency={frequency} />
      <div className="mt-2 text-[11px] text-stone-600 leading-snug">
        <span className="font-medium text-stone-800">λ/4 tuning estimate:</span>{' '}
        <span className="font-mono tabular-nums">{tuningThickness.toFixed(1)} m</span>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   IMPEDANCE LOG (the user's sketch, made interactive)
   ════════════════════════════════════════════════════════════════════ */

function ImpedanceLog({ ob, hc_res, br_res, ub, column_height, hc_fluid, t_top, t_FC, t_BR, t_window, width = 240, height = 380 }) {
  const margin = { top: 24, right: 24, bottom: 36, left: 16 };
  const W = width - margin.left - margin.right;
  const H = height - margin.top - margin.bottom;

  const has_FC = column_height > 0 && column_height < 1;
  const AI_upper = column_height > 0 ? hc_res.AI : br_res.AI;
  const AI_lower = column_height < 1 ? br_res.AI : hc_res.AI;

  // AI horizontal extent with padding
  const allAI = [ob.AI, AI_upper, AI_lower, ub.AI];
  let AImin = Math.min(...allAI);
  let AImax = Math.max(...allAI);
  const range = AImax - AImin || 1;
  AImin -= range * 0.15;
  AImax += range * 0.15;

  const xAI = ai => margin.left + ((ai - AImin) / (AImax - AImin)) * W;
  const yT  = t  => margin.top + ((t - t_window[0]) / (t_window[1] - t_window[0])) * H;

  // Step path through the four (or three) zones
  const yTop = yT(t_window[0]);
  const yTR  = yT(t_top);
  const yFC  = yT(t_FC);
  const yBR  = yT(t_BR);
  const yBot = yT(t_window[1]);

  const path = has_FC ? [
    `M ${xAI(ob.AI)} ${yTop}`,
    `L ${xAI(ob.AI)} ${yTR}`,
    `L ${xAI(AI_upper)} ${yTR}`,
    `L ${xAI(AI_upper)} ${yFC}`,
    `L ${xAI(AI_lower)} ${yFC}`,
    `L ${xAI(AI_lower)} ${yBR}`,
    `L ${xAI(ub.AI)} ${yBR}`,
    `L ${xAI(ub.AI)} ${yBot}`,
  ].join(' ') : [
    `M ${xAI(ob.AI)} ${yTop}`,
    `L ${xAI(ob.AI)} ${yTR}`,
    `L ${xAI(AI_upper)} ${yTR}`,
    `L ${xAI(AI_upper)} ${yBR}`,
    `L ${xAI(ub.AI)} ${yBR}`,
    `L ${xAI(ub.AI)} ${yBot}`,
  ].join(' ');

  const fluidCol = FLUIDS[hc_fluid].color;

  return (
    <svg width={width} height={height} style={{ background: 'white' }}>
      {/* Layer background tinting */}
      <rect x={margin.left} y={yTop} width={W} height={yTR - yTop} fill="#e7e5e4" opacity={0.5} />
      <rect x={margin.left} y={yTR}  width={W} height={yBR - yTR}  fill="#fef3c7" opacity={0.4} />
      <rect x={margin.left} y={yBR}  width={W} height={yBot - yBR} fill="#e7e5e4" opacity={0.5} />

      {/* Fluid tints — derive band edges directly from column_height so the
          full-column (=1) and full-brine (=0) cases tint the entire reservoir. */}
      {(() => {
        const yContact = column_height >= 1 ? yBR
                       : column_height <= 0 ? yTR
                       : yFC;
        const upperHeight = yContact - yTR;
        const lowerHeight = yBR - yContact;
        return (
          <>
            {upperHeight > 0 && (
              <rect x={margin.left} y={yTR} width={W} height={upperHeight}
                    fill={fluidCol} opacity={0.10} />
            )}
            {lowerHeight > 0 && (
              <rect x={margin.left} y={yContact} width={W} height={lowerHeight}
                    fill={FLUIDS.brine.color} opacity={0.08} />
            )}
          </>
        );
      })()}

      {/* Layer labels */}
      <text x={margin.left + W / 2} y={(yTop + yTR) / 2 + 4} fontSize={11} textAnchor="middle" fill="#57534e" fontFamily="ui-serif, Georgia, serif" fontStyle="italic">overburden</text>
      <text x={margin.left + W / 2} y={(yTR + yBR) / 2 + 4} fontSize={11} textAnchor="middle" fill="#57534e" fontFamily="ui-serif, Georgia, serif" fontStyle="italic">reservoir</text>
      <text x={margin.left + W / 2} y={(yBR + yBot) / 2 + 4} fontSize={11} textAnchor="middle" fill="#57534e" fontFamily="ui-serif, Georgia, serif" fontStyle="italic">underburden</text>

      {/* The AI step function */}
      <path d={path} stroke="#1c1917" strokeWidth={2} fill="none" />

      {/* Fluid contact dashed line */}
      {has_FC && (
        <line x1={margin.left} y1={yFC} x2={margin.left + W} y2={yFC}
              stroke="#1c1917" strokeWidth={1.4} strokeDasharray="5 3" />
      )}

      {/* AI axis (bottom) */}
      <line x1={margin.left} y1={margin.top + H} x2={margin.left + W} y2={margin.top + H} stroke="#a8a29e" strokeWidth={0.5} />
      <text x={margin.left + W / 2} y={height - 8} fontSize={10} textAnchor="middle" fill="#57534e" fontStyle="italic">
        acoustic impedance →
      </text>

      {/* TWT axis labels (top) */}
      <text x={margin.left + 4} y={margin.top - 8} fontSize={9} fill="#78716c" fontFamily="ui-monospace, monospace">
        TWT {t_window[0].toFixed(2)} s
      </text>
      <text x={margin.left + 4} y={margin.top + H + 14} fontSize={9} fill="#78716c" fontFamily="ui-monospace, monospace">
        TWT {t_window[1].toFixed(2)} s
      </text>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SYNTHETIC ANGLE GATHER
   Wiggle traces for each angle, showing top-reservoir, fluid-contact
   and base-reservoir reflections.
   ════════════════════════════════════════════════════════════════════ */

function SyntheticGather({ interfaces, t_window, waveletType = 'ricker', f_dom = 30, width = 460, height = 380 }) {
  const margin = { top: 24, right: 16, bottom: 36, left: 36 };
  const W = width - margin.left - margin.right;
  const H = height - margin.top - margin.bottom;

  const angles = [0, 5, 10, 15, 20, 25, 30, 35, 40];
  const traceSpacing = W / angles.length;
  const ampScale = traceSpacing * 0.75; // exaggerated for visibility on small screens

  const n_samples = 220;
  const dt = (t_window[1] - t_window[0]) / n_samples;

  const xC = i => margin.left + (i + 0.5) * traceSpacing;
  const yT = t => margin.top + ((t - t_window[0]) / (t_window[1] - t_window[0])) * H;

  const traceData = angles.map(angle => {
    const samples = new Array(n_samples + 1);
    for (let i = 0; i <= n_samples; i++) {
      const t = t_window[0] + i * dt;
      let amp = 0;
      for (const intf of interfaces) {
        if (intf.time === null) continue;
        const R = reflAt(intf.A, intf.B, intf.C, angle);
        amp += R * waveletSample(t - intf.time, waveletType, f_dom);
      }
      samples[i] = amp;
    }
    return { angle, samples };
  });

  return (
    <svg width={width} height={height} style={{ background: 'white' }}>
      {/* TWT axis (left) */}
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + H} stroke="#a8a29e" strokeWidth={0.5} />
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const t = t_window[0] + f * (t_window[1] - t_window[0]);
        return (
          <g key={f}>
            <line x1={margin.left - 4} y1={yT(t)} x2={margin.left} y2={yT(t)} stroke="#a8a29e" strokeWidth={0.5} />
            <text x={margin.left - 6} y={yT(t) + 3} fontSize={9} textAnchor="end" fill="#78716c" fontFamily="ui-monospace, monospace">
              {t.toFixed(3)}
            </text>
          </g>
        );
      })}
      <text x={10} y={margin.top + H / 2} fontSize={10} fill="#57534e" fontStyle="italic" transform={`rotate(-90 10 ${margin.top + H / 2})`} textAnchor="middle">TWT (s)</text>

      {/* Interface time markers (faint) */}
      {interfaces.map((intf, i) => intf.time !== null && (
        <g key={i}>
          <line x1={margin.left} y1={yT(intf.time)} x2={margin.left + W} y2={yT(intf.time)}
                stroke={intf.cls.color} strokeWidth={0.6} strokeDasharray="2 4" opacity={0.5} />
          <text x={margin.left + W + 2} y={yT(intf.time) + 3} fontSize={9} fill={intf.cls.color} fontFamily="ui-monospace, monospace">
            {intf.label}
          </text>
        </g>
      ))}

      {/* Wiggle traces */}
      {traceData.map(({ angle, samples }, i) => {
        const cx = xC(i);

        // Build wiggle path
        const wigglePath = samples.map((amp, j) => {
          const x = cx + amp * ampScale;
          const y = margin.top + (j / n_samples) * H;
          return `${j === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        // Variable area fill — positive amplitudes only
        const fillPath = ['M ' + cx + ' ' + margin.top];
        for (let j = 0; j <= n_samples; j++) {
          const a = samples[j] > 0 ? samples[j] : 0;
          const x = cx + a * ampScale;
          const y = margin.top + (j / n_samples) * H;
          fillPath.push('L ' + x + ' ' + y);
        }
        fillPath.push('L ' + cx + ' ' + (margin.top + H));
        fillPath.push('Z');

        return (
          <g key={angle}>
            {/* baseline */}
            <line x1={cx} y1={margin.top} x2={cx} y2={margin.top + H} stroke="#e7e5e4" strokeWidth={0.5} />
            {/* positive variable-area fill */}
            <path d={fillPath.join(' ')} fill="#1c1917" fillOpacity={0.78} />
            {/* wiggle */}
            <path d={wigglePath} stroke="#1c1917" strokeWidth={0.7} fill="none" />
            {/* angle label */}
            <text x={cx} y={margin.top - 8} fontSize={10} textAnchor="middle" fill="#57534e" fontFamily="ui-monospace, monospace">{angle}°</text>
          </g>
        );
      })}

      <text x={margin.left + W / 2} y={height - 8} fontSize={10} textAnchor="middle" fill="#57534e" fontStyle="italic">incidence angle</text>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════
   POLARITY LEGEND — small panel showing wiggle convention
   ════════════════════════════════════════════════════════════════════ */

function PolarityLegend({ height = 380 }) {
  const W = 168;
  const cx = 84;
  const wig_top = 60;
  const wig_h = 200;
  const seg = wig_h / 4;

  // Build a stylised peak (right-deflecting, filled) wavelet for the top half
  // and a stylised trough (left-deflecting) for the bottom half.
  const peakPath = `M ${cx} ${wig_top}
                    Q ${cx + 22} ${wig_top + seg * 0.5} ${cx} ${wig_top + seg}
                    Q ${cx - 6} ${wig_top + seg * 1.4} ${cx} ${wig_top + seg * 1.8}`;
  const peakFill = `M ${cx} ${wig_top}
                    Q ${cx + 22} ${wig_top + seg * 0.5} ${cx} ${wig_top + seg}
                    L ${cx} ${wig_top + seg} L ${cx} ${wig_top} Z`;

  const troughTop = wig_top + 2 * seg + 10;
  const troughPath = `M ${cx} ${troughTop}
                      Q ${cx + 6} ${troughTop + seg * 0.4} ${cx} ${troughTop + seg * 0.8}
                      Q ${cx - 22} ${troughTop + seg * 1.3} ${cx} ${troughTop + seg * 1.8}`;

  return (
    <svg width={W} height={height} style={{ background: 'white' }}>
      <text x={cx} y={18} fontSize={10} textAnchor="middle" fill="#57534e" fontStyle="italic">polarity</text>
      <text x={cx} y={32} fontSize={9} textAnchor="middle" fill="#78716c">SEG normal</text>

      {/* central baseline */}
      <line x1={cx} y1={wig_top - 6} x2={cx} y2={wig_top + wig_h - 30} stroke="#e7e5e4" strokeWidth={0.6} />

      {/* PEAK wavelet (filled, right-deflecting) */}
      <path d={peakFill} fill="#1c1917" fillOpacity={0.78} />
      <path d={peakPath} stroke="#1c1917" strokeWidth={0.8} fill="none" />
      <line x1={cx + 26} y1={wig_top + seg * 0.5} x2={cx + 40} y2={wig_top + seg * 0.5} stroke="#a16207" strokeWidth={1} />
      <polygon points={`${cx + 40},${wig_top + seg * 0.5} ${cx + 36},${wig_top + seg * 0.5 - 2.5} ${cx + 36},${wig_top + seg * 0.5 + 2.5}`} fill="#a16207" />
      <text x={cx + 42} y={wig_top + seg * 0.5 - 5} fontSize={9} fill="#a16207" fontWeight="600">PEAK</text>
      <text x={cx + 42} y={wig_top + seg * 0.5 + 7} fontSize={8} fill="#a16207">R &gt; 0</text>
      <text x={cx + 42} y={wig_top + seg * 0.5 + 17} fontSize={8} fill="#a16207" fontStyle="italic">harder ↓</text>

      {/* TROUGH wavelet (left-deflecting, unfilled) */}
      <path d={troughPath} stroke="#1c1917" strokeWidth={0.8} fill="none" />
      <line x1={cx - 26} y1={troughTop + seg * 1.3} x2={cx - 40} y2={troughTop + seg * 1.3} stroke="#9a3412" strokeWidth={1} />
      <polygon points={`${cx - 40},${troughTop + seg * 1.3} ${cx - 36},${troughTop + seg * 1.3 - 2.5} ${cx - 36},${troughTop + seg * 1.3 + 2.5}`} fill="#9a3412" />
      <text x={cx - 42} y={troughTop + seg * 1.3 - 5} fontSize={9} fill="#9a3412" textAnchor="end" fontWeight="600">TROUGH</text>
      <text x={cx - 42} y={troughTop + seg * 1.3 + 7} fontSize={8} fill="#9a3412" textAnchor="end">R &lt; 0</text>
      <text x={cx - 42} y={troughTop + seg * 1.3 + 17} fontSize={8} fill="#9a3412" textAnchor="end" fontStyle="italic">softer ↓</text>

      {/* Footer */}
      <line x1={8} y1={height - 50} x2={W - 8} y2={height - 50} stroke="#e7e5e4" strokeWidth={0.6} />
      <text x={cx} y={height - 36} fontSize={8} textAnchor="middle" fill="#57534e">+ deflection → right</text>
      <text x={cx} y={height - 25} fontSize={8} textAnchor="middle" fill="#57534e">filled = positive</text>
      <text x={cx} y={height - 12} fontSize={7} textAnchor="middle" fill="#a8a29e" fontStyle="italic">(reverse SEG flips signs)</text>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SCENARIOS — guided examples that apply settings to the live atlas
   ════════════════════════════════════════════════════════════════════ */

const SCENARIOS = [
  {
    id: 'background_brine',
    number: 1,
    title: 'Background — brine-saturated sand',
    geology: 'Soft shale overburden seals an unconsolidated brine-saturated sand at 28% porosity, with medium-hardness underburden below. No hydrocarbons. This is the muted baseline against which all anomalies are judged.',
    settings: { ob_hard: 'soft', ub_hard: 'medium', lithology: 'unconsolidated_sand', phi: 0.28, hc_fluid: 'brine', hc_sat: 0.80, column_height: 0, thickness: 50 },
    predictions: {
      impedanceLog: 'Small step rightward at top reservoir (brine sand slightly harder than soft shale), straight line down through the reservoir, slightly larger step rightward at base into medium UB. No dashed contact line.',
      gather: 'Two faint positive events. No flat-spot wavelet at any depth — the reservoir contains a single fluid and has no internal interface.',
      avoCurves: 'TR is small positive with a mild negative gradient — right on the Class I/II boundary (A ≈ 0.040). BR is a similar weak positive event with a slightly steeper negative gradient.',
      crossplot: 'Both dots sit close to the origin, hugging the mudrock background trend in the upper portion of the lower-right and upper-right quadrants.',
    },
    observation: 'This is what "no anomaly" looks like. Memorise the quiet character of these wavelets. When you see a much brighter event on real seismic, this is your visual reference. Notice also that the class boundary is heuristic — TR sits right on it, so the class label here means little; the physics is "background trend".',
  },
  {
    id: 'class_III_gas',
    number: 2,
    title: 'Class III — classic gas bright spot',
    geology: 'Same soft-shale-over-unconsolidated-sand system as the baseline, but now the upper 55% of the reservoir is gas-charged at 80% saturation. This is the canonical North-Sea-style Tertiary clastic gas accumulation.',
    settings: { ob_hard: 'soft', ub_hard: 'medium', lithology: 'unconsolidated_sand', phi: 0.28, hc_fluid: 'gas', hc_sat: 0.80, column_height: 0.55, thickness: 50 },
    predictions: {
      impedanceLog: 'Large step LEFTward at top reservoir (gas sand is much softer than shale — Vp drops from 2300 to about 1880, density from 2.20 to 2.01). Small step rightward at the dashed contact. Step rightward at base.',
      gather: 'Strong negative trough at top reservoir, getting visibly more negative (deeper trough) toward higher angles — the textbook Class III brightening. Positive peak at the contact (the flat spot). Weak positive peak at base.',
      avoCurves: 'TR curve starts deep below zero (A ≈ −0.15) and dives further with angle (B ≈ −0.28). FC and BR curves are positive.',
      crossplot: 'TR firmly in the Class III region (lower-left). FC sits in the upper-right (both A and B positive — characteristic flat spot). BR mildly positive A, negative B (Class I-like).',
    },
    observation: 'All three textbook direct hydrocarbon indicators in one section: bright spot at TR, AVO brightening of that bright spot with offset, and a flat-spot reflection at the contact. This is the configuration that built much of the offshore exploration industry in the 1970s–80s.',
  },
  {
    id: 'fizz_water',
    number: 3,
    title: 'Fizz water — the saturation ambiguity',
    geology: 'Identical reservoir and geometry to the bright-spot case, but with gas saturation reduced from 80% to 10% in the HC zone. Geologically this is residual gas in a paleo-trap, or a small recent charge that has not displaced most of the brine.',
    settings: { ob_hard: 'soft', ub_hard: 'medium', lithology: 'unconsolidated_sand', phi: 0.28, hc_fluid: 'gas', hc_sat: 0.10, column_height: 0.55, thickness: 50 },
    predictions: {
      impedanceLog: 'Step leftward at top reservoir is nearly as large as the 80%-gas case (gas zone AI ≈ 4.18 vs 3.78 with 80% gas, vs 5.48 brine).',
      gather: 'Visually almost indistinguishable from scenario 2 at normal display scales.',
      avoCurves: 'TR is still Class III (A ≈ −0.10, B ≈ −0.26) — slightly less extreme than the 80%-gas case but still firmly in the brightening regime.',
      crossplot: 'TR has moved only slightly toward the origin compared to scenario 2.',
    },
    observation: 'This is Gassmann\'s curse made visible: 10% gas mimics 80% gas. The Reuss harmonic average is dominated by the most compressible component — once any gas enters the pore space, the fluid bulk modulus collapses from 2.5 GPa to a few hundred MPa, and adding more gas barely changes things further. AVO detects gas presence with high sensitivity, but cannot reliably tell you how much.',
  },
  {
    id: 'class_I_hard',
    number: 4,
    title: 'Class I — hard reservoir below soft shale',
    geology: 'Medium-stiffness shale overburden above a deeper, consolidated, lower-porosity gas-charged sand, with very-hard underburden below (e.g., cemented sand or carbonate). Typical of deeper or more cemented sandstone reservoirs.',
    settings: { ob_hard: 'medium', ub_hard: 'very_hard', lithology: 'consolidated_sand', phi: 0.15, hc_fluid: 'gas', hc_sat: 0.80, column_height: 0.55, thickness: 50 },
    predictions: {
      impedanceLog: 'Large step rightward at top (consolidated gas sand is still harder than shale because the cemented frame dominates). Small step rightward at the dashed contact (gas → brine). Step rightward at base into hard UB.',
      gather: 'Positive peak at top reservoir, visibly dimming with offset — the defining behaviour of Class I. The 0° trace shows a strong positive wavelet that fades by 30–40°, even crossing zero at far angles. Flat spot is a small positive event. Base reservoir a small positive event.',
      avoCurves: 'TR curve starts positive (A ≈ +0.14) and decreases steeply with angle (B ≈ −0.63). It crosses zero around 30° and goes negative — far-stack polarity reversal.',
      crossplot: 'TR sits firmly in the Class I region (upper-left, positive A and strongly negative B).',
    },
    observation: 'Hard reservoirs do not bright-spot. Their AVO signature lives in the change of amplitude with offset, not in the absolute amplitude. Far-offset stacks may show actual polarity reversal at the top reservoir, which is itself a strong DHI.',
  },
  {
    id: 'class_II_balanced',
    number: 5,
    title: 'Class II — near-zero impedance contrast',
    geology: 'Medium-hardness shale above a moderate-porosity gas-charged consolidated sand where the impedance happens to be nearly identical at zero offset. Hydrocarbon is present but invisible on a near-offset stack — only AVO can find it.',
    settings: { ob_hard: 'medium', ub_hard: 'medium', lithology: 'consolidated_sand', phi: 0.25, hc_fluid: 'gas', hc_sat: 0.80, column_height: 0.55, thickness: 50 },
    predictions: {
      impedanceLog: 'TR step is barely visible (gas-sand AI ≈ 6.12 vs OB AI = 6.21 — only a 1.5% contrast). FC and BR steps are visible.',
      gather: 'Top reservoir wavelet has near-zero amplitude on the 0° trace, then grows negatively with offset. Watching the trace amplitudes across angle is the only way to see it.',
      avoCurves: 'TR curve starts near zero (A ≈ −0.01) and slopes strongly negative (B ≈ −0.36). The gradient does all the work.',
      crossplot: 'TR sits very near the vertical A=0 axis, in the lower half. This is the Class II region.',
    },
    observation: 'On a near-offset stack this reservoir is essentially invisible. It reveals itself only on far-offset or angle-stack data. Real exploration in many basins relies on this AVO-only signature — Class II discoveries cannot be made by amplitude interpretation alone.',
  },
  {
    id: 'class_IV',
    number: 6,
    title: 'Class IV — anomalous gradient',
    geology: 'Hard caprock (compacted shale, hard mudstone, or tight silt) over a soft gas-charged unconsolidated sand. The conventional gas-sand bright-spot intuition breaks down here because the Vs contrast across the interface is large.',
    settings: { ob_hard: 'hard', ub_hard: 'medium', lithology: 'unconsolidated_sand', phi: 0.20, hc_fluid: 'gas', hc_sat: 0.80, column_height: 0.55, thickness: 50 },
    predictions: {
      impedanceLog: 'Very large step LEFTward at top (huge impedance drop from AI 8.09 to AI 4.63). Step rightward at the dashed contact. Step rightward at base.',
      gather: 'Strong negative trough at top, but watch with offset: the amplitude *decreases* in magnitude — opposite to Class III. The wavelet on the 0° trace is the deepest; by 40° it has shallowed appreciably.',
      avoCurves: 'TR curve starts strongly negative (A ≈ −0.28) and slopes UPWARD (B ≈ +0.24, positive). The negative reflectivity moves toward zero with angle.',
      crossplot: 'TR in the Class IV region — strongly negative A, but positive B. Lower-right of A=0 axis, above B=0.',
    },
    observation: 'A bright spot that dims with offset would, on conventional logic, suggest a wet sand or interpretation error. But here it is real gas. Class IV occurs when the caprock has a higher Vp/Vs ratio than the reservoir — the second Shuey term flips sign because ΔVs is strongly negative. Blind use of AVO classification can fail in unconventional reservoirs.',
  },
  {
    id: 'depleted_reservoir',
    number: 7,
    title: 'Depleted reservoir — 4D-style time-lapse',
    geology: 'Same bright-spot reservoir as scenario 2, but after years of production: the gas cap has shrunk to 15% of reservoir thickness as the gas has been swept out or the oil-water contact has risen.',
    settings: { ob_hard: 'soft', ub_hard: 'medium', lithology: 'unconsolidated_sand', phi: 0.28, hc_fluid: 'gas', hc_sat: 0.80, column_height: 0.15, thickness: 50 },
    predictions: {
      impedanceLog: 'The dashed contact line has risen close to the top of the reservoir — only a thin gas band remains at the top. Most of the reservoir interval is brine-tinted now.',
      gather: 'The flat-spot wavelet now sits very close to the top-reservoir wavelet — they partly interfere. Base reservoir wavelet is unchanged from baseline.',
      avoCurves: 'Identical to scenario 2 — the AVO at each interface depends only on the contrast at that interface, not on the column geometry.',
      crossplot: 'TR, FC and BR dots are in identical positions to scenario 2. The differences are purely geometric.',
    },
    observation: 'Compare this side by side with scenario 2 — this is what 4D (time-lapse) seismic looks for. The flat-spot rises in time, and the interference between TR and FC wavelets changes the apparent character of the top reservoir even though no per-interface AVO has changed. Real 4D analysis subtracts the baseline (scenario 2) from the monitor (scenario 7) to isolate production-induced changes.',
  },
  {
    id: 'carbonate',
    number: 8,
    title: 'Carbonate reservoir — small fluid effects',
    geology: 'Medium-hardness overburden, calcite carbonate reservoir at 10% porosity, medium underburden. Same geometry as the gas scenarios, but the rock matrix is fundamentally stiffer.',
    settings: { ob_hard: 'medium', ub_hard: 'medium', lithology: 'carbonate', phi: 0.10, hc_fluid: 'gas', hc_sat: 0.80, column_height: 0.55, thickness: 50 },
    predictions: {
      impedanceLog: 'Very large step rightward at top (carbonate AI ≈ 12.2 vs shale AI = 6.2 — almost double). FC step is tiny — barely visible on the line. Very large step leftward at base into the soft UB.',
      gather: 'Strong positive peak at top, dimming with offset (Class I). FC wavelet is small. Strong negative trough at base (Class IV — soft UB below hard carbonate).',
      avoCurves: 'TR strongly positive A, strongly negative B. FC curve nearly flat near zero. BR is mirror-image of TR — strongly negative A with positive B.',
      crossplot: 'TR far into Class I, BR far into Class IV, FC near the origin.',
    },
    observation: 'Carbonates are stiff-framed: K_dry is already close to K_mineral, so Gassmann fluid substitution moves K_sat only slightly. The flat-spot reflection in a carbonate gas reservoir is therefore typically tiny — DHI workflows tuned for clastics generally fail in carbonate provinces. The dominant reflections are lithology contrasts at top and base.',
  },
  {
    id: 'oil_versus_gas',
    number: 9,
    title: 'Oil leg instead of gas',
    geology: 'Identical geometry to the bright-spot scenario, but the hydrocarbon is oil at 80% saturation instead of gas.',
    settings: { ob_hard: 'soft', ub_hard: 'medium', lithology: 'unconsolidated_sand', phi: 0.28, hc_fluid: 'oil', hc_sat: 0.80, column_height: 0.55, thickness: 50 },
    predictions: {
      impedanceLog: 'Step at top reservoir is small (oil-sand AI ≈ 4.69 vs OB AI = 5.06 — only a mild leftward step). FC step is also small (oil-sand AI 4.69 → brine-sand AI 5.48).',
      gather: 'TR wavelet much weaker than the gas case. FC wavelet noticeably weaker. BR similar to gas case.',
      avoCurves: 'TR is now in the Class II region (small negative A ≈ −0.04, moderate negative B ≈ −0.18) rather than Class III. The reflection grows mildly more negative with offset but never approaches the magnitude of the gas case.',
      crossplot: 'TR has moved up and toward the origin from its gas-case position — it now sits near the A = 0 line in the lower-half.',
    },
    observation: 'Oil resembles brine acoustically far more than gas does — its bulk modulus is about 40% of brine\'s, versus less than 2% for gas. AVO discriminates gas from brine well; oil from brine, much less reliably. Many real oil discoveries lack a strong AVO signature and require alternative DHI methods (such as resistivity anomalies on EM).',
  },
  {
    id: 'thin_bed_tuning',
    number: 10,
    title: 'Tuning thickness — thin bed effects',
    geology: 'Bright-spot gas reservoir as scenario 2, but with thickness reduced from 50 m to 18 m — just below the default tuning thickness for a 30 Hz wavelet (≈20 m given Vp ≈ 2400 m/s in the gas zone).',
    settings: { ob_hard: 'soft', ub_hard: 'medium', lithology: 'unconsolidated_sand', phi: 0.28, hc_fluid: 'gas', hc_sat: 0.80, column_height: 0.55, thickness: 18 },
    predictions: {
      impedanceLog: 'Reservoir interval is visually compressed — top, dashed contact, and base are all close together in time.',
      gather: 'The three wavelets overlap and interfere. Top-reservoir trough and base-reservoir peak begin to constructively-and-destructively combine. Apparent amplitudes can be enhanced or suppressed by the interference, not by AVO behaviour.',
      avoCurves: 'Identical to scenario 2 — these are interface properties and have no thickness dependence.',
      crossplot: 'Identical to scenario 2 for the same reason.',
    },
    observation: 'Sweep thickness from 80 m down to 15 m and watch the gather change character even though the AVO crossplot does not move. This is the tuning effect — a separate physics phenomenon from AVO. Below tuning thickness, amplitude maps may actually be measuring bed thickness, not fluid content. Many false bright-spot anomalies on real data turn out to be tuning effects in thin clean sands.',
  },
  {
    id: 'class_IIp_dim',
    number: 11,
    title: 'Class IIp — dim-spot via polarity reversal',
    geology: 'Medium-stiffness shale over a moderate-porosity gas-charged consolidated sand. The reservoir is gas-bearing but its impedance is just slightly above the overburden at zero offset, so the AVO behaviour flips polarity within the gather.',
    settings: { ob_hard: 'medium', ub_hard: 'medium', lithology: 'consolidated_sand', phi: 0.22, hc_fluid: 'gas', hc_sat: 0.80, column_height: 0.55, thickness: 50 },
    predictions: {
      impedanceLog: 'Small step rightward at top (gas sand AI ≈ 6.70 vs shale 6.21). Small step right at the dashed contact. Step leftward at base (medium UB is softer than the consolidated brine leg).',
      gather: 'Small positive peak at TR on the 0° trace that fades to nothing by about 15°, then becomes a negative trough that grows with angle — the polarity reverses across the gather. FC is a faint positive. BR is a moderate negative trough that intensifies with offset (Class IV at base).',
      avoCurves: 'TR starts just above zero (A ≈ +0.04) and slopes strongly negative (B ≈ −0.44), crossing zero around 15°. This is the polarity-reversal signature that defines Class IIp.',
      crossplot: 'TR sits just inside the lower-right quadrant near the A-axis — the Class IIp region (small positive A with negative B sufficient to flip sign at far angles).',
    },
    observation: 'On a stacked section averaging across the full angle range, the small positive near offset and the negative far offset largely cancel — the reservoir produces a dim spot exactly where the hydrocarbon is. The TR reflection nearly disappears on the stack while surrounding background events stay normal. Counter-intuitively, here it is the absence of amplitude rather than a bright spot that flags the prospect. Far-offset stacks or AVO gradient products are required to detect this signature.',
  },
];

const DHI_LAUNCHERS = [
  {
    id: 'dhi-bright-spot',
    name: 'Bright spot',
    actions: [
      { label: 'Try', scenarioId: 'class_III_gas' },
      { label: 'Compare brine', scenarioId: 'background_brine', secondary: true },
    ],
  },
  {
    id: 'dhi-flat-spot',
    name: 'Flat spot',
    actions: [
      { label: 'Try sand', scenarioId: 'class_III_gas' },
      { label: 'Try carbonate', scenarioId: 'carbonate', secondary: true },
    ],
  },
  {
    id: 'dhi-polarity-reversal',
    name: 'Polarity reversal',
    actions: [
      { label: 'Try IIp', scenarioId: 'class_IIp_dim' },
      { label: 'Try Class I', scenarioId: 'class_I_hard', secondary: true },
    ],
  },
  {
    id: 'dhi-dim-spot',
    name: 'Dim spot',
    actions: [
      { label: 'Try IIp', scenarioId: 'class_IIp_dim' },
      { label: 'Try II', scenarioId: 'class_II_balanced', secondary: true },
    ],
  },
  {
    id: 'dhi-class-iv',
    name: 'Anomalous gradient',
    actions: [
      { label: 'Try', scenarioId: 'class_IV' },
    ],
  },
];

const findScenario = id => SCENARIOS.find(s => s.id === id);

/* ════════════════════════════════════════════════════════════════════
   AI vs DEPTH DIAGRAM — schematic compaction trends with class regions
   ════════════════════════════════════════════════════════════════════ */

function AIDepthDiagram() {
  const w = 540, h = 420;
  const margin = { top: 28, right: 110, bottom: 44, left: 56 };
  const W = w - margin.left - margin.right;
  const H = h - margin.top - margin.bottom;

  const ai_min = 2, ai_max = 16;
  const z_min = 0, z_max = 4500;
  const xAI = ai => margin.left + (ai - ai_min) / (ai_max - ai_min) * W;
  const yZ  = z  => margin.top  + (z  - z_min)  / (z_max  - z_min)  * H;

  // Build a compaction curve. ai(z) = ai_surf + (ai_deep - ai_surf) * (1 - exp(-k z))
  const npts = 50;
  function curvePath(ai_surf, ai_deep, k = 0.55) {
    const pts = [];
    for (let i = 0; i <= npts; i++) {
      const z = z_min + (i / npts) * (z_max - z_min);
      const ai = ai_surf + (ai_deep - ai_surf) * (1 - Math.exp(-k * z / 1000));
      pts.push([xAI(ai), yZ(z)]);
    }
    return pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  }

  const curves = [
    { name: 'Shale',      color: '#57534e', dash: '',    ai_surf: 4.0, ai_deep: 9.0, label_z: 3000 },
    { name: 'Brine sand', color: '#0369a1', dash: '',    ai_surf: 5.0, ai_deep: 11.0, label_z: 2200 },
    { name: 'Oil sand',   color: '#047857', dash: '',    ai_surf: 4.5, ai_deep: 10.0, label_z: 2600 },
    { name: 'Gas sand',   color: '#b91c1c', dash: '4 3', ai_surf: 3.0, ai_deep: 7.0,  label_z: 1600 },
    { name: 'Carbonate',  color: '#b45309', dash: '',    ai_surf: 9.0, ai_deep: 14.0, label_z: 1800 },
  ];

  const aiTicks = [2, 4, 6, 8, 10, 12, 14, 16];
  const zTicks  = [0, 1000, 2000, 3000, 4000];

  // Compute crossover depth between gas sand and shale (approximate, from the analytic curves)
  // Solve ai_gas(z) = ai_shale(z) → 3 + 4(1-e^-kz) = 4 + 5(1-e^-kz) → -1 = -(1-e^-kz) → e^-kz = 0
  // i.e. never crosses with same k. But with realistic differential k, gas sand catches up at depth.
  // For the schematic we annotate a generic Class II zone at the depth where gas sand approaches shale.

  return (
    <div className="my-4 flex justify-center">
      <svg width={w} height={h} style={{ background: '#faf9f5', border: '1px solid #e7e5e4', borderRadius: 4 }}>
        {/* Title */}
        <text x={w / 2} y={16} fontSize={11} textAnchor="middle" fill="#44403c" fontStyle="italic">
          schematic AI compaction trends · where each AVO class lives
        </text>

        {/* Axes */}
        <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + H} stroke="#78716c" strokeWidth={0.8} />
        <line x1={margin.left} y1={margin.top + H} x2={margin.left + W} y2={margin.top + H} stroke="#78716c" strokeWidth={0.8} />
        <line x1={margin.left} y1={margin.top} x2={margin.left + W} y2={margin.top} stroke="#78716c" strokeWidth={0.4} />

        {/* X-ticks */}
        {aiTicks.map(t => (
          <g key={t}>
            <line x1={xAI(t)} y1={margin.top + H} x2={xAI(t)} y2={margin.top + H + 4} stroke="#78716c" strokeWidth={0.6} />
            <text x={xAI(t)} y={margin.top + H + 14} fontSize={9} textAnchor="middle" fill="#57534e" fontFamily="ui-monospace, monospace">{t}</text>
          </g>
        ))}
        <text x={margin.left + W / 2} y={h - 8} fontSize={10} textAnchor="middle" fill="#44403c" fontStyle="italic">acoustic impedance (km/s · g/cc)</text>

        {/* Y-ticks */}
        {zTicks.map(t => (
          <g key={t}>
            <line x1={margin.left - 4} y1={yZ(t)} x2={margin.left} y2={yZ(t)} stroke="#78716c" strokeWidth={0.6} />
            <text x={margin.left - 6} y={yZ(t) + 3} fontSize={9} textAnchor="end" fill="#57534e" fontFamily="ui-monospace, monospace">{t}</text>
          </g>
        ))}
        <text x={12} y={margin.top + H / 2} fontSize={10} textAnchor="middle" fill="#44403c" fontStyle="italic"
              transform={`rotate(-90 12 ${margin.top + H / 2})`}>depth (m)</text>

        {/* Shaded Class III region — shallow, where gas sand << shale */}
        <rect x={xAI(2.5)} y={yZ(0)} width={xAI(5) - xAI(2.5)} height={yZ(1800) - yZ(0)}
              fill="#b91c1c" fillOpacity={0.06} />
        <text x={xAI(3.5)} y={yZ(800)} fontSize={9} fill="#b91c1c" fontStyle="italic" textAnchor="middle">Class III zone</text>
        <text x={xAI(3.5)} y={yZ(950)} fontSize={8} fill="#b91c1c" textAnchor="middle">(soft gas sand</text>
        <text x={xAI(3.5)} y={yZ(1080)} fontSize={8} fill="#b91c1c" textAnchor="middle">vs normal shale)</text>

        {/* Shaded Class I region — deep, high-AI consolidated reservoirs */}
        <rect x={xAI(9)} y={yZ(2800)} width={xAI(13) - xAI(9)} height={yZ(4500) - yZ(2800)}
              fill="#a16207" fillOpacity={0.06} />
        <text x={xAI(11)} y={yZ(3500)} fontSize={9} fill="#a16207" fontStyle="italic" textAnchor="middle">Class I zone</text>
        <text x={xAI(11)} y={yZ(3650)} fontSize={8} fill="#a16207" textAnchor="middle">(consolidated sand</text>
        <text x={xAI(11)} y={yZ(3780)} fontSize={8} fill="#a16207" textAnchor="middle">harder than shale)</text>

        {/* Class II/IIp transition band */}
        <rect x={xAI(5.5)} y={yZ(1800)} width={xAI(9) - xAI(5.5)} height={yZ(2800) - yZ(1800)}
              fill="#9a3412" fillOpacity={0.05} />
        <text x={xAI(7.25)} y={yZ(2200)} fontSize={9} fill="#9a3412" fontStyle="italic" textAnchor="middle">Class II / IIp band</text>
        <text x={xAI(7.25)} y={yZ(2340)} fontSize={8} fill="#9a3412" textAnchor="middle">(gas sand ≈ shale)</text>

        {/* Compaction curves */}
        {curves.map(c => (
          <g key={c.name}>
            <path d={curvePath(c.ai_surf, c.ai_deep)} stroke={c.color} strokeWidth={1.8} fill="none" strokeDasharray={c.dash} />
            {/* in-line curve label */}
            <text
              x={xAI(c.ai_surf + (c.ai_deep - c.ai_surf) * (1 - Math.exp(-0.55 * c.label_z / 1000))) + 6}
              y={yZ(c.label_z) + 3}
              fontSize={10} fill={c.color} fontWeight="600">{c.name}</text>
          </g>
        ))}

        {/* Legend (right side) */}
        <g transform={`translate(${margin.left + W + 10}, ${margin.top + 6})`}>
          <text x={0} y={0} fontSize={10} fill="#44403c" fontWeight="600">trends</text>
          {curves.map((c, i) => (
            <g key={c.name} transform={`translate(0, ${14 + i * 16})`}>
              <line x1={0} y1={0} x2={20} y2={0} stroke={c.color} strokeWidth={1.8} strokeDasharray={c.dash} />
              <text x={24} y={3} fontSize={9} fill="#44403c">{c.name}</text>
            </g>
          ))}
          <text x={0} y={14 + curves.length * 16 + 12} fontSize={9} fill="#78716c" fontStyle="italic">shaded regions:</text>
          <text x={0} y={14 + curves.length * 16 + 24} fontSize={9} fill="#78716c" fontStyle="italic">likely AVO class</text>
          <text x={0} y={14 + curves.length * 16 + 36} fontSize={9} fill="#78716c" fontStyle="italic">for top-reservoir</text>
        </g>
      </svg>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   GUIDE COMPONENTS — Tabs, Eq helper, ScenarioCard, GuideView
   ════════════════════════════════════════════════════════════════════ */

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

const Eq = ({ children }) => (
  <div className="my-2 px-3 py-2 bg-stone-50 border-l-2 border-stone-400 font-mono text-[13px] tracking-tight overflow-x-auto">
    {children}
  </div>
);

function ScenarioCard({ scenario, onApply }) {
  return (
    <section id={`scenario-${scenario.id}`} className="border border-stone-200 rounded p-5 bg-stone-50/40 scroll-mt-6">
      <div className="flex items-baseline justify-between gap-3 mb-3 pb-2 border-b border-stone-200">
        <h3 className="font-serif text-lg text-stone-900 leading-tight">
          <span className="text-stone-400 mr-2 font-mono text-sm tabular-nums">#{scenario.number}</span>
          {scenario.title}
        </h3>
        <button
          onClick={() => onApply(scenario.settings)}
          className="text-[12px] px-3 py-1.5 bg-stone-900 text-white rounded hover:bg-stone-700 font-medium whitespace-nowrap"
        >
          Try in Atlas →
        </button>
      </div>

      <div className="text-[13px] text-stone-800 leading-relaxed space-y-3">
        <p className="font-serif">
          <span className="font-serif italic text-stone-500 text-[12px] mr-1">Setting ·</span>
          {scenario.geology}
        </p>

        <div>
          <div className="font-serif italic text-stone-500 text-[12px] mb-1.5">What to observe in each chart</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[12px]">
            <div className="bg-white rounded border border-stone-200 px-2.5 py-2">
              <div className="font-medium text-stone-900 mb-0.5">Impedance log</div>
              <div className="text-stone-700">{scenario.predictions.impedanceLog}</div>
            </div>
            <div className="bg-white rounded border border-stone-200 px-2.5 py-2">
              <div className="font-medium text-stone-900 mb-0.5">Synthetic gather</div>
              <div className="text-stone-700">{scenario.predictions.gather}</div>
            </div>
            <div className="bg-white rounded border border-stone-200 px-2.5 py-2">
              <div className="font-medium text-stone-900 mb-0.5">R(θ) curves</div>
              <div className="text-stone-700">{scenario.predictions.avoCurves}</div>
            </div>
            <div className="bg-white rounded border border-stone-200 px-2.5 py-2">
              <div className="font-medium text-stone-900 mb-0.5">A–B crossplot</div>
              <div className="text-stone-700">{scenario.predictions.crossplot}</div>
            </div>
          </div>
        </div>

        <div className="border-l-2 border-amber-400 pl-3 py-1.5 italic text-stone-700 bg-amber-50/40">
          <span className="font-sans text-[11px] not-italic uppercase tracking-wider text-stone-500 mr-1">Learning point ·</span>
          {scenario.observation}
        </div>
      </div>
    </section>
  );
}

function CompactScenarioLaunchers({ onApplyScenario, onOpenGuideSection }) {
  const buttonClass = action => action.secondary
    ? 'text-[11px] px-2.5 py-1 bg-stone-100 text-stone-700 rounded hover:bg-stone-200 font-medium whitespace-nowrap'
    : 'text-[11px] px-2.5 py-1 bg-stone-900 text-white rounded hover:bg-stone-700 font-medium whitespace-nowrap';

  return (
    <section className="bg-white border border-stone-200 rounded p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3 pb-2 border-b border-stone-100">
        <h2 className="font-serif text-base text-stone-900">Scenario launchers</h2>
        <button
          type="button"
          onClick={() => onOpenGuideSection('guide-dhi')}
          className="text-[11px] text-stone-500 underline underline-offset-2 hover:text-stone-900"
        >
          open guide
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(17rem,0.65fr)_minmax(0,1.35fr)] gap-4">
        <div>
          <h3 className="text-[11px] uppercase tracking-wider text-stone-500 mb-2">Direct hydrocarbon indicators</h3>
          <div className="space-y-1.5">
            {DHI_LAUNCHERS.map(dhi => (
              <div key={dhi.id} className="flex items-center justify-between gap-2 border-b border-stone-100 last:border-0 pb-1.5 last:pb-0">
                <a
                  href={`#${dhi.id}`}
                  onClick={e => {
                    e.preventDefault();
                    onOpenGuideSection(dhi.id);
                  }}
                  className="text-left text-[12px] font-medium text-stone-800 underline underline-offset-2 hover:text-stone-950"
                >
                  {dhi.name}
                </a>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {dhi.actions.map(action => {
                    const scenario = findScenario(action.scenarioId);
                    return (
                      <button
                        key={`${dhi.id}-${action.scenarioId}-${action.label}`}
                        type="button"
                        onClick={() => scenario && onApplyScenario(scenario.settings)}
                        className={buttonClass(action)}
                      >
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[11px] uppercase tracking-wider text-stone-500 mb-2">Worked scenarios</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-x-3 gap-y-1.5">
            {SCENARIOS.map(scenario => (
              <div key={scenario.id} className="flex items-center justify-between gap-2 border-b border-stone-100 pb-1.5">
                <a
                  href={`#scenario-${scenario.id}`}
                  onClick={e => {
                    e.preventDefault();
                    onOpenGuideSection(`scenario-${scenario.id}`);
                  }}
                  className="min-w-0 truncate text-left text-[12px] text-stone-800 underline underline-offset-2 hover:text-stone-950"
                  title={scenario.title}
                >
                  <span className="text-stone-400 font-mono tabular-nums mr-1">#{scenario.number}</span>
                  {scenario.title}
                </a>
                <button
                  type="button"
                  onClick={() => onApplyScenario(scenario.settings)}
                  className="text-[11px] px-2.5 py-1 bg-stone-900 text-white rounded hover:bg-stone-700 font-medium whitespace-nowrap"
                >
                  Try
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function GuideView({ onApplyScenario }) {
  return (
    <div className="max-w-4xl mx-auto">

      {/* === Theory section === */}
      <section className="bg-white border border-stone-200 rounded p-6 mb-4">
        <h2 className="font-serif text-2xl text-stone-900 mb-1">The theory the atlas computes</h2>
        <p className="text-[12px] italic text-stone-500 mb-4">A condensed account of what is happening behind each panel — read this once, then use the scenarios to internalise it.</p>

        <div className="font-serif text-[14px] text-stone-800 leading-relaxed space-y-4">
          <p>The atlas is a forward model. You specify a geological configuration — three rock layers, a reservoir lithology and porosity, a fluid fill and a column geometry — and it predicts what the seismic gather should look like. Three pieces of physics chain together: a rock-physics step that turns reservoir properties into elastic moduli, an interface-reflection step that turns those moduli into angle-dependent reflection coefficients, and a wavelet-convolution step that turns those coefficients into a seismic trace.</p>

          <h3 className="font-serif text-lg text-stone-900 mt-5">1. Rock physics — what is the elastic state of the reservoir?</h3>
          <p>A reservoir rock is a porous skeleton partly filled with fluid. The seismic velocities and density we measure are properties of the <em>saturated</em> rock, but the right way to think about it is as the dry frame plus the pore fluid. Gassmann's equation does this bookkeeping:</p>

          <Eq>K<sub>sat</sub> = K<sub>dry</sub> + (1 − K<sub>dry</sub>/K<sub>min</sub>)² / [φ/K<sub>fl</sub> + (1−φ)/K<sub>min</sub> − K<sub>dry</sub>/K<sub>min</sub>²]</Eq>

          <p>The shear modulus is unchanged by fluid (μ<sub>sat</sub> = μ<sub>dry</sub>), because fluids cannot support shear. The saturated density follows from mass conservation: ρ<sub>sat</sub> = (1 − φ) ρ<sub>grain</sub> + φ ρ<sub>fluid</sub>. The atlas applies Gassmann <em>twice</em> for every hydrocarbon-bearing scenario — once with the HC-brine fluid mixture and once with pure brine — to get distinct properties for the HC zone above the contact and the brine leg below it. This is what gives the flat-spot reflection a non-zero amplitude.</p>

          <p>When the HC zone contains both hydrocarbon and irreducible brine, the effective fluid modulus follows the Reuss harmonic average:</p>

          <Eq>1/K<sub>fl,mix</sub> = S<sub>hc</sub>/K<sub>hc</sub> + S<sub>w</sub>/K<sub>brine</sub></Eq>

          <p>This expression is the source of one of the most important non-linearities in AVO: K<sub>fl,mix</sub> is dominated by the most compressible component. Even a small fraction of gas crashes K<sub>fl</sub> from 2.5 GPa (pure brine) to a few hundred MPa, after which adding more gas barely moves it. This is the fizz-water problem.</p>

          <h3 className="font-serif text-lg text-stone-900 mt-5">2. The reflection coefficient — Shuey's three terms</h3>

          <p>Where two rock layers meet, an incident P-wave produces a reflected P-wave whose amplitude (the reflection coefficient R) depends on the angle of incidence θ. The full relation is given by the Zoeppritz equations; in our regime (moderate contrasts, angles up to about 40°) Shuey's three-term linearisation is far more useful:</p>

          <Eq>R(θ) = A + B sin²θ + C (tan²θ − sin²θ)</Eq>

          <p>Each coefficient has a clear physical meaning:</p>

          <ul className="list-disc ml-5 space-y-1.5">
            <li><strong>A — the intercept.</strong> Half the relative acoustic-impedance contrast: A = ½ (ΔV<sub>p</sub>/V<sub>p</sub> + Δρ/ρ). This is the zero-offset reflectivity.</li>
            <li><strong>B — the gradient.</strong> Contains the V<sub>s</sub>/V<sub>p</sub> ratio and is therefore sensitive to Poisson-ratio changes, which is what fluids modify most strongly. This is where the AVO information lives.</li>
            <li><strong>C — the curvature.</strong> Becomes significant past about 30°; gives the far-offset character.</li>
          </ul>

          <p>The intercept and gradient locate each interface on the A–B crossplot. The classification partitions interfaces into five AVO classes, each carrying a distinct geological story. The descriptions below are for the <em>top reservoir</em> interface (overburden over reservoir); the same taxonomy applies to other interfaces but the geological setting differs.</p>

          <div className="space-y-3 my-4">

            {/* Class I */}
            <div className="border-l-[3px] pl-3 py-1" style={{ borderColor: '#a16207' }}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-white px-2 py-0.5 rounded text-[11px] font-serif" style={{ backgroundColor: '#a16207' }}>Class I</span>
                <span className="font-mono text-[11px] text-stone-500">A &gt; 0.04, B &lt; 0</span>
              </div>
              <p className="text-[13px] text-stone-700 leading-relaxed mt-1">
                <strong>Signature.</strong> Positive intercept — a hard kick at zero offset. Strong negative gradient causes amplitude to decrease with offset; the reflection may polarity-reverse at far angles. Strong amplitude near, weaker amplitude far.
              </p>
              <p className="text-[13px] text-stone-700 leading-relaxed mt-1">
                <strong>In sands.</strong> Typical for deeper, well-cemented gas-bearing sands. The consolidated frame keeps reservoir AI above the overburden shale even when gas-charged. The diagnostic "hard kick getting softer with offset" distinguishes a Class I gas sand from a generic hard wedge (such as a hard shale) which would stay hard at all offsets.
              </p>
              <p className="text-[13px] text-stone-700 leading-relaxed mt-1">
                <strong>In carbonates.</strong> Most carbonate reservoirs fall here regardless of fluid. The stiff frames mean K<sub>dry</sub> is close to K<sub>min</sub>, so K<sub>sat</sub> moves only slightly with fluid substitution. The AI–vs–shale contrast is therefore always large and positive. The "Class I" label in carbonates is more a statement about rock type than about fluid — AVO gradient changes are weak and rarely useful for fluid discrimination.
              </p>
            </div>

            {/* Class II */}
            <div className="border-l-[3px] pl-3 py-1" style={{ borderColor: '#9a3412' }}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-white px-2 py-0.5 rounded text-[11px] font-serif" style={{ backgroundColor: '#9a3412' }}>Class II</span>
                <span className="font-mono text-[11px] text-stone-500">|A| ≤ 0.04, B &lt; 0</span>
              </div>
              <p className="text-[13px] text-stone-700 leading-relaxed mt-1">
                <strong>Signature.</strong> Near-zero intercept — the reservoir is acoustically nearly identical to the overburden at zero offset. The reflection is essentially invisible on a near-offset stack. With angle, the amplitude grows visibly negative as the gradient dominates: small near, soft far.
              </p>
              <p className="text-[13px] text-stone-700 leading-relaxed mt-1">
                <strong>In sands.</strong> Moderately deep gas sands where the gas-driven softening just happens to leave the reservoir AI matching the overburden shale. Common in mature basins where reservoir cementation and overburden compaction co-evolve. Discovery requires far-offset stacks or AVO gradient products — the reservoir is unfindable on standard near-offset displays.
              </p>
              <p className="text-[13px] text-stone-700 leading-relaxed mt-1">
                <strong>In carbonates.</strong> Very rare. Could occur in highly porous chalks where the frame softening drops AI down toward shale values, but most carbonate reservoirs remain clearly Class I.
              </p>
            </div>

            {/* Class IIp */}
            <div className="border-l-[3px] pl-3 py-1" style={{ borderColor: '#7e22ce' }}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-white px-2 py-0.5 rounded text-[11px] font-serif" style={{ backgroundColor: '#7e22ce' }}>Class IIp</span>
                <span className="font-mono text-[11px] text-stone-500">0 &lt; A ≤ 0.04, B strongly negative</span>
              </div>
              <p className="text-[13px] text-stone-700 leading-relaxed mt-1">
                <strong>Signature.</strong> Small positive intercept (slightly harder than overburden) with strongly negative gradient. The reflection is a small positive peak at zero offset, crosses zero somewhere in the gather, and becomes a negative trough at far offsets — true polarity reversal.
              </p>
              <p className="text-[13px] text-stone-700 leading-relaxed mt-1">
                <strong>In sands.</strong> A gas sand just slightly harder than the overburden — the gas has reduced AI relative to the brine case but not enough to fall below shale. The defining feature is the polarity flip with angle. On a full stack, the positive near and negative far cancel out, producing an apparent <em>dim spot</em> exactly where the hydrocarbon sits — a counter-intuitive DHI where you look for absence rather than brightness.
              </p>
              <p className="text-[13px] text-stone-700 leading-relaxed mt-1">
                <strong>In carbonates.</strong> Very rare. Could appear in tight carbonates where a small fluid effect creates a small positive AI contrast with the cap rock and a non-trivial V<sub>s</sub>/V<sub>p</sub> change. Practically uncommon.
              </p>
            </div>

            {/* Class III */}
            <div className="border-l-[3px] pl-3 py-1" style={{ borderColor: '#b91c1c' }}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-white px-2 py-0.5 rounded text-[11px] font-serif" style={{ backgroundColor: '#b91c1c' }}>Class III</span>
                <span className="font-mono text-[11px] text-stone-500">A &lt; −0.04, B &lt; 0</span>
              </div>
              <p className="text-[13px] text-stone-700 leading-relaxed mt-1">
                <strong>Signature.</strong> Negative intercept — soft kick at zero offset. Negative gradient drives the reflection more negative with angle. Bright in the near and even brighter in the far — the textbook bright-spot AVO signature.
              </p>
              <p className="text-[13px] text-stone-700 leading-relaxed mt-1">
                <strong>In sands.</strong> The classical bright spot of soft, shallow, gas-charged sands — sands that are softer than the overburden and get even softer with angle. The signature exploration target in Tertiary clastic basins (Gulf of Mexico, North Sea, West Africa, offshore Asia). The combination of low intercept and steep negative gradient is what built much of the offshore exploration industry from the 1970s onwards.
              </p>
              <p className="text-[13px] text-stone-700 leading-relaxed mt-1">
                <strong>In carbonates.</strong> Essentially does not occur as a hydrocarbon indicator. Would require the cap rock to be substantially harder than the carbonate — geologically unusual outside specific settings (evaporite-sealed dolomites, basalt-sealed limestones). If you see Class III in a carbonate setting, the cap rock — not the reservoir — is doing the work.
              </p>
            </div>

            {/* Class IV */}
            <div className="border-l-[3px] pl-3 py-1" style={{ borderColor: '#1d4ed8' }}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-white px-2 py-0.5 rounded text-[11px] font-serif" style={{ backgroundColor: '#1d4ed8' }}>Class IV</span>
                <span className="font-mono text-[11px] text-stone-500">A &lt; −0.02, B &gt; 0</span>
              </div>
              <p className="text-[13px] text-stone-700 leading-relaxed mt-1">
                <strong>Signature.</strong> Negative intercept like Class III, but the gradient flips sign: amplitude <em>decreases</em> in magnitude with offset rather than increasing. Strong soft loop that gets weaker in the far — the opposite of the classical bright-spot AVO.
              </p>
              <p className="text-[13px] text-stone-700 leading-relaxed mt-1">
                <strong>In sands.</strong> The rare case where the overburden has a higher V<sub>p</sub>/V<sub>s</sub> ratio than the reservoir. This happens when the cap rock is a very hard shale or a carbon-rich shale (organic-rich source rocks have anomalously low V<sub>s</sub> due to the elastic kerogen). The interpretation pitfall is that a Class IV bright spot looks "wrong" on conventional AVO logic — it dims with offset, which would conventionally suggest a wet sand — but the rock is in fact gas-charged.
              </p>
              <p className="text-[13px] text-stone-700 leading-relaxed mt-1">
                <strong>In carbonates.</strong> Practically rare. Could occur with very soft chalks or porous carbonates below evaporite or basalt caps. Encountered in unconventional source-rock plays where a tight carbonate source rock sits below an even tighter shale or carbonate cap.
              </p>
            </div>

          </div>

          <p className="italic text-stone-600 text-[13px]">The class boundaries are heuristic. The classification is a useful taxonomy, not a hard partition — an interface sitting at A = 0.04 is essentially the same physics as one at A = 0.05, but they cross a class boundary. The atlas's classifier follows the definitions above; in particular, Class IIp is detected by checking for genuine polarity reversal at θ = 30°, not just by intercept sign.</p>

          {/* AI vs depth diagram */}
          <h3 className="font-serif text-lg text-stone-900 mt-6">Where each class lives — acoustic impedance vs depth</h3>
          <p className="text-[13px] text-stone-700 leading-relaxed">
            Why does Class III dominate the shallow gas plays and Class I dominate the deeper ones? Because rocks compact with depth — and they compact at different rates depending on their frame. The schematic below shows typical acoustic-impedance compaction trends for the rock types in this atlas. Where two trends cross, the AVO class flips.
          </p>
          <AIDepthDiagram />
          <p className="text-[12px] text-stone-600 leading-relaxed mt-2 italic">
            At shallow depth, gas sands are far softer than the overburden shale — Class III territory. As both compact downward, the gas-sand trend grows but more slowly than the shale; the curves converge. Where they cross (a depth that depends strongly on the local geology, typically 2–3 km), the AVO behaviour flips to Class II / IIp / I. Below this crossover, gas sands can be harder than the overburden, and bright spots disappear as a useful DHI.
          </p>

          <h3 className="font-serif text-lg text-stone-900 mt-5">3. The synthetic gather — from reflectivity to wavelets</h3>

          <p>The gather panel shows what you would see on real seismic data. At each interface time, a zero-phase wavelet is convolved with the angle-dependent reflection coefficient R(θ). The atlas defaults to a 30 Hz Ricker wavelet, but the wavelet panel lets you switch to an Ormsby-style bandpass wavelet and test lower or higher dominant frequencies. Each column of the gather corresponds to a different incidence angle, and the systematic change in wavelet amplitude across the angle axis is the AVO signature made visible. The vertical axis is two-way time, anchored to 1.000 s at top reservoir.</p>

          <h3 className="font-serif text-lg text-stone-900 mt-5">4. Three interfaces in one reservoir</h3>

          <p>A hydrocarbon reservoir with a free water level produces up to three reflective interfaces:</p>

          <ul className="list-disc ml-5 space-y-1.5">
            <li><strong>Top reservoir (TR)</strong> — overburden against the HC-saturated upper reservoir.</li>
            <li><strong>Fluid contact (FC)</strong> — the <em>flat spot</em>: HC-saturated rock above, brine-saturated rock below, same matrix. This is the only interface whose existence and depth are themselves a direct hydrocarbon indicator. Flat spots are typically Class I-like (positive intercept, negative gradient) — but the FC scenarios in this atlas often show both A and B positive because the V<sub>s</sub> drops slightly going from gas-sand to brine-sand, which flips the second Shuey term.</li>
            <li><strong>Base reservoir (BR)</strong> — brine-saturated bottom of the reservoir against the underburden.</li>
          </ul>

          <p>If the reservoir is fully brine-saturated, no contact and no flat spot. If it is fully hydrocarbon-charged from top to bottom, no contact either, and the base reservoir is HC-on-UB rather than brine-on-UB.</p>

          <h3 className="font-serif text-lg text-stone-900 mt-5">5. What changes when you move each slider</h3>

          <ul className="list-disc ml-5 space-y-1.5">
            <li><strong>Overburden / underburden hardness</strong> — sets the contrast at top and base of the reservoir respectively. Does not affect the flat-spot reflection.</li>
            <li><strong>Reservoir lithology</strong> — sand vs carbonate is the single biggest control. Carbonates have stiff frames and tiny fluid effects.</li>
            <li><strong>Porosity</strong> — softer rock at higher porosity; magnifies fluid effects.</li>
            <li><strong>Pore fluid</strong> — gas effects are dramatic; oil milder; brine produces no anomaly relative to brine.</li>
            <li><strong>HC saturation</strong> — non-linear because of Reuss averaging. Most of the AVO change happens in the first 10–15% of gas saturation.</li>
            <li><strong>HC column height</strong> — moves the flat spot vertically inside the reservoir. The per-interface AVO does not change; only the geometry does.</li>
            <li><strong>Reservoir thickness</strong> — below tuning (~λ/4, shown live in the wavelet panel), the wavelets at TR, FC and BR start to interfere. This is separate physics from AVO and must be accounted for separately in real interpretation.</li>
          </ul>
        </div>
      </section>

      {/* === DHI catalog section === */}
      <section id="guide-dhi" className="bg-white border border-stone-200 rounded p-6 mb-4 scroll-mt-6">
        <h2 className="font-serif text-2xl text-stone-900 mb-1">Direct hydrocarbon indicators (DHIs)</h2>
        <p className="text-[12px] italic text-stone-500 mb-4">Each DHI below corresponds to one or more scenarios in the list further down. Click the <em>Try</em> button to load the relevant scenario into the live atlas.</p>

        <div className="font-serif text-[14px] text-stone-800 leading-relaxed space-y-5">

          {/* Bright spot */}
          <div id="dhi-bright-spot" className="border-l-[3px] pl-4 py-1 scroll-mt-6" style={{ borderColor: '#b91c1c' }}>
            <h3 className="font-serif text-base text-stone-900 mb-1">Bright spot</h3>
            <p className="text-[13px] text-stone-700">
              <strong>What it is.</strong> A reflection significantly stronger than the surrounding background, indicating an anomalously large impedance contrast. The classical DHI — and the one most students learn first — but also the source of the most false-positive interpretations in real exploration.
            </p>
            <p className="text-[13px] text-stone-700 mt-1">
              <strong>What causes it.</strong> A gas-charged soft sand below a normal shale overburden (Class III). The gas crashes the reservoir AI, producing a large negative contrast and a strong negative reflection. Brightens further with offset because of the Class III gradient.
            </p>
            <p className="text-[13px] text-stone-700 mt-1">
              <strong>Pitfalls.</strong> Tuning of thin clean sands, hard streaks, salt or basalt edges, igneous bodies, top-of-coal reflections, and shallow chalk crests can all produce strong reflections that mimic a gas bright spot. The AVO behaviour (brightening with offset) is what distinguishes a real Class III from a hard kick.
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button onClick={() => onApplyScenario(findScenario('class_III_gas').settings)}
                      className="text-[12px] px-3 py-1 bg-stone-900 text-white rounded hover:bg-stone-700 font-medium">
                Try the bright spot
              </button>
              <button onClick={() => onApplyScenario(findScenario('background_brine').settings)}
                      className="text-[12px] px-3 py-1 bg-stone-200 text-stone-800 rounded hover:bg-stone-300 font-medium">
                Compare with brine background
              </button>
            </div>
          </div>

          {/* Flat spot */}
          <div id="dhi-flat-spot" className="border-l-[3px] pl-4 py-1 scroll-mt-6" style={{ borderColor: '#a16207' }}>
            <h3 className="font-serif text-base text-stone-900 mb-1">Flat spot</h3>
            <p className="text-[13px] text-stone-700">
              <strong>What it is.</strong> A horizontal reflection cutting across structural dip, marking the gas-water or gas-oil contact inside the reservoir. The most direct of the DHIs because fluid contacts are flat (or nearly so) under gravity, while structural features dip — a flat reflection in a dipping reservoir cannot be a stratigraphic feature.
            </p>
            <p className="text-[13px] text-stone-700 mt-1">
              <strong>What causes it.</strong> The impedance contrast between the hydrocarbon-saturated reservoir above and the brine-saturated reservoir below. Both have the same matrix; only the pore fluid differs. The AVO character of the flat spot is typically positive intercept with mixed gradient — frequently both A and B positive (so it sits in the "+/+" region) because the V<sub>s</sub> changes only slightly across the contact while density rises substantially.
            </p>
            <p className="text-[13px] text-stone-700 mt-1">
              <strong>Carbonates beware.</strong> Because Gassmann fluid substitution moves stiff carbonates only slightly, the flat spot in a gas carbonate reservoir is typically <em>tiny</em> — barely detectable above noise. DHI workflows tuned for clastics fail in carbonate provinces precisely here.
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button onClick={() => onApplyScenario(findScenario('class_III_gas').settings)}
                      className="text-[12px] px-3 py-1 bg-stone-900 text-white rounded hover:bg-stone-700 font-medium">
                Try a strong flat spot (sand)
              </button>
              <button onClick={() => onApplyScenario(findScenario('carbonate').settings)}
                      className="text-[12px] px-3 py-1 bg-stone-200 text-stone-800 rounded hover:bg-stone-300 font-medium">
                Compare to weak carbonate flat spot
              </button>
            </div>
          </div>

          {/* Polarity reversal */}
          <div id="dhi-polarity-reversal" className="border-l-[3px] pl-4 py-1 scroll-mt-6" style={{ borderColor: '#7e22ce' }}>
            <h3 className="font-serif text-base text-stone-900 mb-1">Polarity reversal</h3>
            <p className="text-[13px] text-stone-700">
              <strong>What it is.</strong> A reflection whose sign changes — either across angle within a single gather, or laterally along a stacked section. The within-gather version is the AVO diagnostic of Class IIp (and sometimes Class I when the gradient is strong enough). The lateral version occurs where a stratigraphic horizon transitions from wet (positive amplitude) to gas-charged (negative amplitude) along its updip extent.
            </p>
            <p className="text-[13px] text-stone-700 mt-1">
              <strong>What causes it (within gather).</strong> Reflection coefficient R(θ) = A + B sin²θ + … crosses zero somewhere between near and far offset. The intercept and the gradient have opposite signs — a small positive A combined with a strongly negative B produces this reversal.
            </p>
            <p className="text-[13px] text-stone-700 mt-1">
              <strong>How to recognise it.</strong> The black-filled wavelet on the near-trace turns into an unfilled trough on the far-trace, or vice versa. On angle-gather displays it is one of the most visually striking DHIs.
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button onClick={() => onApplyScenario(findScenario('class_IIp_dim').settings)}
                      className="text-[12px] px-3 py-1 bg-stone-900 text-white rounded hover:bg-stone-700 font-medium">
                Try the Class IIp reversal
              </button>
              <button onClick={() => onApplyScenario(findScenario('class_I_hard').settings)}
                      className="text-[12px] px-3 py-1 bg-stone-200 text-stone-800 rounded hover:bg-stone-300 font-medium">
                Also seen in Class I far offsets
              </button>
            </div>
          </div>

          {/* Dim spot */}
          <div id="dhi-dim-spot" className="border-l-[3px] pl-4 py-1 scroll-mt-6" style={{ borderColor: '#9a3412' }}>
            <h3 className="font-serif text-base text-stone-900 mb-1">Dim spot</h3>
            <p className="text-[13px] text-stone-700">
              <strong>What it is.</strong> An anomalously <em>weak</em> reflection where geological context predicts a stronger one. The opposite signature to a bright spot — and harder to see because you are looking for an absence rather than a presence.
            </p>
            <p className="text-[13px] text-stone-700 mt-1">
              <strong>What causes it.</strong> Two mechanisms produce dim spots in hydrocarbon reservoirs. (i) Class II — the gas softens the reservoir just enough to bring AI close to the overburden, so the stacked amplitude is near zero. The reservoir hides itself on the near-offset stack. (ii) Class IIp — the positive near and negative far cancel out when stacked across the full angle range, again leaving near-zero amplitude. In both cases the hydrocarbon is genuinely there but invisible to a casual interpretation.
            </p>
            <p className="text-[13px] text-stone-700 mt-1">
              <strong>How to find them.</strong> Gradient stacks (B-stacks) and far-offset stacks reveal both forms. The Class IIp version also gives itself away on the gather as polarity reversal — the most direct signature.
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button onClick={() => onApplyScenario(findScenario('class_IIp_dim').settings)}
                      className="text-[12px] px-3 py-1 bg-stone-900 text-white rounded hover:bg-stone-700 font-medium">
                Try the Class IIp dim spot
              </button>
              <button onClick={() => onApplyScenario(findScenario('class_II_balanced').settings)}
                      className="text-[12px] px-3 py-1 bg-stone-200 text-stone-800 rounded hover:bg-stone-300 font-medium">
                Try the Class II hide
              </button>
            </div>
          </div>

          {/* Anomalous gradient — Class IV */}
          <div id="dhi-class-iv" className="border-l-[3px] pl-4 py-1 scroll-mt-6" style={{ borderColor: '#1d4ed8' }}>
            <h3 className="font-serif text-base text-stone-900 mb-1">Anomalous gradient (Class IV)</h3>
            <p className="text-[13px] text-stone-700">
              <strong>What it is.</strong> A bright soft loop on the near offset that <em>weakens</em> with offset — the opposite of the classical bright-spot AVO behaviour. Counter-intuitively, this is sometimes a real gas signature rather than a wet sand.
            </p>
            <p className="text-[13px] text-stone-700 mt-1">
              <strong>What causes it.</strong> Very hard cap rock — typically a carbon-rich shale (source rock with anomalously low V<sub>s</sub> from kerogen) or a tight compacted shale — over a soft gas-charged unconsolidated sand. The high V<sub>p</sub>/V<sub>s</sub> contrast at the interface flips the sign of the gradient term, producing dimming with offset despite gas being present.
            </p>
            <p className="text-[13px] text-stone-700 mt-1">
              <strong>Why it matters.</strong> Misinterpreting a Class IV bright spot as a wet sand is a classic exploration mistake. Conversely, drilling a Class IV anomaly as if it were Class III (expecting bigger gas effects) leads to overestimated reserves.
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button onClick={() => onApplyScenario(findScenario('class_IV').settings)}
                      className="text-[12px] px-3 py-1 bg-stone-900 text-white rounded hover:bg-stone-700 font-medium">
                Try the Class IV anomaly
              </button>
            </div>
          </div>

        </div>
      </section>



      {/* === Scenarios section === */}
      <section className="bg-white border border-stone-200 rounded p-6 mb-4">
        <h2 className="font-serif text-2xl text-stone-900 mb-1">Worked scenarios — predict, then verify</h2>
        <p className="text-[12px] italic text-stone-500 mb-4">For each scenario: read the geological setting and the predictions, form your own expectation, then click <em>Try in Atlas</em> to apply the settings to the live atlas and check whether what you see matches.</p>

        <div className="space-y-4">
          {SCENARIOS.map(s => (
            <ScenarioCard key={s.id} scenario={s} onApply={onApplyScenario} />
          ))}
        </div>
      </section>

      {/* === Exercises section === */}
      <section className="bg-white border border-stone-200 rounded p-6 mb-4">
        <h2 className="font-serif text-2xl text-stone-900 mb-1">Hands-on one-knob exercises</h2>
        <p className="text-[12px] italic text-stone-500 mb-4">After working through the scenarios, return to the atlas and try these focussed experiments. Each isolates a single physical effect by moving just one slider at a time.</p>

        <div className="font-serif text-[14px] text-stone-800 leading-relaxed space-y-3">

          <div className="border-l-2 border-stone-300 pl-4 py-1">
            <p className="font-medium text-stone-900">Sweep gas saturation from 0 to 1 in the bright-spot scenario.</p>
            <p className="text-[13px] text-stone-700 mt-0.5">Most of the change happens in the first 10–15% of saturation; the next 70% barely moves the AVO response. Watch the TR dot on the crossplot snap toward Class III almost immediately as you cross zero, then stall.</p>
          </div>

          <div className="border-l-2 border-stone-300 pl-4 py-1">
            <p className="font-medium text-stone-900">Sweep column height from 1 down to 0 with gas selected.</p>
            <p className="text-[13px] text-stone-700 mt-0.5">The flat-spot wavelet rises through the gather and eventually disappears. The top-reservoir wavelet weakens once the contact crosses it (column = 0, brine-on-shale). Above column ≈ 0.95, the FC and TR wavelets are close enough to interfere.</p>
          </div>

          <div className="border-l-2 border-stone-300 pl-4 py-1">
            <p className="font-medium text-stone-900">Flip overburden between Soft and Hard with gas selected.</p>
            <p className="text-[13px] text-stone-700 mt-0.5">Watch the TR crossplot point swing from Class III (lower-left) to Class IV (lower-right) — same reservoir, completely different AVO class. The classification belongs to the interface, not to the reservoir alone.</p>
          </div>

          <div className="border-l-2 border-stone-300 pl-4 py-1">
            <p className="font-medium text-stone-900">Sweep porosity from low to high in a consolidated sand.</p>
            <p className="text-[13px] text-stone-700 mt-0.5">Increasing porosity makes the dry frame softer, magnifies fluid effects, and pushes the TR dot toward Class III. Carbonates show much less of this porosity sensitivity — try the same sweep with the carbonate lithology to see the contrast.</p>
          </div>

          <div className="border-l-2 border-stone-300 pl-4 py-1">
            <p className="font-medium text-stone-900">Sweep thickness from 80 m down to 15 m.</p>
            <p className="text-[13px] text-stone-700 mt-0.5">The crossplot dots stay put — AVO is an interface property. But the gather changes character as the wavelets begin to overlap. Below tuning thickness, amplitudes can no longer be read directly as reflectivities — a major caveat for amplitude mapping on real data. Use the wavelet frequency control to see that tuning threshold move.</p>
          </div>

          <div className="border-l-2 border-stone-300 pl-4 py-1">
            <p className="font-medium text-stone-900">Switch fluid between gas and oil at the same column.</p>
            <p className="text-[13px] text-stone-700 mt-0.5">Gas produces a strong Class III; oil typically gives Class IIp at best. The flat spot is also much weaker for oil. AVO discriminates gas from brine well; oil from brine, much less reliably.</p>
          </div>

          <div className="border-l-2 border-stone-300 pl-4 py-1">
            <p className="font-medium text-stone-900">Switch lithology from sand to carbonate with gas selected.</p>
            <p className="text-[13px] text-stone-700 mt-0.5">The FC step shrinks dramatically because Gassmann fluid substitution affects stiff-framed rocks much less. DHI workflows that rely on a strong flat spot do not transfer cleanly from clastics to carbonate provinces.</p>
          </div>

        </div>
      </section>

      {/* === Closing footnote === */}
      <section className="bg-stone-100 border border-stone-200 rounded p-5">
        <p className="text-[12px] text-stone-600 leading-relaxed font-serif">
          <span className="font-medium text-stone-800">A note on calibration. </span>
          The dry-rock moduli used for each lithology are simple empirical fits, not full Hashin–Shtrikman or Hertz–Mindlin
          rock-physics models. Absolute Vp, Vs and ρ values are in the right ballpark for each lithology but should not be
          treated as quantitatively realistic. The relative behaviour — which is what matters for learning AVO — is correct.
          For real reservoir characterisation, this atlas is a teaching aid; production work should use measured well logs
          plus a properly calibrated rock-physics model.
        </p>
      </section>

    </div>
  );
}


/* ════════════════════════════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════════════════════════════ */

export default function AVOAtlasV2() {
  // ─── State ────────────────────────────────────────────────────────
  const [ob_hard, setObHard] = useState('soft');
  const [ub_hard, setUbHard] = useState('medium');
  const [lithology, setLithology] = useState('unconsolidated_sand');
  const [phi, setPhi] = useState(0.28);
  const [hc_fluid, setHcFluid] = useState('gas');
  const [hc_sat, setHcSat] = useState(0.80);
  const [column_height, setColumnHeight] = useState(0.55);
  const [thickness, setThickness] = useState(50); // metres, true thickness
  const [waveletType, setWaveletType] = useState('ricker');
  const [waveletFrequency, setWaveletFrequency] = useState(30);
  const [avoEquation, setAvoEquation] = useState('shuey');
  // User-editable range for the thickness slider — defaults the user can override
  const [thickness_min, setThicknessMin] = useState(15);
  const [thickness_max, setThicknessMax] = useState(120);
  const [customElastic, setCustomElastic] = useState(false);
  const [elasticOverrides, setElasticOverrides] = useState(null);

  // ─── View state (Atlas | Guide) ──────────────────────────────────
  const [view, setView] = useState('atlas');

  // Apply a scenario's full settings to the live atlas, then switch to atlas view.
  const applyScenario = useCallback((s) => {
    setObHard(s.ob_hard);
    setUbHard(s.ub_hard);
    setLithology(s.lithology);
    setPhi(s.phi);
    setHcFluid(s.hc_fluid);
    setHcSat(s.hc_sat);
    setColumnHeight(s.column_height);
    setThickness(s.thickness);
    setCustomElastic(false);
    setElasticOverrides(null);
    // Widen thickness slider range if scenario falls outside it
    setThicknessMin(prev => Math.min(prev, s.thickness));
    setThicknessMax(prev => Math.max(prev, s.thickness));
    setView('atlas');
    // Scroll to top so the user sees the freshly-applied configuration.
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openGuideSection = useCallback((sectionId) => {
    setView('guide');
    if (typeof window === 'undefined') return;
    window.history.replaceState(null, '', `#${sectionId}`);
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, []);

  // ─── Derived rock-physics ─────────────────────────────────────────
  const obDefault = useMemo(() => {
    const h = HARDNESS[ob_hard];
    return { ...h, AI: h.Vp * h.rho / 1000 };
  }, [ob_hard]);

  const ubDefault = useMemo(() => {
    const h = HARDNESS[ub_hard];
    return { ...h, AI: h.Vp * h.rho / 1000 };
  }, [ub_hard]);

  const hcResDefault = useMemo(() => {
    const { K_fl, rho_fl } = mixFluid(hc_fluid, hc_sat);
    return gassmannSaturate(lithology, phi, K_fl, rho_fl);
  }, [lithology, phi, hc_fluid, hc_sat]);

  const brResDefault = useMemo(() => gassmannSaturate(lithology, phi, FLUIDS.brine.K, FLUIDS.brine.rho), [lithology, phi]);

  const elasticDefaults = useMemo(() => ({
    ob: obDefault,
    hc_res: hcResDefault,
    br_res: brResDefault,
    ub: ubDefault,
  }), [obDefault, hcResDefault, brResDefault, ubDefault]);

  const effectiveElastic = useMemo(() => {
    if (!customElastic || !elasticOverrides) return elasticDefaults;

    const mergeRock = key => {
      const merged = { ...elasticDefaults[key], ...elasticOverrides[key] };
      const Vp = Math.max(1, merged.Vp);
      const Vs = Math.max(1, merged.Vs);
      const rho = Math.max(0.001, merged.rho);
      return { ...merged, Vp, Vs, rho, AI: Vp * rho / 1000 };
    };

    return {
      ob: mergeRock('ob'),
      hc_res: mergeRock('hc_res'),
      br_res: mergeRock('br_res'),
      ub: mergeRock('ub'),
    };
  }, [customElastic, elasticOverrides, elasticDefaults]);

  const { ob, hc_res, br_res, ub } = effectiveElastic;
  const tuningThickness = useMemo(() => {
    const eff = hc_fluid === 'brine' ? 0 : column_height;
    const reservoirVp = eff > 0 ? hc_res.Vp : br_res.Vp;
    return reservoirVp / (4 * waveletFrequency);
  }, [hc_fluid, column_height, hc_res.Vp, br_res.Vp, waveletFrequency]);

  const enableCustomElastic = useCallback(() => {
    setElasticOverrides(elasticDefaults);
    setCustomElastic(true);
  }, [elasticDefaults]);

  const resetElasticDefaults = useCallback(() => {
    setCustomElastic(false);
    setElasticOverrides(null);
  }, []);

  const updateElasticValue = useCallback((zone, field, value) => {
    if (!Number.isFinite(value)) return;
    setElasticOverrides(prev => {
      const source = prev || elasticDefaults;
      const nextRock = {
        ...source[zone],
        [field]: value,
      };
      return {
        ...source,
        [zone]: {
          ...nextRock,
          AI: nextRock.Vp * nextRock.rho / 1000,
        },
      };
    });
  }, [elasticDefaults]);

  // ─── Interfaces ───────────────────────────────────────────────────
  // When the pore fluid is pure brine, no HC column exists regardless of slider position.
  const effective_column_height = hc_fluid === 'brine' ? 0 : column_height;

  const interfaces = useMemo(() => {
    const eff = hc_fluid === 'brine' ? 0 : column_height;
    const list = [];
    const reservoir_upper = eff > 0 ? hc_res : br_res;
    const reservoir_lower = eff < 1 ? br_res : hc_res;

    list.push({
      name: 'Top reservoir', label: 'TR',
      upper: ob, lower: reservoir_upper,
    });

    if (eff > 0 && eff < 1) {
      list.push({
        name: 'Fluid contact', label: 'FC',
        upper: hc_res, lower: br_res,
      });
    }

    list.push({
      name: 'Base reservoir', label: 'BR',
      upper: reservoir_lower, lower: ub,
    });

    const termFunc = avoEquation === 'aki_richards' ? akiRichardsTerms : shueyTerms;
    return list.map(intf => {
      const t = termFunc(intf.upper.Vp, intf.upper.Vs, intf.upper.rho, intf.lower.Vp, intf.lower.Vs, intf.lower.rho);
      return { ...intf, A: t.A, B: t.B, C: t.C, cls: classify(t.A, t.B) };
    });
  }, [ob, ub, hc_res, br_res, column_height, hc_fluid, avoEquation]);

  // ─── Time-to-depth (TWT) for each interface ──────────────────────
  const timing = useMemo(() => {
    const eff = hc_fluid === 'brine' ? 0 : column_height;
    const t_top = 1.000; // anchor top reservoir at 1 s
    const has_FC = eff > 0 && eff < 1;
    const Vp_upper = eff > 0 ? hc_res.Vp : br_res.Vp;
    const Vp_lower = eff < 1 ? br_res.Vp : hc_res.Vp;

    let t_FC = null, t_BR;
    if (has_FC) {
      t_FC = t_top + 2 * eff * thickness / Vp_upper;
      t_BR = t_FC + 2 * (1 - eff) * thickness / Vp_lower;
    } else {
      const Vp = eff === 1 ? hc_res.Vp : br_res.Vp;
      t_BR = t_top + 2 * thickness / Vp;
    }
    // Window: show 60 ms above top and 50 ms below base
    const t_window = [t_top - 0.060, t_BR + 0.050];
    return { t_top, t_FC, t_BR, t_window };
  }, [hc_res, br_res, column_height, thickness, hc_fluid]);

  // Attach times to interfaces
  const interfacesWithTime = interfaces.map(intf => ({
    ...intf,
    time: intf.name === 'Top reservoir' ? timing.t_top
        : intf.name === 'Fluid contact'  ? timing.t_FC
        : timing.t_BR,
  }));

  // ─── AVO curve data for each interface ────────────────────────────
  const avoCurves = useMemo(() => {
    const angles = Array.from({ length: 46 }, (_, i) => i);
    return angles.map(deg => {
      const row = { angle: deg };
      interfaces.forEach(intf => {
        row[intf.label] = reflAt(intf.A, intf.B, intf.C, deg);
      });
      return row;
    });
  }, [interfaces]);

  // ─── Reset ────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setObHard('soft'); setUbHard('medium');
    setLithology('unconsolidated_sand'); setPhi(0.28);
    setHcFluid('gas'); setHcSat(0.80);
    setColumnHeight(0.55); setThickness(50);
    setWaveletType('ricker');
    setWaveletFrequency(30);
    setThicknessMin(15); setThicknessMax(120);
  }, []);

  const lithCfg = LITHOLOGY[lithology];

  return (
    <div className="w-full min-h-screen bg-[#faf9f5] py-6 px-4 md:px-8" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <header className="mb-5 pb-4 border-b border-stone-300 flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-3xl text-stone-900 tracking-tight">AVO Atlas</h1>
            <span className="text-stone-500 font-serif italic text-sm">v3 · three-layer with extended guide </span>
          </div>
          <div className="flex items-center gap-3">
            <Tabs view={view} setView={setView} />
            {view === 'atlas' && (
              <button
                onClick={reset}
                className="text-[12px] text-stone-500 hover:text-stone-900 flex items-center gap-1.5"
              >
                <RotateCcw size={13} /> reset
              </button>
            )}
          </div>
        </header>

        {view === 'atlas' && (<>
        {/* Main grid: controls + visualisations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ── Controls ──────────────────────────────────────────── */}
          <aside className="lg:col-span-3 space-y-4">

            <section className="bg-white border border-stone-200 rounded p-4">
              <h2 className="font-serif text-base text-stone-900 mb-3 pb-2 border-b border-stone-100 flex items-center gap-2">
                <Layers size={15} className="text-stone-500" /> Sealing rocks
              </h2>
              <Select
                label="Overburden hardness"
                value={ob_hard} onChange={setObHard}
                options={Object.entries(HARDNESS).map(([k, v]) => [k, v.name])}
              />
              <Select
                label="Underburden hardness"
                value={ub_hard} onChange={setUbHard}
                options={Object.entries(HARDNESS).map(([k, v]) => [k, v.name])}
              />
            </section>

            <section className="bg-white border border-stone-200 rounded p-4">
              <h2 className="font-serif text-base text-stone-900 mb-3 pb-2 border-b border-stone-100">Reservoir matrix</h2>
              <Select
                label="Lithology"
                value={lithology} onChange={setLithology}
                options={Object.entries(LITHOLOGY).map(([k, v]) => [k, v.name])}
              />
              <Slider
                label="Porosity φ" value={phi} onChange={setPhi}
                min={lithCfg.phiRange[0]} max={lithCfg.phiRange[1]} step={0.005}
                unit="v/v" accent="#b45309" fmt={v => v.toFixed(3)}
              />
              {/* Thickness — slider with editable min/max */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[12px] mb-1.5">
                  <span className="text-stone-700">
                    True thickness · <span className="font-mono tabular-nums text-stone-900">{thickness.toFixed(0)}</span><span className="text-stone-500"> m</span>
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-stone-500">
                    <input
                      type="number"
                      min={1}
                      value={thickness_min}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10);
                        if (Number.isFinite(v) && v >= 1 && v < thickness_max) {
                          setThicknessMin(v);
                          if (thickness < v) setThickness(v);
                        }
                      }}
                      title="slider minimum (m)"
                      className="w-11 px-1 py-0.5 border border-stone-300 rounded text-stone-700 font-mono text-right tabular-nums focus:outline-none focus:border-stone-500"
                    />
                    <span className="text-stone-400">–</span>
                    <input
                      type="number"
                      max={1000}
                      value={thickness_max}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10);
                        if (Number.isFinite(v) && v > thickness_min && v <= 1000) {
                          setThicknessMax(v);
                          if (thickness > v) setThickness(v);
                        }
                      }}
                      title="slider maximum (m)"
                      className="w-14 px-1 py-0.5 border border-stone-300 rounded text-stone-700 font-mono text-right tabular-nums focus:outline-none focus:border-stone-500"
                    />
                    <span className="text-stone-500">m</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={thickness_min}
                  max={thickness_max}
                  step={1}
                  value={thickness}
                  onChange={e => setThickness(parseInt(e.target.value, 10))}
                  className="w-full"
                  style={{ accentColor: '#b45309' }}
                />
                <div className="flex justify-between text-[10px] text-stone-400 font-mono tabular-nums mt-0.5">
                  <span>{thickness_min}</span>
                  <span>{thickness_max}</span>
                </div>
              </div>
            </section>

            <section className="bg-white border border-stone-200 rounded p-4">
              <h2 className="font-serif text-base text-stone-900 mb-3 pb-2 border-b border-stone-100 flex items-center gap-2">
                <Droplet size={15} className="text-stone-500" /> Fluid fill
              </h2>
              <Select
                label="Pore fluid"
                value={hc_fluid} onChange={setHcFluid}
                options={[['gas', 'Gas'], ['oil', 'Oil'], ['brine', 'Brine only (no HC)']]}
              />
              {hc_fluid !== 'brine' ? (
                <>
                  <Slider
                    label={`${FLUIDS[hc_fluid].name} saturation in HC zone`} value={hc_sat} onChange={setHcSat}
                    min={0} max={1} step={0.02} unit="v/v" accent={FLUIDS[hc_fluid].color} fmt={v => v.toFixed(2)}
                  />
                  <Slider
                    label="HC column height" value={column_height} onChange={setColumnHeight}
                    min={0} max={1} step={0.01} unit="fraction" accent={FLUIDS[hc_fluid].color} fmt={v => v.toFixed(2)}
                  />
                  <p className="text-[11px] text-stone-500 italic mt-1 leading-snug">
                    Saturation is the {FLUIDS[hc_fluid].name.toLowerCase()} fraction inside the HC zone (the rest is
                    irreducible brine). Column height is the vertical fraction of the reservoir that is HC-filled;
                    a brine leg occupies the rest below the dashed contact.
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-stone-600 italic mt-2 leading-snug bg-stone-50 border border-stone-200 rounded px-2.5 py-2">
                  Reservoir is fully brine-saturated — no hydrocarbon column, no fluid contact, no flat-spot reflection.
                  Saturation and column-height controls are inactive.
                </p>
              )}
            </section>

            <section className="bg-white border border-stone-200 rounded p-4">
              <h2 className="font-serif text-base text-stone-900 mb-3 pb-2 border-b border-stone-100 flex items-center gap-2">
                <Waves size={15} className="text-stone-500" /> AVO equation
              </h2>
              <Select
                label="Formula"
                value={avoEquation}
                onChange={setAvoEquation}
                options={[['shuey', 'Shuey'], ['aki_richards', 'Aki & Richards']]}
              />
              <p className="text-[11px] text-stone-500 italic mt-1 leading-snug">
                Pick whether the AVO reflectivity coefficients are computed from the Shuey approximation or the Aki–Richards form.
              </p>
            </section>

            <WaveletPanel
              type={waveletType}
              frequency={waveletFrequency}
              onTypeChange={setWaveletType}
              onFrequencyChange={setWaveletFrequency}
              tuningThickness={tuningThickness}
            />

            <ElasticPropertiesPanel
              defaults={elasticDefaults}
              values={effectiveElastic}
              customElastic={customElastic}
              onEnableCustom={enableCustomElastic}
              onReset={resetElasticDefaults}
              onElasticChange={updateElasticValue}
              hcColor={FLUIDS[hc_fluid].color}
            />
          </aside>

          {/* ── Visualisations ────────────────────────────────────── */}
          <main className="lg:col-span-9 space-y-4">

            {/* Impedance log + gather, sharing y-axis */}
            <section className="bg-white border border-stone-200 rounded p-4">
              <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-stone-100">
                <h2 className="font-serif text-base text-stone-900">Impedance profile & synthetic angle gather</h2>
                <span className="text-[11px] text-stone-400 italic">aligned on TWT · top reservoir at 1.000 s</span>
              </div>
              <div className="flex justify-center gap-2 flex-wrap">
                <ImpedanceLog
                  ob={ob} hc_res={hc_res} br_res={br_res} ub={ub}
                  column_height={effective_column_height} hc_fluid={hc_fluid}
                  t_top={timing.t_top} t_FC={timing.t_FC ?? (timing.t_top + timing.t_BR) / 2}
                  t_BR={timing.t_BR} t_window={timing.t_window}
                />
                <SyntheticGather
                  interfaces={interfacesWithTime}
                  t_window={timing.t_window}
                  waveletType={waveletType}
                  f_dom={waveletFrequency}
                />
                <PolarityLegend />
              </div>

              {/* Interface classification chips */}
              <div className="mt-3 flex gap-3 justify-center flex-wrap">
                {interfaces.map(intf => (
                  <div key={intf.name} className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded px-3 py-1.5">
                    <span className="text-[11px] text-stone-500 uppercase tracking-wider">{intf.name}</span>
                    <span
                      className="px-2 py-0.5 rounded text-white font-serif text-sm leading-tight"
                      style={{ backgroundColor: intf.cls.color }}
                    >
                      Class {intf.cls.cls}
                    </span>
                    <span className="font-mono tabular-nums text-[11px] text-stone-700">A={intf.A.toFixed(3)}, B={intf.B.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* AVO curves + crossplot */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="bg-white border border-stone-200 rounded p-4">
                <h2 className="font-serif text-base text-stone-900 mb-3 pb-2 border-b border-stone-100">Reflectivity vs angle</h2>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <LineChart data={avoCurves} margin={{ top: 8, right: 16, bottom: 28, left: 4 }}>
                      <CartesianGrid strokeDasharray="2 3" stroke="#e7e5e4" />
                      <XAxis dataKey="angle" type="number" domain={[0, 45]} ticks={[0, 10, 20, 30, 40]}
                             stroke="#78716c" tick={{ fontSize: 11, fontFamily: 'ui-monospace, monospace' }}
                             label={{ value: 'θ (deg)', position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: '#57534e', fontStyle: 'italic' } }} />
                      <YAxis type="number" domain={[-0.35, 0.35]}
                             stroke="#78716c" tick={{ fontSize: 11, fontFamily: 'ui-monospace, monospace' }}
                             tickFormatter={v => v.toFixed(2)} />
                      <ReferenceLine y={0} stroke="#a8a29e" strokeWidth={0.5} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', border: '1px solid #d6d3d1' }}
                        labelFormatter={l => `θ = ${l}°`}
                        formatter={v => v.toFixed(4)}
                      />
                      {interfaces.map(intf => (
                        <Line key={intf.label} type="monotone" dataKey={intf.label} stroke={intf.cls.color} strokeWidth={2} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-[11px] mt-1">
                  {interfaces.map(intf => (
                    <span key={intf.name} className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-0.5" style={{ backgroundColor: intf.cls.color }}></span>
                      <span className="text-stone-700">{intf.label} ({intf.name})</span>
                    </span>
                  ))}
                </div>
              </section>

              <section className="bg-white border border-stone-200 rounded p-4">
                <h2 className="font-serif text-base text-stone-900 mb-3 pb-2 border-b border-stone-100">Intercept–gradient crossplot</h2>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <ScatterChart margin={{ top: 8, right: 16, bottom: 28, left: 4 }}>
                      <CartesianGrid strokeDasharray="2 3" stroke="#e7e5e4" />
                      <XAxis type="number" dataKey="A" name="A" domain={[-0.25, 0.25]}
                             ticks={[-0.2, -0.1, 0, 0.1, 0.2]}
                             stroke="#78716c" tick={{ fontSize: 11, fontFamily: 'ui-monospace, monospace' }}
                             tickFormatter={v => v.toFixed(2)}
                             label={{ value: 'A', position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: '#57534e', fontStyle: 'italic' } }} />
                      <YAxis type="number" dataKey="B" name="B" domain={[-0.45, 0.35]}
                             ticks={[-0.4, -0.2, 0, 0.2]}
                             stroke="#78716c" tick={{ fontSize: 11, fontFamily: 'ui-monospace, monospace' }}
                             tickFormatter={v => v.toFixed(2)}
                             label={{ value: 'B', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#57534e', fontStyle: 'italic' } }} />
                      <ReferenceArea x1={-0.25} x2={-0.02} y1={-0.45} y2={0}   fill="#fee2e2" fillOpacity={0.4} />
                      <ReferenceArea x1={-0.25} x2={-0.02} y1={0}     y2={0.35} fill="#dbeafe" fillOpacity={0.4} />
                      <ReferenceArea x1={0.04}  x2={0.25}  y1={-0.45} y2={0}   fill="#fef3c7" fillOpacity={0.5} />
                      <ReferenceLine x={0} stroke="#a8a29e" strokeWidth={0.5} />
                      <ReferenceLine y={0} stroke="#a8a29e" strokeWidth={0.5} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', border: '1px solid #d6d3d1' }}
                        formatter={v => v.toFixed(3)}
                      />
                      {interfaces.map(intf => (
                        <Scatter
                          key={intf.label}
                          name={intf.label}
                          data={[{ A: intf.A, B: intf.B, label: intf.label }]}
                          shape={(props) => (
                            <g>
                              <circle cx={props.cx} cy={props.cy} r={9} fill={intf.cls.color} fillOpacity={0.25} />
                              <circle cx={props.cx} cy={props.cy} r={5} fill={intf.cls.color} stroke="white" strokeWidth={1.5} />
                              <text x={props.cx + 9} y={props.cy + 3} fontSize={10} fill={intf.cls.color} fontFamily="ui-monospace, monospace" fontWeight="600">
                                {intf.label}
                              </text>
                            </g>
                          )}
                        />
                      ))}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-3 text-[10px] mt-1 text-stone-600">
                  <span><span className="inline-block w-2 h-2 bg-amber-200 mr-1 align-middle"></span>Class I region</span>
                  <span><span className="inline-block w-2 h-2 bg-red-200 mr-1 align-middle"></span>Class II/III</span>
                  <span><span className="inline-block w-2 h-2 bg-blue-200 mr-1 align-middle"></span>Class IV</span>
                </div>
              </section>
            </div>

            <CompactScenarioLaunchers
              onApplyScenario={applyScenario}
              onOpenGuideSection={openGuideSection}
            />
          </main>
        </div>

        <footer className="mt-5 text-[12px] text-stone-500 bg-white border border-stone-200 rounded p-4 leading-relaxed">
          <span className="font-serif text-stone-700">Notes — </span>
          Reservoir Vp/Vs/ρ are computed from porosity and fluid via Gassmann fluid substitution (Reuss average for the
          fluid mixture; modulus drop in the matrix is small for liquids, large for gas). Three interfaces are tracked:
          top reservoir, fluid contact (when 0 &lt; column &lt; 1), and base reservoir; each gets its own Shuey AVO. The
          synthetic gather uses a selectable zero-phase wavelet convolved with the angle-dependent reflectivity series. Dry-rock moduli for each
          lithology are simple empirical fits, not Hashin–Shtrikman — the numbers are in the right ballpark for learning AVO
          behaviour, but treat absolute values as illustrative. Created by Behrooz Bashokooh. Find all the code:{' '}
          <a
            href="https://github.com/BehroozBashokooh/AVOAtlas"
            target="_blank"
            rel="noreferrer"
            className="text-stone-700 underline underline-offset-2 hover:text-stone-900"
          >
            BehroozBashokooh/AVOAtlas
          </a>
          .{' '}
          <a
            href="https://buymeacoffee.com/behroozbashokooh"
            target="_blank"
            rel="noreferrer"
            className="text-stone-700 underline underline-offset-2 hover:text-stone-900"
          >
            Buy me a Coffee
          </a>
          .
        </footer>
        </>)}

        {view === 'guide' && <GuideView onApplyScenario={applyScenario} />}
      </div>
    </div>
  );
}
