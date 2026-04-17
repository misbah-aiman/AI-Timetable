import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../components/auth';
import { saveRoutine } from '../../services';
import { Step1Sleep } from './Step1Sleep';
import { Step2Scroll } from './Step2Scroll';
import { Step3Study } from './Step3Study';
import { Step4Hobbies } from './Step4Hobbies';
import { Step5Classes } from './Step5Classes';
import { Step6Review } from './Step6Review';
import { defaultRoutine, type RoutineAnswers } from './types';

const TOTAL_STEPS = 6;

interface OnboardingProps {
  initial?: RoutineAnswers;
  onComplete: (answers: RoutineAnswers) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ initial, onComplete }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<RoutineAnswers>(initial || defaultRoutine);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Routine setup is only for new users after signup
  const fromSignup = location.state?.fromSignup === true || sessionStorage.getItem('signup:needsRoutine') === '1';
  if (!fromSignup) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleUpdate = (updates: Partial<RoutineAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((prev) => prev + 1);
      setSaveError(null);
      return;
    }
    
    // Last step - save and generate
    setSaveError(null);
    setIsSaving(true);
    try {
      await saveRoutine(user!.id, answers);
      onComplete(answers);
      sessionStorage.removeItem('signup:needsRoutine');
      navigate('/analyze', { replace: true });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save routine.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (step === 0) {
      navigate('/dashboard');
    } else {
      setStep((prev) => prev - 1);
    }
  };

  const handleEditStep = (targetStep: number) => {
    setStep(targetStep);
  };

  const renderStep = () => {
    const stepProps = {
      answers,
      onUpdate: handleUpdate,
      onNext: handleNext,
      onBack: handleBack,
    };

    switch (step) {
      case 0:
        return <Step1Sleep {...stepProps} />;
      case 1:
        return <Step2Scroll {...stepProps} />;
      case 2:
        return <Step3Study {...stepProps} />;
      case 3:
        return <Step4Hobbies {...stepProps} />;
      case 4:
        return <Step5Classes {...stepProps} />;
      case 5:
        return <Step6Review {...stepProps} onEditStep={handleEditStep} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary-50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-soft ring-1 ring-primary-200/60">
        {renderStep()}
        {saveError && (
          <p className="mb-3 text-xs font-medium text-primary-700">{saveError}</p>
        )}
        <div className="mt-4 flex justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={isSaving}
            className="flex-1 rounded-lg border border-primary-300 px-4 py-2 text-sm font-medium text-primary-800 hover:bg-primary-100 disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={isSaving}
            className="flex-1 rounded-lg border border-primary-400 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-800 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSaving
              ? 'Saving…'
              : step === TOTAL_STEPS - 1
                ? 'Generate my timetable'
                : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
