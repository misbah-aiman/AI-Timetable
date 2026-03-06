import OpenAI from 'openai';
import type {
  Course,
  UserPreferences,
  WeeklySchedule,
  TimeSlot,
  StudySession,
  WeeklyReport,
  AIAnalysis,
} from '../types';

export type AIProvider = 'openai' | 'anthropic' | 'gemini';

export interface AIServiceConfig {
  provider: AIProvider;
  apiKey: string;
  /** Optional model override. Defaults: openai gpt-4o-mini, anthropic claude-3-5-haiku, gemini gemini-1.5-flash */
  model?: string;
}

export interface GenerateWeeklyPlanInput {
  courses: Course[];
  preferences: UserPreferences;
  weekStart: string;
  weekEnd: string;
}

export interface GeneratedWeeklyPlan {
  summary: string;
  slots: Omit<TimeSlot, 'id'>[];
  suggestions: string[];
}

export interface GenerateWeeklyReportInput {
  sessions: StudySession[];
  courseTargets: { courseId: string; targetHours: number }[];
  weekStart: string;
  weekEnd: string;
}

export interface GeneratedWeeklyReport extends Omit<WeeklyReport, 'insights'> {
  insights: string[];
  aiSummary?: string;
}

export interface AnalyzeStudyPatternsInput {
  sessions: StudySession[];
  schedule?: WeeklySchedule | null;
  courses: Course[];
}

export interface StudyPatternAnalysis extends AIAnalysis {
  patternDescription?: string;
  bestStudyTimes?: string[];
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
  gemini: 'gemini-1.5-flash',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * AI service supporting OpenAI, Anthropic, and Gemini with methods for
 * weekly plan generation, weekly report generation, and study pattern analysis.
 */
export class AIService {
  private readonly provider: AIProvider;
  private readonly apiKey: string;
  private readonly model: string;
  private openaiClient: OpenAI | null = null;

  constructor(config: AIServiceConfig) {
    this.provider = config.provider;
    this.apiKey = config.apiKey;
    this.model = config.model ?? DEFAULT_MODELS[config.provider];
    if (this.provider === 'openai') {
      this.openaiClient = new OpenAI({ apiKey: this.apiKey });
    }
  }

  /**
   * Generate a weekly study plan from courses and preferences.
   */
  async generateWeeklyPlan(input: GenerateWeeklyPlanInput): Promise<GeneratedWeeklyPlan> {
    const prompt = buildWeeklyPlanPrompt(input);
    const raw = await this.chat([
      { role: 'system', content: SYSTEM_PROMPT_JSON },
      { role: 'user', content: prompt },
    ]);
    return parseJsonResponse<GeneratedWeeklyPlan>(raw, {
      summary: '',
      slots: [],
      suggestions: [],
    });
  }

  /**
   * Generate a weekly report with AI insights from sessions and targets.
   */
  async generateWeeklyReport(input: GenerateWeeklyReportInput): Promise<GeneratedWeeklyReport> {
    const prompt = buildWeeklyReportPrompt(input);
    const raw = await this.chat([
      { role: 'system', content: SYSTEM_PROMPT_JSON },
      { role: 'user', content: prompt },
    ]);
    return parseJsonResponse<GeneratedWeeklyReport>(raw, {
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
      totalHours: 0,
      targetHours: 0,
      completionRate: 0,
      courseBreakdown: [],
      insights: [],
    });
  }

  /**
   * Analyze study patterns from sessions and optional schedule.
   */
  async analyzeStudyPatterns(input: AnalyzeStudyPatternsInput): Promise<StudyPatternAnalysis> {
    const prompt = buildStudyPatternsPrompt(input);
    const raw = await this.chat([
      { role: 'system', content: SYSTEM_PROMPT_JSON },
      { role: 'user', content: prompt },
    ]);
    return parseJsonResponse<StudyPatternAnalysis>(raw, {
      workloadBalance: 'good',
      focusAreas: [],
      suggestions: [],
      potentialConflicts: [],
    });
  }

  private async chat(messages: ChatMessage[]): Promise<string> {
    switch (this.provider) {
      case 'openai':
        return this.chatOpenAI(messages);
      case 'anthropic':
        return this.chatAnthropic(messages);
      case 'gemini':
        return this.chatGemini(messages);
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  private async chatOpenAI(messages: ChatMessage[]): Promise<string> {
    if (!this.openaiClient) throw new Error('OpenAI client not initialized');
    const response = await this.openaiClient.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      temperature: 0.3,
    });
    const content = response.choices[0]?.message?.content;
    if (content == null) throw new Error('Empty response from OpenAI');
    return content;
  }

  private async chatAnthropic(messages: ChatMessage[]): Promise<string> {
    const system = messages.find((m) => m.role === 'system')?.content ?? '';
    const chatMessages = messages.filter((m) => m.role !== 'system');
    const body = {
      model: this.model,
      max_tokens: 4096,
      system: system || undefined,
      messages: chatMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    };
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error: ${res.status} ${err}`);
    }
    const data = await res.json();
    const text = data.content?.find((c: { type: string }) => c.type === 'text')?.text;
    if (text == null) throw new Error('Empty response from Anthropic');
    return text;
  }

  private async chatGemini(messages: ChatMessage[]): Promise<string> {
    const system = messages.find((m) => m.role === 'system')?.content ?? '';
    const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content);
    const userText = userMessages.length > 0 ? userMessages.join('\n\n') : '';
    const fullText = system ? `${system}\n\n${userText}` : userText;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: fullText }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error: ${res.status} ${err}`);
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text == null) throw new Error('Empty response from Gemini');
    return text;
  }
}

const SYSTEM_PROMPT_JSON =
  'You are a helpful study planner. Always respond with valid JSON only, no markdown code fences or extra text.';

function buildWeeklyPlanPrompt(input: GenerateWeeklyPlanInput): string {
  return `Generate a weekly study plan as JSON with keys: summary (string), slots (array of { courseId, day, startTime, endTime, type } where type is one of: lecture, lab, tutorial, study, break), suggestions (array of strings).

Input:
- Courses: ${JSON.stringify(input.courses)}
- Preferences: ${JSON.stringify(input.preferences)}
- Week: ${input.weekStart} to ${input.weekEnd}

Return only the JSON object.`;
}

function buildWeeklyReportPrompt(input: GenerateWeeklyReportInput): string {
  return `Generate a weekly report as JSON with keys: weekStart, weekEnd, totalHours, targetHours, completionRate, courseBreakdown (array of { courseId, hours, targetHours }), insights (array of strings), and optional aiSummary (string).

Input:
- Sessions: ${JSON.stringify(input.sessions)}
- Course targets (hours per week): ${JSON.stringify(input.courseTargets)}
- Week: ${input.weekStart} to ${input.weekEnd}

Return only the JSON object.`;
}

function buildStudyPatternsPrompt(input: AnalyzeStudyPatternsInput): string {
  return `Analyze study patterns and return JSON with keys: workloadBalance ("good"|"heavy"|"light"), focusAreas (array of { courseId, recommendedHours, difficulty }), suggestions (array of strings), potentialConflicts (array of { type, description, suggestion }), optional patternDescription (string), optional bestStudyTimes (array of strings).

Input:
- Sessions: ${JSON.stringify(input.sessions)}
- Schedule: ${input.schedule ? JSON.stringify(input.schedule) : 'none'}
- Courses: ${JSON.stringify(input.courses)}

Return only the JSON object.`;
}

function parseJsonResponse<T>(raw: string, fallback: T): T {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  try {
    const parsed = JSON.parse(trimmed) as T;
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}
