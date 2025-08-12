import { useEffect, useMemo, useState } from 'react';

export type BuildState = 'success' | 'failure' | 'pending';

type Params = {
  owner: string;
  repo: string;
  token?: string;
  prs: Array<{ number: number; head?: { sha?: string } }>; // minimal shape from GitHub PRs
};

// Fetch combined commit status for a commit SHA
async function fetchCombinedStatus(owner: string, repo: string, sha: string, token?: string): Promise<BuildState | undefined> {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/status`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    // Silently fail; caller may treat as unknown
    return undefined;
  }
  const data = await res.json();
  // data.state is one of 'success' | 'failure' | 'pending'
  return data?.state as BuildState | undefined;
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
