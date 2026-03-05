// User types
export interface User {
    id: string;
    name: string;
    email: string;
    preferences?: UserPreferences;
  }
  
  export interface UserPreferences {
    studyHoursPerDay: number;
    sleepStart: string; // "23:00"
    sleepEnd: string;   // "07:00"
    breakDuration: number; // minutes
    preferredStudyDays: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[];
  }
  
  // Course types
  export interface Course {
    id: string;
    name: string;
    code: string;
    credits: number;
    instructor?: string;
    priority: 'high' | 'medium' | 'low';
    color?: string; // For UI display
  }
  
  // Timetable types
  export interface TimeSlot {
    id: string;
    courseId: string;
    day: string;
    startTime: string;
    endTime: string;
    type: 'lecture' | 'lab' | 'tutorial' | 'study' | 'break';
    location?: string;
    completed?: boolean;
  }
  
  export interface WeeklySchedule {
    weekStart: string;
    weekEnd: string;
    slots: TimeSlot[];
  }
  
  // AI Analysis types
  export interface AIAnalysis {
    workloadBalance: 'good' | 'heavy' | 'light';
    focusAreas: {
      courseId: string;
      recommendedHours: number;
      difficulty: 'easy' | 'medium' | 'hard';
    }[];
    suggestions: string[];
    potentialConflicts: {
      type: string;
      description: string;
      suggestion: string;
    }[];
  }
  
  // Tracking types
  export interface StudySession {
    id: string;
    courseId: string;
    date: string;
    duration: number; // minutes
    focus: 1 | 2 | 3 | 4 | 5;
    notes?: string;
  }
  
  export interface WeeklyReport {
    weekStart: string;
    totalHours: number;
    targetHours: number;
    completionRate: number;
    courseBreakdown: {
      courseId: string;
      hours: number;
      targetHours: number;
    }[];
    insights: string[];
  }
  
  // Reminder types
  export interface Reminder {
    id: string;
    title: string;
    description?: string;
    datetime: string;
    type: 'class' | 'study' | 'break' | 'assignment';
    completed: boolean;
    courseId?: string;
  }