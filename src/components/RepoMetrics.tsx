import { Card, CardContent } from '@/components/ui/card';

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
  const total = prs.length;
  const merged = prs.filter((p) => Boolean(p.merged_at)).length;
  const open = prs.filter((p) => p.state === 'open').length;
  const closed = prs.filter((p) => p.state === 'closed' && !p.merged_at).length;

  const mergedPRs = prs.filter((p) => p.merged_at);
  const avgMergeMs = mergedPRs.length
    ? mergedPRs.reduce((acc: number, p: any) => acc + (new Date(p.merged_at).getTime() - new Date(p.created_at).getTime()), 0) / mergedPRs.length
    : 0;

  return (
    <Card className="card-elevated">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{total}</div>
            <div className="text-sm text-muted-foreground">PRs (last 2 weeks)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{open}</div>
            <div className="text-sm text-muted-foreground">Open</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{merged}</div>
            <div className="text-sm text-muted-foreground">Merged</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{closed}</div>
            <div className="text-sm text-muted-foreground">Closed</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{mergedPRs.length ? formatDurationFromMs(avgMergeMs) : 'N/A'}</div>
            <div className="text-sm text-muted-foreground">Avg time to merge</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
