/** Structured standup output from AI transformation */
export interface StandupStructure {
  done: string[];
  doing: string[];
  blockers: string[];
}

/** Input type for creating a new standup log (phase 1 — raw dump only) */
export interface CreateStandupLogInput {
  projectId: string;
  rawDump: string;
}

/** A single standup log entry tied to a project */
export interface StandupLog {
  id: string;
  projectId: string;
  /** User's unstructured evening brain dump */
  rawDump: string;
  /** AI-generated structured bullets (empty until phase 2) */
  structured: StandupStructure;
  /** AI-generated Singlish speaking script (empty until phase 2) */
  singlishPitch: string;
  createdAt: string;
}
