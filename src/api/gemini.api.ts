import type {
  ProjectFeature,
  StandupStructure,
  TechStack,
} from '../models';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface GeminiConfig {
  apiKey?: string;
  model?: string;
}

// ---------------------------------------------------------------------------
// Transform raw dump → structured standup + Singlish pitch
// ---------------------------------------------------------------------------

export interface TransformDumpRequest {
  /** User's unstructured evening brain dump */
  rawDump: string;
  /** Project name for context */
  projectName: string;
  /** Project's categorised tech stack for accurate terminology */
  techStack: TechStack;
  /** Current feature list so AI understands what the user is working on */
  features: ProjectFeature[];
  /** Optional user name for personalised Singlish script */
  userName?: string;
}

export interface TransformDumpResponse {
  /** Structured standup bullets (Done / Doing / Blockers) */
  structured: StandupStructure;
  /** Natural, respectful Singlish speaking script for morning DSM */
  singlishPitch: string;
}

/**
 * Placeholder: transforms a raw evening dump into structured standup bullets
 * and a Singlish speaking script using the Gemini API.
 *
 * In production this will call the Gemini REST endpoint with a system prompt
 * that instructs the model to:
 *   1. Parse the raw dump into Done / Doing / Blockers bullets.
 *   2. Generate a natural, respectful Singlish talking script for morning DSM.
 *   3. Use the project context (tech stack, features) for accurate terminology.
 */
export async function transformRawDump(
  request: TransformDumpRequest,
  _config?: GeminiConfig
): Promise<TransformDumpResponse> {
  // Placeholder — returns mock data so the app is testable before Gemini wiring
  const lines = request.rawDump
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const structured: StandupStructure = {
    done: lines.length > 0 ? [lines[0]] : ['(nothing parsed yet)'],
    doing: lines.length > 1 ? [lines[1]] : ['(nothing parsed yet)'],
    blockers: lines.length > 2 ? [lines[2]] : [],
  };

  const singlishPitch = [
    `Morning ah${request.userName ? `, I'm ${request.userName}` : ''}.`,
    `Yesterday I was working on ${request.projectName}.`,
    structured.done.length > 0
      ? `Done side — ${structured.done.join(', ')}.`
      : '',
    structured.doing.length > 0
      ? `Today I'm going to continue with ${structured.doing.join(', ')}.`
      : '',
    structured.blockers.length > 0
      ? `One blocker — ${structured.blockers.join(', ')}.`
      : 'No blockers for now.',
    "That's all from me.",
  ]
    .filter(Boolean)
    .join(' ');

  return { structured, singlishPitch };
}
