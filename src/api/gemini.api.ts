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

/** Payload sent to transform a raw standup dump. */
export interface TransformDumpRequest {
  rawDump: string;
  projectName: string;
  techStack: TechStack;
  features: ProjectFeature[];
  userName?: string;
}

/** Structured bullets and speaking script returned from transformation. */
export interface TransformDumpResponse {
  structured: StandupStructure;
  singlishPitch: string;
}

/** Transforms a raw standup dump into structured bullets and a Singlish pitch. */
export async function transformRawDump(
  request: TransformDumpRequest,
  _config?: GeminiConfig
): Promise<TransformDumpResponse> {
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
