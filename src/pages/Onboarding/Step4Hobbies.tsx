import React, { useRef } from 'react';
import type { StepProps } from './types';
import { chainEnter } from './enterAdvance';

export const Step4Hobbies: React.FC<StepProps> = ({ answers, onUpdate, onNext, onBack }) => {
  const freeRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mb-6 space-y-4">
      <div>
        <p className="mb-3 text-base font-medium text-primary-900">
          Hobbies time (if any)
        </p>
        <p className="mb-3 text-sm text-primary-600/80">
          Optional. e.g. &quot;1 hour for guitar&quot; or leave blank.
        </p>
        <input
          type="text"
          value={answers.hobbiesTime}
          onChange={(e) => onUpdate({ hobbiesTime: e.target.value })}
          onKeyDown={(e) => chainEnter(e, () => freeRef.current?.focus())}
          placeholder="e.g. 1 hour for reading"
          className="mt-1 w-full rounded-xl border border-primary-200 bg-primary-50/50 px-3.5 py-2.5 text-sm text-primary-900 outline-none placeholder:text-primary-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
        />
      </div>

      <div>
        <p className="mb-3 text-base font-medium text-primary-900">
          Free time (if any)
        </p>
        <p className="mb-3 text-sm text-primary-600/80">
          Optional. Describe any free time you want to allocate, e.g. &quot;2 hours for relaxation&quot;.
        </p>
        <input
          ref={freeRef}
          type="text"
          value={answers.freeTime}
          onChange={(e) => onUpdate({ freeTime: e.target.value })}
          onKeyDown={(e) => chainEnter(e, onNext)}
          placeholder="e.g. 2 hours for relaxation"
          className="mt-1 w-full rounded-xl border border-primary-200 bg-primary-50/50 px-3.5 py-2.5 text-sm text-primary-900 outline-none placeholder:text-primary-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
        />
      </div>
    </div>
  );
};
