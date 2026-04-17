import React from 'react';
import type { StepProps } from './types';
import { chainEnter } from './enterAdvance';

export const Step2Scroll: React.FC<StepProps> = ({ answers, onUpdate, onNext, onBack }) => {
  return (
    <div className="mb-6">
      <p className="mb-3 text-base font-medium text-primary-900">
        How many hours do you want to limit scrolling to?
      </p>
      <input
        type="number"
        min="0"
        max="24"
        step="0.5"
        value={answers.scrollHours}
        onChange={(e) => onUpdate({ scrollHours: e.target.value })}
        onKeyDown={(e) => chainEnter(e, onNext)}
        placeholder="e.g. 1.5"
        className="mt-1 w-full rounded-xl border border-primary-200 bg-primary-50/50 px-3.5 py-2.5 text-sm text-primary-900 outline-none placeholder:text-primary-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
      />
    </div>
  );
};
