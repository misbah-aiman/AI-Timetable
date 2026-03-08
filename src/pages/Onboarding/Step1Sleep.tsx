import React from 'react';
import type { StepProps } from './types';

export const Step1Sleep: React.FC<StepProps> = ({ answers, onUpdate, onNext, onBack }) => {
  return (
    <div className="mb-6 space-y-4">
      <p className="text-base font-medium text-primary-900">
        When do you usually sleep and wake up?
      </p>
      <p className="text-sm text-primary-600/80">
        We&apos;ll use this to plan study blocks around your rest.
      </p>
      <div>
        <label className="mb-1 block text-xs font-medium text-primary-700">
          Bedtime
        </label>
        <input
          type="time"
          value={answers.sleepTime}
          onChange={(e) => onUpdate({ sleepTime: e.target.value })}
          className="mt-1 w-full rounded-xl border border-primary-200 bg-primary-50/50 px-3.5 py-2.5 text-sm text-primary-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-primary-700">
          Wake time
        </label>
        <input
          type="time"
          value={answers.wakeTime}
          onChange={(e) => onUpdate({ wakeTime: e.target.value })}
          className="mt-1 w-full rounded-xl border border-primary-200 bg-primary-50/50 px-3.5 py-2.5 text-sm text-primary-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-primary-700">
          How many hours of sleep do you aim for?
        </label>
        <input
          type="number"
          min="0"
          max="24"
          step="0.5"
          value={answers.sleepHours}
          onChange={(e) => onUpdate({ sleepHours: e.target.value })}
          placeholder="e.g. 7"
          className="mt-1 w-full rounded-xl border border-primary-200 bg-primary-50/50 px-3.5 py-2.5 text-sm text-primary-900 outline-none placeholder:text-primary-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
        />
      </div>
    </div>
  );
};
