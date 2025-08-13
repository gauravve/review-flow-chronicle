export type WorkflowRun = {
  id: number;
  name?: string;
  event?: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  run_started_at?: string | null;
  updated_at: string;
};

export async function fetchWorkflowRuns({ owner, repo, token, days = 14 }: { owner: string; repo: string; token?: string; days?: number }) {
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  async function gh<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${msg}`);
    }
    return res.json();
  }

  const runs: WorkflowRun[] = [];
  let page = 1;
  const perPage = 100;

  while (page <= 5) {
    const resp = await gh<{ workflow_runs: WorkflowRun[] }>(`${base}/actions/runs?per_page=${perPage}&page=${page}`);
    if (!resp.workflow_runs?.length) break;

    for (const run of resp.workflow_runs) {
      const created = new Date(run.created_at);
      if (created >= cutoff) {
        runs.push(run);
      }
    }

    const last = resp.workflow_runs[resp.workflow_runs.length - 1];
    if (!last || new Date(last.created_at) < cutoff) break;
    page += 1;
  }

  return runs;
}
