import { Card, CardContent } from '@/components/ui/card';
import { GitPullRequest, GitMerge, Clock, CircleDot, CircleX } from 'lucide-react';
function formatDurationFromMs(ms: number) {
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

type Props = {
  prs: any[];
};

export function RepoMetrics({ prs }: Props) {
  const readyPRs = prs.filter((p) => !p.draft);
  const total = readyPRs.length;
  const merged = readyPRs.filter((p) => Boolean(p.merged_at)).length;
  const open = readyPRs.filter((p) => p.state === 'open').length;
  const closed = readyPRs.filter((p) => p.state === 'closed' && !p.merged_at).length;

  const mergedPRs = readyPRs.filter((p) => p.merged_at);
  const avgMergeMs = mergedPRs.length
    ? mergedPRs.reduce((acc: number, p: any) => acc + (new Date(p.merged_at).getTime() - new Date(p.created_at).getTime()), 0) / mergedPRs.length
    : 0;

  return (
    <Card className="card-elevated">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">PR metrics (last 2 weeks)</h2>
        </div>
        <div className="flex items-stretch gap-4 overflow-x-auto py-1">
          <div className="min-w-[220px] group relative overflow-hidden rounded-lg border bg-card p-4 animate-fade-in hover-scale">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" aria-hidden="true" />
            <div className="relative flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                <GitPullRequest className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{total}</div>
                <div className="text-sm text-muted-foreground">PRs (last 2 weeks)</div>
              </div>
            </div>
          </div>
          <div className="min-w-[220px] group relative overflow-hidden rounded-lg border bg-card p-4 animate-fade-in hover-scale">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" aria-hidden="true" />
            <div className="relative flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                <CircleDot className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{open}</div>
                <div className="text-sm text-muted-foreground">Open</div>
              </div>
            </div>
          </div>
          <div className="min-w-[220px] group relative overflow-hidden rounded-lg border bg-card p-4 animate-fade-in hover-scale">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" aria-hidden="true" />
            <div className="relative flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                <GitMerge className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{merged}</div>
                <div className="text-sm text-muted-foreground">Merged</div>
              </div>
            </div>
          </div>
          <div className="min-w-[220px] group relative overflow-hidden rounded-lg border bg-card p-4 animate-fade-in hover-scale">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" aria-hidden="true" />
            <div className="relative flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                <CircleX className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{closed}</div>
                <div className="text-sm text-muted-foreground">Closed</div>
              </div>
            </div>
          </div>
          <div className="min-w-[220px] group relative overflow-hidden rounded-lg border bg-card p-4 animate-fade-in hover-scale">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" aria-hidden="true" />
            <div className="relative flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{mergedPRs.length ? formatDurationFromMs(avgMergeMs) : 'N/A'}</div>
                <div className="text-sm text-muted-foreground">Avg time to merge</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
