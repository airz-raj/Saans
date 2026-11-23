/**
 * The bounded, anonymised context sent to the AI coach, and deterministic fallbacks that
 * produce the same shapes when the model is unavailable.
 */
import { POLLUTANT_LABELS } from './constants';
import { formatConc, formatDose, percent } from './explain';
import type { HomeHack } from './indoor';
import type { AqiResult, DayBudget, Profile, Swap } from './types';

export type CoachMode = 'plan' | 'ask' | 'community';
export type Language = 'en' | 'hi';

export interface CoachContext {
  place: string;
  aqi: number;
  category: string;
  dominant: string;
  pm25Now: number;
  cleanWindow: string | null;
  worstWindow: string | null;
  /** Next 24 hours of outdoor PM2.5 with 12-hour clock labels, so the model can reason about times. */
  forecast: { time: string; pm25: number }[];
  household: {
    persona: Profile['persona'];
    children: number;
    elders: number;
    sensitiveMember: boolean;
  };
  budget: {
    totalDoseUg: number;
    cigarettes: number;
    whoMultiple: number;
    top: { label: string; doseUg: number; sharePct: number }[];
  };
  swaps: { title: string; savedPct: number; co2SavedKg: number }[];
  hacks: { title: string; indoorBefore: number; indoorAfter: number }[];
}

export interface CoachPlan {
  headline: string;
  steps: { title: string; why: string; impact: string }[];
  caution: string;
}
export interface CoachAnswer {
  answer: string;
  followUps: string[];
}
export interface CoachAdvisory {
  title: string;
  message: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface ContextInput {
  placeName: string;
  aqi: AqiResult;
  pm25Now: number;
  cleanWindow: string | null;
  worstWindow: string | null;
  forecast: readonly { time: string; pm25: number }[];
  profile: Profile;
  budget: DayBudget;
  swaps: readonly Swap[];
  hacks: readonly HomeHack[];
}

export function buildCoachContext(input: ContextInput): CoachContext {
  const { budget, profile } = input;
  return {
    place: input.placeName.slice(0, 80),
    aqi: input.aqi.aqi,
    category: input.aqi.category,
    dominant: POLLUTANT_LABELS[input.aqi.dominant],
    pm25Now: Math.round(input.pm25Now),
    cleanWindow: input.cleanWindow,
    worstWindow: input.worstWindow,
    forecast: input.forecast
      .slice(0, 24)
      .map((h) => ({ time: h.time.slice(0, 10), pm25: Math.round(h.pm25) })),
    household: {
      persona: profile.persona,
      children: profile.children,
      elders: profile.elders,
      sensitiveMember: profile.sensitiveMember,
    },
    budget: {
      totalDoseUg: Math.round(budget.totalDose),
      cigarettes: round1(budget.cigarettes),
      whoMultiple: round1(budget.whoMultiple),
      top: [...budget.items]
        .sort((a, b) => b.dose - a.dose)
        .slice(0, 4)
        .map((item) => ({
          label: item.activity.label.slice(0, 60),
          doseUg: Math.round(item.dose),
          sharePct: percent(item.dose, budget.totalDose),
        })),
    },
    swaps: input.swaps.slice(0, 5).map((swap) => ({
      title: swap.title.slice(0, 120),
      savedPct: percent(swap.doseSaved, swap.doseBefore),
      co2SavedKg: round1(swap.co2Saved),
    })),
    hacks: input.hacks.slice(0, 4).map((hack) => ({
      title: hack.title.slice(0, 120),
      indoorBefore: Math.round(hack.before),
      indoorAfter: Math.round(hack.after),
    })),
  };
}

const vulnerableNote = (ctx: CoachContext) => {
  const people: string[] = [];
  if (ctx.household.children > 0) people.push('children');
  if (ctx.household.elders > 0) people.push('elders');
  if (ctx.household.sensitiveMember) people.push('anyone with asthma, heart disease or pregnancy');
  return people.length > 0 ? ` Take extra care of ${people.join(', ')}.` : '';
};

export function fallbackPlan(ctx: CoachContext): CoachPlan {
  const steps: CoachPlan['steps'] = [];
  if (ctx.cleanWindow) {
    steps.push({
      title: `Air out the house during ${ctx.cleanWindow}`,
      why: 'This is the cleanest stretch in the forecast; keep windows shut outside it.',
      impact: 'Fresh air in without letting the worst smog in.',
    });
  }
  for (const swap of ctx.swaps.slice(0, 3)) {
    steps.push({
      title: swap.title,
      why: 'Ranked by how much PM2.5 it keeps out of your lungs today.',
      impact:
        `−${swap.savedPct}% dose for that activity` +
        (swap.co2SavedKg > 0 ? `, −${swap.co2SavedKg} kg CO₂` : ''),
    });
  }
  const hack = ctx.hacks[0];
  if (hack) {
    steps.push({
      title: hack.title,
      why: 'The biggest indoor improvement for your room setup.',
      impact: `Indoor PM2.5 ${formatConc(hack.indoorBefore)} → ${formatConc(hack.indoorAfter)}.`,
    });
  }
  return {
    headline: `AQI ${ctx.aqi} (${ctx.category}) in ${ctx.place}: today's plan keeps your dose near ${formatDose(
      ctx.budget.totalDoseUg,
    )} ≈ ${ctx.budget.cigarettes} cigarettes.`,
    steps,
    caution: `Estimates for planning, not medical advice.${vulnerableNote(ctx)}`,
  };
}

export function fallbackAnswer(ctx: CoachContext): CoachAnswer {
  const window = ctx.cleanWindow ? ` The cleanest time today is ${ctx.cleanWindow}.` : '';
  return {
    answer: `The AI coach is offline right now, so here are the facts Saans calculated: AQI is ${ctx.aqi} (${ctx.category}) with ${ctx.dominant} dominant and PM2.5 at ${formatConc(
      ctx.pm25Now,
    )}.${window}${vulnerableNote(ctx)}`,
    followUps: ['Show my best swaps', 'How do I clean my bedroom air?'],
  };
}

export function fallbackAdvisory(ctx: CoachContext, language: Language): CoachAdvisory {
  if (language === 'hi') {
    return {
      title: `वायु सलाह — ${ctx.place}`,
      message: `आज AQI ${ctx.aqi} (${ctx.category}) है। ${
        ctx.cleanWindow ? `खिड़कियाँ केवल ${ctx.cleanWindow} के बीच 10–15 मिनट खोलें। ` : ''
      }कचरा या पत्ते न जलाएँ, गाड़ी बेवजह चालू न छोड़ें, और छोटे सफ़र पैदल या मेट्रो से करें। बच्चे, बुज़ुर्ग और साँस के मरीज़ बाहर कम निकलें और N95 मास्क पहनें।`,
    };
  }
  return {
    title: `Air advisory — ${ctx.place}`,
    message: `AQI today is ${ctx.aqi} (${ctx.category}). ${
      ctx.cleanWindow ? `Open windows only between ${ctx.cleanWindow}, for 10–15 minutes. ` : ''
    }Please don't burn leaves or waste, switch engines off while waiting, and take the metro or walk for short trips. Children, elders and anyone with breathing problems should limit time outside and wear an N95.`,
  };
}
