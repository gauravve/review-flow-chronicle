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
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const res = await fetch(url, { headers });
    
    if (!res.ok) {
      const msg = await res.text();
      let errorMsg = `GitHub API error ${res.status}: ${msg}`;
      
      if (res.status === 401) {
        errorMsg += `\n\nAuthentication failed. For private repositories, your GitHub token needs:
- Classic tokens: 'repo' scope
- Fine-grained tokens: 'Actions' repository permissions (read)
- Personal access tokens must have access to the target repository`;
      } else if (res.status === 403) {
        errorMsg += `\n\nForbidden. This could be due to:
- Insufficient token permissions
- Repository is private and requires authentication
- Rate limiting (try again later)`;
      } else if (res.status === 404) {
        errorMsg += `\n\nRepository not found. This could be due to:
- Repository doesn't exist or is misspelled
- Repository is private and requires authentication
- Token doesn't have access to this repository`;
      }
      
      throw new Error(errorMsg);
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
