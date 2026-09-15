import type {
  CreateStandupLogInput,
  StandupLog,
  StandupStructure,
} from '../models';
import { generateId, isToday } from '../utils';
import { getItem, setItem, STORAGE_KEYS } from './storage';

const EMPTY_STRUCTURE: StandupStructure = {
  done: [],
  doing: [],
  blockers: [],
};

async function readLogs(): Promise<StandupLog[]> {
  return (await getItem<StandupLog[]>(STORAGE_KEYS.STANDUP_LOGS)) ?? [];
}

async function writeLogs(logs: StandupLog[]): Promise<boolean> {
  return setItem(STORAGE_KEYS.STANDUP_LOGS, logs);
}

/** Fetches all standup logs sorted by creation date descending. */
export async function getStandupLogs(): Promise<StandupLog[]> {
  const logs = await readLogs();
  return logs.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Finds a single standup log by ID. */
export async function getStandupLogById(
  id: string
): Promise<StandupLog | null> {
  const logs = await readLogs();
  return logs.find((l) => l.id === id) ?? null;
}

/** Fetches all standup logs belonging to a specific project. */
export async function getStandupLogsByProject(
  projectId: string
): Promise<StandupLog[]> {
  const logs = await readLogs();
  return logs
    .filter((l) => l.projectId === projectId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

/** Finds today's standup log for a given project if it exists. */
export async function getTodaysLog(
  projectId: string
): Promise<StandupLog | null> {
  return getLogByProjectAndDate(projectId, new Date());
}

/** Finds a standup log for a given project on a specific calendar date. */
export async function getLogByProjectAndDate(
  projectId: string,
  targetDate: Date | string
): Promise<StandupLog | null> {
  const targetStr =
    targetDate instanceof Date
      ? targetDate.toISOString().slice(0, 10)
      : new Date(targetDate).toISOString().slice(0, 10);

  const logs = await readLogs();
  return (
    logs.find(
      (l) =>
        l.projectId === projectId &&
        new Date(l.createdAt).toISOString().slice(0, 10) === targetStr
    ) ?? null
  );
}

/** Persists a raw standup dump. If a log exists for that project on that day, appends to it. */
export async function createStandupLog(
  input: CreateStandupLogInput
): Promise<StandupLog> {
  const targetDate = input.date ? new Date(input.date) : new Date();
  const existing = await getLogByProjectAndDate(input.projectId, targetDate);

  if (existing) {
    const mergedRawDump = `${existing.rawDump.trim()}\n\n---\n\n${input.rawDump.trim()}`;
    const updated = await updateStandupLog(existing.id, {
      rawDump: mergedRawDump,
    });
    return updated || existing;
  }

  const newLog: StandupLog = {
    id: generateId(),
    projectId: input.projectId,
    rawDump: input.rawDump,
    structured: EMPTY_STRUCTURE,
    singlishPitch: '',
    createdAt: targetDate.toISOString(),
  };

  const logs = await readLogs();
  logs.push(newLog);
  await writeLogs(logs);
  return newLog;
}

/** Updates an existing standup log with AI results or manual edits. */
export async function updateStandupLog(
  id: string,
  updates: Partial<Omit<StandupLog, 'id' | 'createdAt'>>
): Promise<StandupLog | null> {
  const logs = await readLogs();
  const index = logs.findIndex((l) => l.id === id);
  if (index === -1) return null;

  logs[index] = {
    ...logs[index],
    ...updates,
  };
  await writeLogs(logs);
  return logs[index];
}

/** Deletes a standup log by ID. */
export async function deleteStandupLog(id: string): Promise<boolean> {
  const logs = await readLogs();
  const filtered = logs.filter((l) => l.id !== id);
  if (filtered.length === logs.length) return false;
  return writeLogs(filtered);
}

/** Deletes all standup logs linked to a project. Returns count of removed logs. */
export async function deleteStandupLogsByProject(
  projectId: string
): Promise<number> {
  const logs = await readLogs();
  const remaining = logs.filter((l) => l.projectId !== projectId);
  const deletedCount = logs.length - remaining.length;
  if (deletedCount > 0) {
    await writeLogs(remaining);
  }
  return deletedCount;
}
