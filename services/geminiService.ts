// Client-side service — calls your serverless /api/genai endpoint.
// Keeps function signatures used by your components.
import { Job, JobMatchResult, ResumeData, AIAdviceResponse } from '../types';

async function callGenAI(action: string, payload: any) {
  const resp = await fetch('/api/genai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`GenAI API error (${resp.status}): ${errText}`);
  }
  return resp.json();
}

export const getCareerAdvice = async (background: string, interests: string): Promise<string> => {
  const r = await callGenAI('careerAdvice', { background, interests });
  return r?.text ?? 'Sorry, I could not generate advice at this time.';
};

export const matchJobsToUser = async (userProfile: { background: string; interests: string }, jobs: Job[]): Promise<JobMatchResult[]> => {
  const r = await callGenAI('matchJobs', { userProfile, jobs });
  return r.matches ?? [];
};

export const optimizeResumeContent = async (data: ResumeData): Promise<{ experience: string; skills: string }> => {
  const r = await callGenAI('optimizeResume', { data });
  return { experience: r.experience ?? data.experience, skills: r.skills ?? data.skills };
};

export const getInterviewFeedback = async (history: any[], lastAnswer: string, industry: string): Promise<{ question: string; feedback: string }> => {
  const r = await callGenAI('interviewFeedback', { history, lastAnswer, industry });
  return { question: r.question ?? '...', feedback: r.feedback ?? '' };
};

export const analyzeAptitude = async (answers: string[]): Promise<string> => {
  const r = await callGenAI('analyzeAptitude', { answers });
  return r.text ?? '';
};

export const searchActiveGrants = async (query = ''): Promise<{ text: string; citations?: any[] } | null> => {
  const r = await callGenAI('searchGrants', { query });
  return r ?? null;
};

export const analyzeStartupPitch = async (idea: any): Promise<AIAdviceResponse> => {
  const r = await callGenAI('analyzeStartupPitch', { idea });
  return r;
};
