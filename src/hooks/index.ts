import { useState } from 'react';
import type { DevLogItem } from '../services/logs.service';

export function useLogs() {
  const [logs, setLogs] = useState<DevLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  return { logs, setLogs, loading, setLoading };
}
