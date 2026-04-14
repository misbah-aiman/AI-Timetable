import React, { useEffect } from 'react';
import type { StepProps } from './types';

interface Step6ReviewProps extends StepProps {
  onEditStep: (step: number) => void;
}

export const Step6Review: React.FC<Step6ReviewProps> = ({ 
  answers, 
  onUpdate, 
  onNext, 
  onBack,
  onEditStep 
}) => {
  useEffect(() => {
    const onEnter = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('button') || el?.closest('a')) return;
      e.preventDefault();
      onNext();
    };
    window.addEventListener('keydown', onEnter);
    return () => window.removeEventListener('keydown', onEnter);
  }, [onNext]);

  return (
    <div className="mb-6">
      <p className="mb-4 text-base font-medium text-primary-900">
        Review your routine
      </p>
      <p className="mb-4 text-sm text-primary-600/80">
        Here&apos;s everything you&apos;ve entered. Review and click &quot;Generate my timetable&quot; to continue.
      </p>
      <div className="space-y-3 rounded-xl border border-primary-200 bg-primary-50/30 p-4">
        {/* Sleep Schedule */}
        <div className="flex items-start justify-between border-b border-primary-200 pb-2">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-600">
            Sleep Schedule
          </span>
          <button
            type="button"
            onClick={() => onEditStep(0)}
            className="text-xs text-primary-500 underline underline-offset-2 hover:text-primary-700"
          >
            Edit
          </button>
        </div>
        <div className="space-y-1 text-sm text-primary-800">
          <p><span className="font-medium">Bedtime:</span> {answers.sleepTime || 'Not set'}</p>
          <p><span className="font-medium">Wake time:</span> {answers.wakeTime || 'Not set'}</p>
          <p><span className="font-medium">Sleep hours:</span> {answers.sleepHours ? `${answers.sleepHours} hrs` : 'Not set'}</p>
        </div>

        {/* Scroll Time */}
        <div className="flex items-start justify-between border-b border-primary-200 pb-2 pt-3">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-600">
            Scroll Time
          </span>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            className="text-xs text-primary-500 underline underline-offset-2 hover:text-primary-700"
          >
            Edit
          </button>
        </div>
        <p className="text-sm text-primary-800">
          <span className="font-medium">Scroll limit:</span> {answers.scrollHours ? `${answers.scrollHours} hrs` : 'Not set'}
        </p>

        {/* Study Hours */}
        <div className="flex items-start justify-between border-b border-primary-200 pb-2 pt-3">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-600">
            Study Hours
          </span>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            className="text-xs text-primary-500 underline underline-offset-2 hover:text-primary-700"
          >
            Edit
          </button>
        </div>
        <p className="text-sm text-primary-800">
          <span className="font-medium">Daily study goal:</span> {answers.studyHours ? `${answers.studyHours} hrs` : 'Not set'}
        </p>

        {/* Hobbies */}
        <div className="flex items-start justify-between border-b border-primary-200 pb-2 pt-3">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-600">
            Hobbies & Free Time
          </span>
          <button
            type="button"
            onClick={() => onEditStep(3)}
            className="text-xs text-primary-500 underline underline-offset-2 hover:text-primary-700"
          >
            Edit
          </button>
        </div>
        <div className="space-y-1 text-sm text-primary-800">
          <p><span className="font-medium">Hobbies:</span> {answers.hobbiesTime || 'None specified'}</p>
          <p><span className="font-medium">Free time:</span> {answers.freeTime || 'None specified'}</p>
        </div>

        {/* Classes Schedule */}
        <div className="flex items-start justify-between border-b border-primary-200 pb-2 pt-3">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-600">
            Classes Schedule
          </span>
          <button
            type="button"
            onClick={() => onEditStep(4)}
            className="text-xs text-primary-500 underline underline-offset-2 hover:text-primary-700"
          >
            Edit
          </button>
        </div>
        {answers.classesScheduleImage ? (
          <div className="text-sm text-primary-800">
            <img
              src={answers.classesScheduleImage}
              alt="Schedule preview"
              className="mt-2 max-h-32 rounded-lg object-contain"
            />
            <p className="mt-1 text-xs text-primary-600">Image uploaded</p>
          </div>
        ) : (
          <p className="text-sm text-primary-800">No image uploaded</p>
        )}
      </div>
    </div>
  );
};
