import React, { useEffect } from 'react';
import type { StepProps } from './types';

export const Step5Classes: React.FC<StepProps> = ({ answers, onUpdate, onNext, onBack }) => {
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
      <p className="mb-3 text-base font-medium text-primary-900">
        Share your classes schedule
      </p>
      <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/50 px-4 py-8 transition hover:border-primary-400 hover:bg-primary-100/50">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () =>
                onUpdate({ classesScheduleImage: reader.result as string });
              reader.readAsDataURL(file);
            }
          }}
        />
        {answers.classesScheduleImage ? (
          <div className="space-y-2 text-center">
            <img
              src={answers.classesScheduleImage}
              alt="Schedule preview"
              className="mx-auto max-h-40 rounded-lg object-contain"
            />
            <span className="text-sm font-medium text-primary-600">
              Image added
            </span>
          </div>
        ) : (
          <span className="text-sm font-medium text-primary-600">
            Click to upload an image
          </span>
        )}
      </label>
    </div>
  );
};
