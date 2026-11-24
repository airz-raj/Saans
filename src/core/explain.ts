import { MODES, POLLUTANT_LABELS } from './constants';
import { windowAverage, type ExposureContext } from './exposure';
import { formatHour } from './forecast';
import type { AqiCategory, DayBudget, Pollutant, Swap } from './types';

export const formatDose = (micrograms: number): string => {
  if (micrograms < 1) return '<1 µg';
  if (micrograms >= 1000) return `${(micrograms / 1000).toFixed(1)} mg`;
  return `${Math.round(micrograms)} µg`;
};

export const formatConc = (value: number): string => `${Math.round(value)} µg/m³`;

export const percent = (part: number, whole: number): number =>
  whole <= 0 ? 0 : Math.round((part / whole) * 100);

export interface Advice {
  general: string;
  sensitive: string;
}

const ADVICE: Record<AqiCategory, Advice> = {
  Good: {
    general: 'Air is clean. A good time to open windows and be outdoors.',
    sensitive: 'No special precautions needed.',
  },
  Satisfactory: {
    general: 'Air is acceptable for almost everyone.',
    sensitive: 'Very sensitive people may notice mild discomfort during hard exercise.',
  },
  Moderate: {
    general: 'Keep long, hard outdoor exercise short and away from busy roads.',
    sensitive:
      'Children, elders and people with asthma or heart disease should limit exertion outdoors.',
  },
  Poor: {
    general:
      'Most people will feel it after long exposure. Move exercise indoors or to the clean window.',
    sensitive:
      'Sensitive members should stay indoors with windows shut and an air cleaner running.',
  },
  'Very Poor': {
    general: 'Avoid outdoor exercise. Keep windows shut; use an N95 for any time outside.',
    sensitive: 'Sensitive members should avoid going out; keep inhalers and medicines handy.',
  },
  Severe: {
    general:
      'Health emergency level. Stay indoors, seal the room you use most and run an air cleaner.',
    sensitive:
      'Sensitive members should not go outside. Seek medical help for breathlessness or chest pain.',
  },
};

export const aqiAdvice = (category: AqiCategory): Advice => ADVICE[category];

export const dominantText = (pollutant: Pollutant): string =>
  `${POLLUTANT_LABELS[pollutant]} is driving the index right now.`;

/** Plain-language reason a swap helps, with the numbers behind it. */
export function explainSwap(swap: Swap, ctx: ExposureContext): string {
  const cut = percent(swap.doseSaved, swap.doseBefore);
  const head = `Cuts what you inhale during “${swap.before.label}” by ${cut}% (${formatDose(swap.doseBefore)} → ${formatDose(swap.doseAfter)}).`;
  switch (swap.kind) {
    case 'shift': {
      const from = windowAverage(ctx.pm25, swap.before.start, swap.before.duration);
      const to = windowAverage(ctx.pm25, swap.after.start, swap.after.duration);
      return `${head} Outdoor PM2.5 is forecast at ${formatConc(to)} at ${formatHour(swap.after.start)} versus ${formatConc(from)} at ${formatHour(swap.before.start)}, and you breathe 3–4× more air while exercising.`;
    }
    case 'mode': {
      const mode = swap.after.mode ? MODES[swap.after.mode].label.toLowerCase() : 'new mode';
      const co2 =
        swap.co2Saved > 0.005
          ? ` It also avoids ${swap.co2Saved.toFixed(2)} kg of CO₂ each way.`
          : ' Emissions stay about the same.';
      const sign = swap.minutesDelta > 0 ? '+' : '';
      const time =
        swap.minutesDelta === 0 ? '' : ` Travel time changes by ${sign}${swap.minutesDelta} min.`;
      return `${head} Inside the ${mode} you are shielded from tailpipe plumes at road level.${co2}${time}`;
    }
    case 'setting':
      return swap.after.setting === 'home'
        ? `${head} Indoors the air is filtered by walls and, if you have one, your purifier — so heavy breathing does far less harm.`
        : `${head} Particle levels drop quickly with distance from traffic; even 100 m from a main road helps.`;
    case 'mask':
      return `${head} A sealed N95 blocks most fine particles; cloth and loose surgical masks leak around the edges.`;
    case 'cleaner':
      return `${head} You spend a third of the day asleep in one small room, so cleaning that room's air pays off the most.`;
  }
}

export function budgetHeadline(budget: DayBudget): string {
  const top = [...budget.items].sort((a, b) => b.dose - a.dose)[0];
  const share = top ? percent(top.dose, budget.totalDose) : 0;
  return top
    ? `“${top.activity.label}” is ${share}% of today's dose, even though it is ${Math.round(
        (top.activity.duration / 24) * 100,
      )}% of the day.`
    : 'Add activities to see your breath budget.';
}

export const MYTHS: readonly { claim: string; truth: string }[] = [
  {
    claim: 'House plants will clean the air in my room.',
    truth:
      'You would need hundreds of plants per room to match even a small air cleaner. Keep them for joy, not filtration.',
  },
  {
    claim: 'A wet cloth or surgical mask protects me from smog.',
    truth:
      'Fine particles slip through and around them. Only a well-fitted N95/FFP2 gives meaningful protection.',
  },
  {
    claim: 'Early morning is the freshest time for a walk.',
    truth:
      'In winter, cold air traps smoke near the ground overnight; afternoons are often far cleaner. Check the clean window.',
  },
  {
    claim: 'Keeping windows shut all day makes indoor air stale and worse.',
    truth:
      'On smog days, outside air is the bigger problem. Air out briefly in the clean window instead of all day.',
  },
];
