
import { GoogleGenAI, Type } from "@google/genai";
import { AIAdviceResponse, StartupIdea, ResumeData, Job, JobMatchResult } from "../types";

// Helper to create a fresh AI instance using the environment API key directly
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getCareerAdvice = async (background: string, interests: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `As a professional career coach specializing in the Zimbabwean economy, analyze this user profile: 
    Background: ${background}
    Interests: ${interests}
    
    Provide a concise roadmap for success in Zimbabwe. Suggest 3 specific high-demand vocational or digital skills and 2 potential business opportunities they should consider. Focus on practicality and the local market context (NEET reduction).`,
  });
  return response.text || "Sorry, I couldn't generate advice at this moment.";
};

export const matchJobsToUser = async (userProfile: { background: string; interests: string }, jobs: Job[]): Promise<JobMatchResult[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a specialist HR recruiter in Zimbabwe. Match this user profile to the available jobs.
    User Profile: Background: ${userProfile.background}, Interests: ${userProfile.interests}
    Available Jobs: ${JSON.stringify(jobs.map(j => ({ id: j.id, title: j.title, category: j.category, requirements: j.requirements })))}
    
    Return a JSON array of match results. For each match, provide a score from 0-100 and a 1-sentence reason why it's a good fit.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            jobId: { type: Type.STRING },
            matchScore: { type: Type.NUMBER },
            reason: { type: Type.STRING }
          },
          required: ["jobId", "matchScore", "reason"]
        }
      }
    }
  });
  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
};

export const optimizeResumeContent = async (data: ResumeData): Promise<{ experience: string; skills: string }> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a professional CV writer in Zimbabwe. Optimize the following resume details for a "${data.targetRole}" position. 
    Experience: ${data.experience}
    Skills: ${data.skills}
    
    Make the experience descriptions sound more professional and highlight transferable skills relevant to the Zimbabwean SME and Corporate sector. Use action verbs.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          experience: { type: Type.STRING },
          skills: { type: Type.STRING }
        },
        required: ["experience", "skills"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const getInterviewFeedback = async (history: any[], lastAnswer: string, industry: string): Promise<{ question: string; feedback: string }> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `You are a hiring manager at a leading firm in Zimbabwe in the ${industry} sector. 
    Interview History: ${JSON.stringify(history)}
    Candidate's Last Answer: ${lastAnswer}
    
    Evaluate the last answer briefly and then ask the NEXT logical interview question. 
    Focus on local context, professional etiquette, and sector-specific knowledge.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          feedback: { type: Type.STRING, description: "Critique of the last answer" },
          question: { type: Type.STRING, description: "The next interview question" }
        },
        required: ["feedback", "question"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const analyzeAptitude = async (answers: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Analyze these career aptitude answers: ${answers}. 
    Map these interests and traits to the top 3 high-growth career paths currently available in Zimbabwe (e.g., Solar Installation, Agri-Export, Fintech, Mining). 
    For each, explain WHY it fits the user and what local certification they should pursue.`,
  });
  return response.text || "Analysis failed.";
};

export const searchActiveGrants = async () => {
  const ai = getAI();
  const today = new Date().toISOString().split('T')[0];
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Search for currently active business, education, or agribusiness grants specifically for Zimbabweans where the application deadline is AFTER ${today}. 
    Provide a list of at least 4-5 such grants. 
    For each grant, include:
    1. Grant Name
    2. Organization
    3. Precise Deadline (e.g., June 30, 2025)
    4. Brief 2-sentence description of eligibility and focus.
    
    Ensure all listed grants are real and the deadlines have NOT passed yet.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text || "No active grants found via real-time search.";
  const citations = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  return { text, citations };
};

export const analyzeStartupPitch = async (idea: StartupIdea): Promise<AIAdviceResponse> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `You are an experienced Zimbabwean startup investor. Analyze the following business idea:
    Title: ${idea.title}
    Industry: ${idea.industry}
    Problem: ${idea.problem}
    Solution: ${idea.solution}
    Market: ${idea.targetMarket}
    
    Provide your analysis in JSON format focusing on the Zimbabwean context.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: { type: Type.STRING, description: "SWOT analysis of the idea" },
          nextSteps: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "3 actionable next steps for the founder"
          },
          suggestedCourses: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Related skills to learn"
          },
          marketReadiness: { type: Type.NUMBER, description: "Score from 1 to 100" }
        },
        required: ["analysis", "nextSteps", "suggestedCourses", "marketReadiness"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}") as AIAdviceResponse;
  } catch (error) {
    throw new Error("Failed to parse AI response");
  }
};
