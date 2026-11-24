import type { ReactElement } from 'react';
import type { CoachContext, Language } from '../core/coach';
import { AdvisoryCard } from './coach/AdvisoryCard';
import { AskCard } from './coach/AskCard';
import { PlanCard } from './coach/PlanCard';
import { SelectField } from './FormFields';

interface CoachPanelProps {
  context: CoachContext;
  language: Language;
  onLanguageChange: (language: Language) => void;
}

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
] as const satisfies readonly { value: Language; label: string }[];

/** "Ask Saans": the Gemini-powered plan, questions and community advisory. Lazy-loaded. */
export default function CoachPanel({
  context,
  language,
  onLanguageChange,
}: Readonly<CoachPanelProps>): ReactElement {
  return (
    <div className="grid">
      <section className="card span-2" aria-labelledby="coach-heading">
        <div className="card-head">
          <h2 id="coach-heading">Ask Saans</h2>
          <SelectField<Language>
            label="Reply language"
            value={language}
            onChange={onLanguageChange}
            options={LANGUAGES}
          />
        </div>
        <p className="hint">
          Gemini only sees the numbers Saans calculated (AQI, the forecast, your dose, top swaps and
          room hacks), never your exact location or personal details.
        </p>
      </section>
      <PlanCard context={context} language={language} />
      <AskCard context={context} language={language} />
      <AdvisoryCard context={context} language={language} />
    </div>
  );
}
