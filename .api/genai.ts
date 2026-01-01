import { GoogleGenAI, Type } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel / serverless endpoint — adapts your existing client signatures to server-side GenAI usage.
// Requires GEMINI_API_KEY in server env.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { action, payload } = req.body || {};
    if (!action) return res.status(400).json({ error: 'Missing action' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const runGenerate = async (opts: any) => {
      const response = await ai.models.generateContent(opts);
      return { text: response.text ?? null, raw: response };
    };

    switch (action) {
      case 'careerAdvice': {
        const { background = '', interests = '' } = payload || {};
        const prompt = `As a professional career coach specializing in the Zimbabwean economy, analyze this user profile: 
Background: ${background}
Interests: ${interests}

Provide a concise roadmap for success in Zimbabwe. Suggest 3 specific high-demand vocational or digital skills and 2 potential business opportunities they should consider. Focus on practicality and the local market context (NEET reduction).`;
        const result = await runGenerate({ model: 'gemini-3-flash-preview', contents: prompt });
        return res.status(200).json({ text: result.text });
      }

      case 'matchJobs': {
        const { userProfile, jobs } = payload || {};
        const contents = `You are a specialist HR recruiter in Zimbabwe. Match this user profile to the available jobs.
User Profile: Background: ${userProfile?.background}, Interests: ${userProfile?.interests}
Available Jobs: ${JSON.stringify(jobs?.map((j: any) => ({ id: j.id, title: j.title, category: j.category, requirements: j.requirements })))}

Return a JSON array of match results. For each match, provide a score from 0-100 and a 1-sentence reason why it's a good fit.`;
        const result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  jobId: { type: Type.STRING },
                  matchScore: { type: Type.NUMBER },
                  reason: { type: Type.STRING }
                },
                required: ['jobId', 'matchScore', 'reason']
              }
            }
          }
        });
        try {
          const parsed = JSON.parse(result.text || '[]');
          return res.status(200).json({ matches: parsed });
        } catch (e) {
          return res.status(200).json({ matches: [], raw: result });
        }
      }

      case 'optimizeResume': {
        const { data } = payload || {};
        const contents = `You are a professional CV writer in Zimbabwe. Optimize the following resume details for a "${data?.targetRole}" position. 
Experience: ${data?.experience}
Skills: ${data?.skills}

Make the experience descriptions sound more professional and highlight transferable skills relevant to the Zimbabwean SME and Corporate sector. Use action verbs.`;
        const result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                experience: { type: Type.STRING },
                skills: { type: Type.STRING }
              },
              required: ['experience', 'skills']
            }
          }
        });
        try {
          const parsed = JSON.parse(result.text || '{}');
          return res.status(200).json(parsed);
        } catch (e) {
          return res.status(200).json({ experience: result.text ?? '', skills: '' });
        }
      }

      case 'interviewFeedback': {
        const { history = [], lastAnswer = '', industry = '' } = payload || {};
        const contents = `You are a hiring manager at a leading firm in Zimbabwe in the ${industry} sector. 
Interview History: ${JSON.stringify(history)}
Last Answer: ${lastAnswer}

Provide the next interview question (short), and give succinct feedback on the lastAnswer (1-2 sentences). Respond as a JSON object with { question: string, feedback: string }`;
        const result = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                feedback: { type: Type.STRING }
              },
              required: ['question', 'feedback']
            }
          }
        });
        try {
          const parsed = JSON.parse(result.text || '{}');
          return res.status(200).json(parsed);
        } catch (e) {
          return res.status(200).json({ question: result.text ?? 'Could not generate question', feedback: '' });
        }
      }

      case 'analyzeAptitude': {
        const { answers = [] } = payload || {};
        const contents = `You are an aptitude assessor focused on the Zimbabwean vocational market. Assess these aptitude answers: ${JSON.stringify(answers)}. Give a short result (one paragraph) and recommend 2-3 suitable roles/paths.`;
        const result = await runGenerate({ model: 'gemini-3-flash-preview', contents });
        return res.status(200).json({ text: result.text });
      }

      case 'searchGrants': {
        const { query = '' } = payload || {};
        const contents = `You are an expert grants researcher. Given the query "${query}", produce a short summary of potential matching grants and 2 citations (title + url) where details can be found.`;
        const result = await runGenerate({ model: 'gemini-3-flash-preview', contents });
        return res.status(200).json({ text: result.text });
      }

      case 'analyzeStartupPitch': {
        const { idea } = payload || {};
        const contents = `You are an AI-Investor trained on the Zimbabwean economic landscape. Evaluate this startup idea and return JSON:
Idea: ${JSON.stringify(idea)}
Return schema: { score: number (0-100), strengths: string[], weaknesses: string[], suggestions: string[] }`;
        const result = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['score', 'strengths', 'weaknesses', 'suggestions']
            }
          }
        });
        try {
          const parsed = JSON.parse(result.text || '{}');
          return res.status(200).json(parsed);
        } catch (e) {
          return res.status(200).json({ raw: result });
        }
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err: any) {
    console.error('genai handler error', err);
    return res.status(500).json({ error: err?.message || 'Unknown server error', details: err });
  }
}
