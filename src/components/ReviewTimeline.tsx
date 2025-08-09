import { TimelineEvent } from '@/lib/github';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitPullRequest, GitMerge, CheckCircle2, XCircle, Clock, UserCheck, MessageSquare } from 'lucide-react';
import { format, formatDistanceToNow, differenceInHours, differenceInMinutes } from 'date-fns';
import { CommentBubble } from '@/components/CommentBubble';

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
    case 'comment':
      return { icon: MessageSquare, label: 'Comment' };
  }
};

const calculateReviewMetrics = (events: TimelineEvent[]) => {
  const opened = events.find(e => e.type === 'opened');
  const firstReview = events.find(e => e.type === 'review');
  const approved = events.find(e => e.type === 'review' && e.state === 'APPROVED');
  const merged = events.find(e => e.type === 'merged');
  const closed = events.find(e => e.type === 'closed');

  if (!opened) return null;

  const openedAt = new Date(opened.at);
  const endEvent = merged || closed;
  const endAt = endEvent ? new Date(endEvent.at) : new Date();

  const timeToFirstReview = firstReview ? differenceInHours(new Date(firstReview.at), openedAt) : null;
  const timeToApproval = approved ? differenceInHours(new Date(approved.at), openedAt) : null;
  const totalTime = differenceInHours(endAt, openedAt);

  return {
    timeToFirstReview,
    timeToApproval,
    totalTime,
    status: merged ? 'merged' : closed ? 'closed' : 'open'
  };
};

const formatDuration = (hours: number) => {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
};

export function ReviewTimeline({ events, owner, repo, number }: Props) {
  const author = events.find((e) => e.type === 'opened')?.by ?? '';
  const metrics = calculateReviewMetrics(events);
  
  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{owner}/{repo} • PR #{number}</span>
          <a className="text-sm text-primary underline-offset-4 hover:underline" href={`https://github.com/${owner}/${repo}/pull/${number}`} target="_blank" rel="noreferrer">View on GitHub</a>
        </CardTitle>
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-secondary/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{metrics.timeToFirstReview ? formatDuration(metrics.timeToFirstReview) : 'N/A'}</div>
              <div className="text-sm text-muted-foreground">Time to first review</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{metrics.timeToApproval ? formatDuration(metrics.timeToApproval) : 'N/A'}</div>
              <div className="text-sm text-muted-foreground">Time to approval</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{formatDuration(metrics.totalTime)}</div>
              <div className="text-sm text-muted-foreground">Total time ({metrics.status})</div>
            </div>
          </div>
        )}
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
