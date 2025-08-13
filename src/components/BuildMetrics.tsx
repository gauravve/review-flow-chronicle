import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { fetchWorkflowRuns, WorkflowRun } from '@/lib/builds';

type Props = {
  owner: string;
  repo: string;
  token?: string;
};

function formatDurationFromMs(ms: number) {
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

function lastNDaysKeys(n: number) {
  const res: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    res.push({ key: format(d, 'yyyy-MM-dd'), label: format(d, 'MMM d') });
  }
  return res;
}

export function BuildMetrics({ owner, repo, token }: Props) {
  const query = useQuery({
    queryKey: ['buildMetrics', owner, repo, Boolean(token)],
    queryFn: () => fetchWorkflowRuns({ owner, repo, token, days: 14 }),
    enabled: !!owner && !!repo,
  });

  const { chartData, avgBuildMs } = useMemo(() => {
    const days = lastNDaysKeys(14);
    const counts = new Map<string, number>(days.map((d) => [d.key, 0]));

    let durations: number[] = [];
    if (query.data) {
      for (const run of query.data as WorkflowRun[]) {
        const dayKey = format(new Date(run.created_at), 'yyyy-MM-dd');
        if (counts.has(dayKey)) counts.set(dayKey, (counts.get(dayKey) || 0) + 1);

        if (run.status === 'completed') {
          const start = new Date(run.run_started_at || run.created_at).getTime();
          const end = new Date(run.updated_at).getTime();
          if (end > start) durations.push(end - start);
        }
      }
    }

    const chartData = days.map((d) => ({ day: d.label, count: counts.get(d.key) || 0 }));
    const avgBuildMs = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return { chartData, avgBuildMs };
  }, [query.data]);

  return (
    <Card className="card-elevated">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Build metrics (last 2 weeks)</h2>
          <div className="sr-only">Number of builds per day and average build time</div>
        </div>
        <div className="flex items-stretch gap-4 overflow-x-auto py-1">
          <div className="min-w-[360px] group relative overflow-hidden rounded-lg border bg-card p-4 animate-fade-in hover-scale">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" aria-hidden="true" />
            <div className="relative flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">Builds per day</div>
                <div className="text-sm text-muted-foreground">Last 14 days</div>
              </div>
            </div>
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} width={28} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                           labelStyle={{ color: 'hsl(var(--foreground))' }} />
                  <defs>
                    <linearGradient id="buildBarFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="count" name="Builds" fill="url(#buildBarFill)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-w-[220px] group relative overflow-hidden rounded-lg border bg-card p-4 animate-fade-in hover-scale">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" aria-hidden="true" />
            <div className="relative flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{avgBuildMs ? formatDurationFromMs(avgBuildMs) : 'N/A'}</div>
                <div className="text-sm text-muted-foreground">Avg build time</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
