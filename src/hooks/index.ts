import { useCallback, useEffect, useState } from 'react';
import type { Project, StandupLog } from '../models';
import {
  getProjects,
  getProjectById,
} from '../services/projects.service';
import {
  getStandupLogs,
  getStandupLogsByProject,
} from '../services/logs.service';

// ---------------------------------------------------------------------------
// useProjects
// ---------------------------------------------------------------------------

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { projects, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// useProject (single)
// ---------------------------------------------------------------------------

export function useProject(id: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectById(id);
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { project, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// useStandupLogs
// ---------------------------------------------------------------------------

export function useStandupLogs(projectId?: string) {
  const [logs, setLogs] = useState<StandupLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = projectId
        ? await getStandupLogsByProject(projectId)
        : await getStandupLogs();
      setLogs(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load standup logs'
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { logs, loading, error, refresh };
}
