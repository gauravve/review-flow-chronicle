import { useEffect, useMemo, useState } from 'react';

export type BuildState = 'success' | 'failure' | 'pending';

type Params = {
  owner: string;
  repo: string;
  token?: string;
  prs: Array<{ number: number; head?: { sha?: string } }>; // minimal shape from GitHub PRs
};

// Fetch overall build status (Checks API first, then legacy Statuses API)
async function fetchCombinedStatus(owner: string, repo: string, sha: string, token?: string): Promise<BuildState | undefined> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // 1) Try GitHub Checks API (modern CI like GitHub Actions)
  try {
    const crUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/check-runs`;
    const crRes = await fetch(crUrl, { headers });
    if (crRes.ok) {
      const crData = await crRes.json();
      const runs = Array.isArray(crData?.check_runs) ? crData.check_runs : [];
      if (crData?.total_count > 0 && runs.length > 0) {
        const anyNotCompleted = runs.some((r: any) => r?.status !== 'completed');
        if (anyNotCompleted) return 'pending';
        const conclusions = runs.map((r: any) => r?.conclusion).filter(Boolean) as string[];
        const failingSet = new Set(['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure']);
        if (conclusions.some((c) => failingSet.has(c))) return 'failure';
        // Treat success/neutral/skipped/stale as passing overall
        const successLike = new Set(['success', 'neutral', 'skipped', 'stale']);
        if (conclusions.every((c) => successLike.has(c))) return 'success';
        return 'pending';
      }
    }
  } catch {
    // ignore and fallback to legacy statuses
  }

  // 2) Fallback to legacy combined status API
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/status`;
    const res = await fetch(url, { headers });
    if (!res.ok) return undefined;
    const data = await res.json();
    const state = data?.state as BuildState | undefined;
    return state;
  } catch {
    return undefined;
  }
}

export function useBuildStatuses({ owner, repo, token, prs }: Params) {
  const [statuses, setStatuses] = useState<Record<number, BuildState | undefined>>({});

  // Reset cache when repository changes
  useEffect(() => {
    setStatuses({});
  }, [owner, repo]);

  const prsToFetch = useMemo(() => {
    return prs.filter((pr) => statuses[pr.number] === undefined && pr?.head?.sha);
  }, [prs, statuses]);

  useEffect(() => {
    let cancelled = false;
    if (!owner || !repo || prsToFetch.length === 0) return;

    (async () => {
      const results = await Promise.all(
        prsToFetch.map(async (pr) => {
          const sha = pr.head?.sha as string;
          try {
            const state = await fetchCombinedStatus(owner, repo, sha, token);
            return { number: pr.number, state } as { number: number; state: BuildState | undefined };
          } catch {
            return { number: pr.number, state: undefined };
          }
        })
      );
      if (cancelled) return;
      setStatuses((prev) => {
        const next = { ...prev };
        for (const r of results) {
          next[r.number] = r.state;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [owner, repo, token, prsToFetch]);

  return { statuses } as const;
}
