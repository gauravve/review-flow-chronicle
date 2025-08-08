export type TimelineEvent = {
  type: 'opened' | 'review_requested' | 'review' | 'merged' | 'closed';
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

  const [pr, reviews, events] = await Promise.all([
    gh<any>(`${base}/pulls/${number}`, token),
    gh<any[]>(`${base}/pulls/${number}/reviews`, token),
    gh<any[]>(`${base}/issues/${number}/events`, token),
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

  if (pr?.merged_at) {
    timeline.push({ type: 'merged', at: pr.merged_at, by: pr.merged_by?.login });
  } else if (pr?.closed_at) {
    timeline.push({ type: 'closed', at: pr.closed_at, by: pr.user?.login });
  }

  timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return { pr, timeline };
}
