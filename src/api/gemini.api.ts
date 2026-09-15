import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ProjectFeature,
  StandupStructure,
  TechStack,
} from '../models';
import { STORAGE_KEYS } from '../services/storage';

/** Configuration options for the AI client. */
export interface GeminiConfig {
  apiKey?: string;
  model?: string;
}

/** Project context metadata to improve standup compilation accuracy. */
export interface ProjectContext {
  name: string;
  description?: string;
  techStack?: TechStack;
  features?: ProjectFeature[];
}

/** Payload sent to transform a raw standup dump. */
export interface TransformDumpRequest {
  rawDump: string;
  projectName?: string;
  projectDescription?: string;
  techStack?: TechStack;
  features?: ProjectFeature[];
  projectContext?: ProjectContext;
  userName?: string;
}

/** Structured bullets and speaking script returned from compilation. */
export interface TransformDumpResponse {
  structured: StandupStructure;
  singlishPitch: string;
}

export const GEMINI_API_KEY_STORAGE_KEY = STORAGE_KEYS.GEMINI_API_KEY;
export const SELECTED_MODEL_STORAGE_KEY = STORAGE_KEYS.SELECTED_MODEL;

const SYSTEM_PROMPT = `
You are DevLog AI, an elite engineering standup compiler designed for Sri Lankan tech developers.
Your job is to transform raw daily work notes into:
1. Structured standup bullets categorized into "done", "doing", and "blockers".
2. An authentic, natural, respectful conversational Singlish speaking script tailored for a morning Daily Scrum Meeting (DSM) sync with a senior tech lead ("Ayya").

Tone, Persona & Sri Lankan Tech Culture:
- Role: An authentic software engineering intern or junior developer in a Colombo tech company speaking respectfully to their senior tech lead ("Ayya").
- Script Structure (4 concise beats):
  1. Respectful, warm greeting: Start naturally with "Morning Ayya" or "Good morning Ayya".
  2. Done yesterday: State what was completed, debugged, tested, or merged.
  3. Today's focus: State what tickets, PRs, or features will be worked on ("Ada mama baluwe... eka thamai ada allanne").
  4. Blockers & Reviews: Mention blockers or PR review requests clearly and politely ("Poddak hira una...", "PR eka poddak balala feedback ekak denna puluwanda", or "Blockers mukuth na Ayya").

Language & Phrasing Rules:
- ALL engineering, code, framework, and tooling terms MUST remain in standard English: PR, Crashlytics, build, interceptor, endpoint, token, branch, merge, unit tests, refactor, staging, cache, DB migration, deployment, CI/CD.
- Connectors and conversational phrasing must use natural Singlish particles as spoken by Colombo developers:
  - "shape karaganna puluwan una" (managed to handle it)
  - "eka thamai ada allanne" (that's what I'm tackling today)
  - "poddak hira una" (got stuck a bit)
  - "check karala balanna puluwanda" (could you take a look)
  - "ada target eka" (today's target is)
  - "blockers mukuth na Ayya" (no blockers)
- STRICTLY PROHIBIT robotic greetings ("Hello sir", "I am pleased to report") or broken English. It must sound like a real human software engineer speaking in daily standup.

Strict Output Format:
Respond ONLY with valid JSON adhering strictly to this schema:
{
  "structured": {
    "done": ["bullet 1", "bullet 2"],
    "doing": ["bullet 1", "bullet 2"],
    "blockers": ["blocker 1"]
  },
  "singlishPitch": "Morning Ayya. Yesterday mama... Ada mama baluwe... Blockers mukuth na Ayya."
}
`;

const MASTER_STANDUP_PROMPT = `
You are DevLog AI. Synthesize multiple project logs from a developer's day into ONE cohesive morning Daily Scrum Meeting (DSM) Singlish speaking script for their senior tech lead ("Ayya").

Tone: Authentic Sri Lankan developer speaking respectfully to tech lead Ayya.
Structure:
1. Warm greeting ("Morning Ayya").
2. Combined summary of what was completed across all active projects.
3. Unified plan for today across all projects ("Ada mama baluwe...").
4. Blockers or review requests for Ayya.

Language: Technical terms in standard English (PR, endpoint, build, test, refactor, release), connectors in natural Singlish ("shape una", "allanawa", "poddak").

Strict Output Format:
Respond ONLY with valid JSON adhering strictly to this schema:
{
  "structured": {
    "done": ["bullet 1", "bullet 2"],
    "doing": ["bullet 1", "bullet 2"],
    "blockers": []
  },
  "singlishPitch": "Morning Ayya. Yesterday projects deke wada tika shape... Ada mama..."
}
`;

/** Default candidate endpoints to fallback through if custom model is unavailable. */
const DEFAULT_CANDIDATE_ENDPOINTS = [
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
];

/** Resolves active candidate endpoints, prioritizing the user's selected model. */
async function getCandidateEndpoints(): Promise<string[]> {
  const selectedModel = await AsyncStorage.getItem(SELECTED_MODEL_STORAGE_KEY).catch(() => null);
  if (selectedModel && selectedModel.trim()) {
    const cleanModel = selectedModel.trim().replace(/^models\//, '');
    const userEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent`;
    return [userEndpoint, ...DEFAULT_CANDIDATE_ENDPOINTS.filter((e) => !e.includes(cleanModel))];
  }
  return DEFAULT_CANDIDATE_ENDPOINTS;
}

/** Fetches available models from Google API supporting generateContent. */
export async function fetchAvailableModels(apiKey: string): Promise<string[]> {
  const sanitized = apiKey.replace(/^["']|["']$/g, '').trim();
  if (!sanitized) return [];

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${sanitized}`
    );
    if (!res.ok) return ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.6-flash'];

    const data = await res.json();
    if (!Array.isArray(data.models)) {
      return ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.6-flash'];
    }

    const models = data.models
      .filter((m: { supportedGenerationMethods?: string[]; name?: string }) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent') &&
        (m.name?.includes('flash') || m.name?.includes('pro'))
      )
      .map((m: { name: string }) => m.name.replace(/^models\//, ''));

    return models.length > 0 ? models : ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.6-flash'];
  } catch (err) {
    console.warn('[ai] Failed to fetch models:', err);
    return ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.6-flash'];
  }
}

/** Resolves the API key from explicit config, AsyncStorage, or environment. */
export async function getActiveApiKey(explicitKey?: string): Promise<string> {
  if (explicitKey && explicitKey.trim()) {
    return explicitKey.replace(/^["']|["']$/g, '').trim();
  }

  try {
    const stored = await AsyncStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
    if (stored && stored.trim()) {
      return stored.replace(/^["']|["']$/g, '').trim();
    }
  } catch (err) {
    console.warn('[ai] Failed to read API key from AsyncStorage:', err);
  }

  const envKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (envKey && envKey.trim()) {
    return envKey.replace(/^["']|["']$/g, '').trim();
  }

  throw new Error(
    'API key is not configured. Please save your API key in Settings or configure EXPO_PUBLIC_GEMINI_API_KEY.'
  );
}

/** Lightweight test ping to verify an API key with candidate fallback. */
export async function testGeminiApiKey(
  apiKey: string
): Promise<{ ok: boolean; message: string }> {
  const sanitized = apiKey.replace(/^["']|["']$/g, '').trim();
  if (!sanitized) {
    return { ok: false, message: 'API key cannot be empty.' };
  }

  const pingBody = JSON.stringify({
    contents: [
      {
        parts: [{ text: 'ping' }],
      },
    ],
  });

  const candidates = await getCandidateEndpoints();
  let lastErrorMessage = 'Failed to connect to AI API.';

  for (const endpoint of candidates) {
    try {
      const response = await fetch(`${endpoint}?key=${sanitized}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: pingBody,
      });

      if (response.ok) {
        const modelName = endpoint.split('models/')[1]?.split(':')[0] || 'AI model';
        return { ok: true, message: `Connection successful (200 OK via ${modelName})` };
      }

      if (response.status === 404) {
        continue;
      }

      const errJson = await response.json().catch(() => null);
      lastErrorMessage =
        errJson?.error?.message ||
        `HTTP ${response.status}: ${response.statusText}`;
      return { ok: false, message: lastErrorMessage };
    } catch (err) {
      lastErrorMessage =
        err instanceof Error
          ? err.message
          : 'Network error connecting to AI API';
    }
  }

  return { ok: false, message: lastErrorMessage };
}

/** Calls AI generateContent across candidate endpoints with automatic fallback. */
async function callAI(
  apiKey: string,
  userPrompt: string,
  systemPrompt: string = SYSTEM_PROMPT
): Promise<Response> {
  const requestBody = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    },
  });

  const candidates = await getCandidateEndpoints();
  let lastResponse: Response | null = null;

  for (const endpoint of candidates) {
    try {
      const response = await fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      if (response.ok) {
        return response;
      }

      lastResponse = response;

      if (response.status === 404) {
        continue;
      }

      return response;
    } catch (err) {
      if (!lastResponse) {
        lastResponse = new Response(null, {
          status: 500,
          statusText:
            err instanceof Error ? err.message : 'Network error occurred',
        });
      }
    }
  }

  return (
    lastResponse ||
    new Response(null, {
      status: 500,
      statusText: 'All AI candidate endpoints failed',
    })
  );
}

/** Generates structured standup bullets and Singlish pitch via AI API. */
export async function generateStandup(
  rawDump: string,
  projectContext?: ProjectContext,
  config?: GeminiConfig
): Promise<TransformDumpResponse> {
  const apiKey = await getActiveApiKey(config?.apiKey);

  let contextDetails = '';
  if (projectContext?.name) {
    contextDetails += `Project Name: ${projectContext.name}\n`;
  }
  if (projectContext?.description) {
    contextDetails += `Project Description: ${projectContext.description}\n`;
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

  let response: Response;
  try {
    response = await callAI(apiKey, userPrompt);
  } catch (netErr) {
    throw new Error(
      `Network connection failed while calling AI API: ${netErr instanceof Error ? netErr.message : String(netErr)}`
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
    throw new Error(`AI compilation error (${response.status}): ${errorDetail}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('AI returned an empty response.');
  }

  try {
    const parsed = JSON.parse(rawText) as TransformDumpResponse;
    return {
      structured: {
        done: parsed.structured?.done || [],
        doing: parsed.structured?.doing || [],
        blockers: parsed.structured?.blockers || [],
      },
      singlishPitch: parsed.singlishPitch || '',
    };
  } catch {
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
    throw new Error('Failed to parse structured standup from AI output.');
  }
}

/** Generates a unified master standup pitch compiling multiple projects for Ayya. */
export async function generateMasterStandup(
  projectDumps: Array<{
    projectName: string;
    rawDump: string;
    structured?: StandupStructure;
  }>,
  explicitApiKey?: string
): Promise<{ masterPitch: string; combinedStructured: StandupStructure }> {
  const apiKey = await getActiveApiKey(explicitApiKey);

  const combinedDone: string[] = [];
  const combinedDoing: string[] = [];
  const combinedBlockers: string[] = [];

  let promptContext = 'Summary of Today\'s Projects & Work:\n\n';
  projectDumps.forEach((p, idx) => {
    promptContext += `Project ${idx + 1}: ${p.projectName}\nRaw Notes:\n${p.rawDump.trim()}\n\n`;
    if (p.structured) {
      combinedDone.push(...(p.structured.done || []));
      combinedDoing.push(...(p.structured.doing || []));
      combinedBlockers.push(...(p.structured.blockers || []));
    }
  });

  promptContext += 'Please compile a single unified morning DSM Singlish pitch for Ayya covering all these projects.';

  const response = await callAI(apiKey, promptContext, MASTER_STANDUP_PROMPT);

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || response.statusText;
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(`Master standup compilation error (${response.status}): ${errorDetail}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('AI returned an empty response for master standup.');
  }

  try {
    const parsed = JSON.parse(rawText);
    return {
      masterPitch: parsed.singlishPitch || '',
      combinedStructured: {
        done: parsed.structured?.done?.length ? parsed.structured.done : combinedDone,
        doing: parsed.structured?.doing?.length ? parsed.structured.doing : combinedDoing,
        blockers: parsed.structured?.blockers?.length ? parsed.structured.blockers : combinedBlockers,
      },
    };
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      const recovered = JSON.parse(match[0]);
      return {
        masterPitch: recovered.singlishPitch || '',
        combinedStructured: {
          done: recovered.structured?.done?.length ? recovered.structured.done : combinedDone,
          doing: recovered.structured?.doing?.length ? recovered.structured.doing : combinedDoing,
          blockers: recovered.structured?.blockers?.length ? recovered.structured.blockers : combinedBlockers,
        },
      };
    }
    throw new Error('Failed to parse master standup output.');
  }
}

/** Transforms a raw standup dump into structured bullets and a Singlish pitch. */
export async function transformRawDump(
  request: TransformDumpRequest,
  config?: GeminiConfig
): Promise<TransformDumpResponse> {
  const context: ProjectContext | undefined = request.projectContext || {
    name: request.projectName || '',
    description: request.projectDescription,
    techStack: request.techStack,
    features: request.features,
  };

  return generateStandup(request.rawDump, context, config);
}
