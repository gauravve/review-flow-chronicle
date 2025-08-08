import { TimelineEvent } from '@/lib/github';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitPullRequest, GitMerge, CheckCircle2, XCircle, Clock, UserCheck, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

type Props = {
  events: TimelineEvent[];
  repo: string;
  owner: string;
  number: number;
};

const eventMeta = (e: TimelineEvent) => {
  switch (e.type) {
    case 'opened':
      return { icon: GitPullRequest, label: 'PR opened' };
    case 'review_requested':
      return { icon: UserCheck, label: `Review requested${e.to ? ` → ${e.to}` : ''}` };
    case 'review': {
      const label = e.state === 'APPROVED' ? 'Approved' : e.state === 'CHANGES_REQUESTED' ? 'Changes requested' : 'Reviewed';
      return { icon: e.state === 'APPROVED' ? CheckCircle2 : e.state === 'CHANGES_REQUESTED' ? MessageSquare : Clock, label };
    }
    case 'merged':
      return { icon: GitMerge, label: 'Merged' };
    case 'closed':
      return { icon: XCircle, label: 'Closed' };
  }
};

export function ReviewTimeline({ events, owner, repo, number }: Props) {
  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{owner}/{repo} • PR #{number}</span>
          <a className="text-sm text-primary underline-offset-4 hover:underline" href={`https://github.com/${owner}/${repo}/pull/${number}`} target="_blank" rel="noreferrer">View on GitHub</a>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative border-s border-border ps-6">
          {events.map((e, idx) => {
            const meta = eventMeta(e);
            const Icon = meta.icon;
            return (
              <li key={idx} className="mb-8 animate-reveal-up">
                <span className="absolute -start-2 top-1 size-4 timeline-dot"></span>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-secondary text-secondary-foreground p-2">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <div className="font-medium">{meta.label}{e.by ? ` by ${e.by}` : ''}</div>
                    <div className="text-sm text-muted-foreground">{format(new Date(e.at), 'PPpp')}</div>
                    {e.body ? (
                      <p className="mt-2 text-sm text-foreground/80">{e.body}</p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
