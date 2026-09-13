import type {
  ProjectFeature,
  StandupStructure,
  TechStack,
} from '../models';

/** Configuration options for the Gemini API client. */
export interface GeminiConfig {
  apiKey?: string;
  model?: string;
}

/** Project context metadata to improve Gemini standup accuracy. */
export interface ProjectContext {
  name: string;
  techStack?: TechStack;
  features?: ProjectFeature[];
}

/** Payload sent to transform a raw standup dump. */
export interface TransformDumpRequest {
  rawDump: string;
  projectName?: string;
  techStack?: TechStack;
  features?: ProjectFeature[];
  projectContext?: ProjectContext;
  userName?: string;
}

/** Structured bullets and speaking script returned from transformation. */
export interface TransformDumpResponse {
  structured: StandupStructure;
  singlishPitch: string;
}

const SYSTEM_PROMPT = `
You are DevLog AI, an expert engineering standup assistant.
Transform the developer's raw evening work dump into:
1. Structured standup bullets categorized into "done", "doing", and "blockers".
2. A natural, respectful conversational Singlish speaking script for morning Daily Scrum Meeting (DSM) sync with their engineering lead or manager ("Ayya" / "Boss").

Singlish Guidelines:
- Use natural colloquial Sri Lankan English / Singlish phrasing spoken by Lankan tech devs (use Sinhala words transliterated in English script, e.g., "Good morning Ayya", "Ada mama baluwe...", "Eka shape karaganna puluwan una", "Podda issue ekak thiyenawa", "Eka nisa", "Balanna one").
- Keep it respectful, concise, clear, and confident for a morning standup.
- Mention blockers clearly if any, or state "blockers mukuth na Ayya" if none.

Strict Output Format:
You must respond with ONLY valid JSON adhering strictly to this schema:
{
  "structured": {
    "done": ["bullet 1", "bullet 2"],
    "doing": ["bullet 1", "bullet 2"],
    "blockers": ["blocker 1"]
  },
  "singlishPitch": "Natural conversational morning DSM script for Boss(use sinhala words but in english letters)"
}
`;

/** Calls Gemini generateContent with given model, with fallback handling. */
async function callGemini(
  model: string,
  apiKey: string,
  userPrompt: string
): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    }),
  });
}

/** Generates structured standup bullets and Singlish pitch via Gemini API. */
export async function generateStandup(
  rawDump: string,
  projectContext?: ProjectContext,
  config?: GeminiConfig
): Promise<TransformDumpResponse> {
  const apiKey =
    config?.apiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

  if (!apiKey) {
    throw new Error(
      'Gemini API key is not configured. Please set EXPO_PUBLIC_GEMINI_API_KEY.'
    );
  }

  // Format context for the prompt
  let contextDetails = '';
  if (projectContext?.name) {
    contextDetails += `Project Name: ${projectContext.name}\n`;
  }
  if (projectContext?.techStack) {
    const ts = projectContext.techStack;
    const parts: string[] = [];
    if (ts.frontend?.length) parts.push(`Frontend: ${ts.frontend.join(', ')}`);
    if (ts.backend?.length) parts.push(`Backend: ${ts.backend.join(', ')}`);
    if (ts.mobile?.length) parts.push(`Mobile: ${ts.mobile.join(', ')}`);
    if (ts.tools?.length) parts.push(`Tools: ${ts.tools.join(', ')}`);
    if (parts.length) {
      contextDetails += `Tech Stack: ${parts.join(' | ')}\n`;
    }
  }
  if (projectContext?.features?.length) {
    const activeFeatures = projectContext.features
      .filter((f) => f.status === 'in_progress')
      .map((f) => f.name);
    if (activeFeatures.length) {
      contextDetails += `Active Features in Progress: ${activeFeatures.join(', ')}\n`;
    }
  }

  const userPrompt = `${contextDetails ? `Context:\n${contextDetails}\n` : ''}Developer's Raw Work Dump:\n${rawDump.trim()}`;

  const primaryModel = config?.model || 'gemini-1.5-flash';
  const fallbackModel = 'gemini-3.6-flash';

  let response: Response;
  try {
    response = await callGemini(primaryModel, apiKey, userPrompt);

    // If 1.5-flash is not available for this key/version (e.g. 404), seamlessly fallback
    if (response.status === 404 && primaryModel !== fallbackModel) {
      response = await callGemini(fallbackModel, apiKey, userPrompt);
    }
  } catch (netErr) {
    throw new Error(
      `Network connection failed while calling Gemini API: ${netErr instanceof Error ? netErr.message : String(netErr)}`
    );
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || response.statusText;
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(`Gemini API error (${response.status}): ${errorDetail}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('Gemini API returned an empty response.');
  }

  try {
    const parsed = JSON.parse(rawText) as TransformDumpResponse;
    if (
      !parsed.structured ||
      !Array.isArray(parsed.structured.done) ||
      !Array.isArray(parsed.structured.doing) ||
      !Array.isArray(parsed.structured.blockers)
    ) {
      throw new Error('Unexpected JSON structure from Gemini.');
    }
    return {
      structured: {
        done: parsed.structured.done || [],
        doing: parsed.structured.doing || [],
        blockers: parsed.structured.blockers || [],
      },
      singlishPitch: parsed.singlishPitch || '',
    };
  } catch {
    // If strict JSON parsing failed, try extracting JSON substring
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      const recovered = JSON.parse(match[0]) as TransformDumpResponse;
      return {
        structured: {
          done: recovered.structured?.done || [],
          doing: recovered.structured?.doing || [],
          blockers: recovered.structured?.blockers || [],
        },
        singlishPitch: recovered.singlishPitch || '',
      };
    }
    throw new Error('Failed to parse structured standup from Gemini output.');
  }
}

/** Transforms a raw standup dump into structured bullets and a Singlish pitch. */
export async function transformRawDump(
  request: TransformDumpRequest,
  config?: GeminiConfig
): Promise<TransformDumpResponse> {
  const context: ProjectContext | undefined = request.projectContext || {
    name: request.projectName || '',
    techStack: request.techStack,
    features: request.features,
  };

  return generateStandup(request.rawDump, context, config);
}
