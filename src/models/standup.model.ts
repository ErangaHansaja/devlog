/** Structured standup bullets parsed by AI. */
export interface StandupStructure {
  done: string[];
  doing: string[];
  blockers: string[];
}

/** Payload for creating a new standup log entry. */
export interface CreateStandupLogInput {
  projectId: string;
  rawDump: string;
  date?: string;
}

/** Daily standup log record associated with a project. */
export interface StandupLog {
  id: string;
  projectId: string;
  rawDump: string;
  structured: StandupStructure;
  singlishPitch: string;
  createdAt: string;
}
