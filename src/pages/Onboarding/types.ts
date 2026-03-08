export interface RoutineAnswers {
  studyHours: string;
  sleepTime: string;
  wakeTime: string;
  sleepHours: string;
  classesScheduleImage: string | null;
  hobbiesTime: string;
  scrollHours: string;
  freeTime: string;
}

export interface StepProps {
  answers: RoutineAnswers;
  onUpdate: (updates: Partial<RoutineAnswers>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const defaultRoutine: RoutineAnswers = {
  studyHours: '',
  sleepTime: '',
  wakeTime: '',
  sleepHours: '',
  classesScheduleImage: null,
  hobbiesTime: '',
  scrollHours: '',
  freeTime: '',
};
