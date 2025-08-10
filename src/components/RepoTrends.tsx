import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRecentPRs } from '@/lib/github';
import { Card, CardContent } from '@/components/ui/card';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { format } from 'date-fns';

type Props = {
  owner: string;
  repo: string;
  token?: string;
};

type TrendPoint = {
  month: string; // e.g., 'Apr 25'
  key: string;   // '2025-04'
  prCount: number;
  avgMergeDays: number;
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function humanMonth(key: string) {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, 1);
  return format(date, 'MMM yy');
}

export function RepoTrends({ owner, repo, token }: Props) {
  const query = useQuery({
    queryKey: ['repoTrends', owner, repo, Boolean(token)],
    queryFn: () => fetchRecentPRs({ owner, repo, token, days: 180 }),
    enabled: !!owner && !!repo,
  });

  const data: TrendPoint[] = useMemo(() => {
    if (!query.data) return [];

    // Build last 6 month keys, oldest -> newest
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(monthKey(d));
    }

    const counters = new Map<string, { count: number; mergeDurationsMs: number[] }>();
    months.forEach((k) => counters.set(k, { count: 0, mergeDurationsMs: [] }));

    for (const pr of query.data as any[]) {
      const created = new Date(pr.created_at);
      const createdKey = monthKey(new Date(created.getFullYear(), created.getMonth(), 1));
      if (counters.has(createdKey)) {
        counters.get(createdKey)!.count += 1;
      }

      if (pr.merged_at) {
        const merged = new Date(pr.merged_at);
        const mergedKey = monthKey(new Date(merged.getFullYear(), merged.getMonth(), 1));
        if (counters.has(mergedKey)) {
          counters.get(mergedKey)!.mergeDurationsMs.push(
            new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime()
          );
        }
      }
    }

    const points: TrendPoint[] = months.map((k) => {
      const bucket = counters.get(k)!;
      const avgMs = bucket.mergeDurationsMs.length
        ? bucket.mergeDurationsMs.reduce((a, b) => a + b, 0) / bucket.mergeDurationsMs.length
        : 0;
      const avgDays = avgMs ? Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10 : 0; // 1 decimal
      return {
        month: humanMonth(k),
        key: k,
        prCount: bucket.count,
        avgMergeDays: avgDays,
      };
    });

    return points;
  }, [query.data]);

  return (
    <Card className="card-elevated">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">PR Trends (last 6 months)</h2>
          {/* Decorative gradient */}
          <div className="sr-only">Monthly number of PRs and average time to merge</div>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
              <YAxis yAxisId="left" tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} width={40} />
              <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} width={40} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="prCount" name="PRs" fill="url(#barFill)" radius={[6, 6, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgMergeDays"
                name="Avg merge (days)"
                stroke="hsl(var(--foreground))"
                strokeWidth={2}
                dot={{ r: 3, stroke: 'hsl(var(--foreground))', fill: 'hsl(var(--card))' }}
                activeDot={{ r: 5, stroke: 'hsl(var(--foreground))', fill: 'hsl(var(--card))' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
