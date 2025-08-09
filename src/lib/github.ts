export type TimelineEvent = {
  type: 'opened' | 'review_requested' | 'review' | 'comment' | 'merged' | 'closed';
  at: string;
  by?: string;
  to?: string;
  state?: string;
  body?: string;
};

export type FetchParams = {
  owner: string;
  repo: string;
  number: number;
  token?: string;
};

async function gh<T>(url: string, token?: string): Promise<T> {
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

export async function fetchPRTimeline({ owner, repo, number, token }: FetchParams) {
  const base = `https://api.github.com/repos/${owner}/${repo}`;

  const [pr, reviews, events, issueComments, reviewComments] = await Promise.all([
    gh<any>(`${base}/pulls/${number}`, token),
    gh<any[]>(`${base}/pulls/${number}/reviews`, token),
    gh<any[]>(`${base}/issues/${number}/events`, token),
    gh<any[]>(`${base}/issues/${number}/comments`, token),
    gh<any[]>(`${base}/pulls/${number}/comments`, token),
  ]);

  const timeline: TimelineEvent[] = [];

  if (pr?.created_at) {
    timeline.push({ type: 'opened', at: pr.created_at, by: pr.user?.login });
  }

  for (const ev of events) {
    if (ev.event === 'review_requested') {
      timeline.push({
        type: 'review_requested',
        at: ev.created_at,
        by: ev.actor?.login,
        to: ev.requested_reviewer?.login || ev.requested_team?.name,
      });
    }
  }

  for (const r of reviews) {
    const at: string = r.submitted_at || r.submittedAt || r.created_at || new Date().toISOString();
    timeline.push({
      type: 'review',
      at,
      by: r.user?.login,
      state: r.state,
      body: r.body,
    });
  }

  for (const c of issueComments) {
    timeline.push({ type: 'comment', at: c.created_at, by: c.user?.login, body: c.body });
  }
  for (const c of reviewComments) {
    timeline.push({ type: 'comment', at: c.created_at, by: c.user?.login, body: c.body });
  }

  if (pr?.merged_at) {
    timeline.push({ type: 'merged', at: pr.merged_at, by: pr.merged_by?.login });
  } else if (pr?.closed_at) {
    timeline.push({ type: 'closed', at: pr.closed_at, by: pr.user?.login });
  }

  timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return { pr, timeline };
}

// Fetch PRs created in the last 14 days (default), sorted newest first
export async function fetchRecentPRs({ owner, repo, token, days = 14 }: { owner: string; repo: string; token?: string; days?: number }) {
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const results: any[] = [];
  let page = 1;
  const perPage = 100;

  while (page <= 5) { // safety limit to avoid too many requests
    const prs = await gh<any[]>(`${base}/pulls?state=all&per_page=${perPage}&sort=created&direction=desc&page=${page}`, token);
    if (!prs.length) break;

    for (const pr of prs) {
      const createdAt = new Date(pr.created_at);
      if (createdAt >= cutoff) {
        results.push(pr);
      }
    }

    const last = prs[prs.length - 1];
    if (!last || new Date(last.created_at) < cutoff) break;

    page += 1;
  }

  // Ensure newest first
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return results;
}
