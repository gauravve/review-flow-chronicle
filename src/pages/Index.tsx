import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { PRSearch, PRQuery } from '@/components/PRSearch';
import { ReviewTimeline } from '@/components/ReviewTimeline';
import { useQuery } from '@tanstack/react-query';
import { fetchPRTimeline, fetchRecentPRs } from '@/lib/github';
import { Button } from '@/components/ui/button';
import { RepoMetrics } from '@/components/RepoMetrics';
import { BuildMetrics } from '@/components/BuildMetrics';
import { PRList } from '@/components/PRList';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
const LazyRepoTrends = lazy(() => import('@/components/RepoTrends').then(m => ({ default: m.RepoTrends })));
const Index = () => {
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string; token?: string } | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const [showTrends, setShowTrends] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    (e.currentTarget as HTMLDivElement).style.setProperty('--cursor-x', `${x}%`);
    (e.currentTarget as HTMLDivElement).style.setProperty('--cursor-y', `${y}%`);
  }, []);

  const recentPRs = useQuery({
    queryKey: ['recentPRs', repoInfo?.owner, repoInfo?.repo, Boolean(repoInfo?.token)],
    queryFn: () => fetchRecentPRs({ owner: repoInfo!.owner, repo: repoInfo!.repo, token: repoInfo!.token, days: 56 }),
    enabled: !!repoInfo,
  });

  const timelineQuery = useQuery({
    queryKey: ['prTimeline', repoInfo?.owner, repoInfo?.repo, selectedNumber, Boolean(repoInfo?.token)],
    queryFn: () => fetchPRTimeline({ owner: repoInfo!.owner, repo: repoInfo!.repo, number: selectedNumber!, token: repoInfo!.token }),
    enabled: !!repoInfo && !!selectedNumber,
  });

  const handleSearch = (q: PRQuery) => {
    setRepoInfo({ owner: q.owner, repo: q.repo, token: q.token });
    setSelectedNumber(q.number ?? null);
  };

  const hasList = !!repoInfo && (recentPRs.data?.length ?? 0) > 0;

  return (
    <main>
      <section ref={heroRef} onMouseMove={onMouseMove} className="bg-hero">
        <div className="container py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">GitHub PR Review Timeline</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6">Instantly visualize PR review progress and repository metrics for the last two weeks.</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="hero" onClick={() => heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })}>Get Started</Button>
            <a className="text-sm text-primary underline-offset-4 hover:underline" href="https://docs.github.com/en/rest" target="_blank" rel="noreferrer">GitHub API Docs</a>
          </div>
        </div>
      </section>

      <section className="container py-10 md:py-12">
        <PRSearch onSearch={handleSearch} loading={recentPRs.isFetching || timelineQuery.isFetching} />
        {recentPRs.error ? (
          <div className="mt-6 text-destructive">{(recentPRs.error as Error).message}</div>
        ) : null}

        {hasList ? (
          <div className="mt-8 space-y-6">
            <RepoMetrics prs={recentPRs.data!} />
            <BuildMetrics owner={repoInfo!.owner} repo={repoInfo!.repo} token={repoInfo!.token} />
            {!showTrends ? (
              <div>
                <Button variant="outline" size="sm" onClick={() => setShowTrends(true)} aria-controls="repo-trends" aria-expanded={false}>
                  Show Trends
                </Button>
              </div>
            ) : (
              <Suspense fallback={<Skeleton className="h-[320px] w-full" />}>
                <div id="repo-trends" className="animate-reveal-up">
                  <LazyRepoTrends owner={repoInfo!.owner} repo={repoInfo!.repo} token={repoInfo!.token} />
                </div>
              </Suspense>
            )}
            <Collapsible open={listOpen} onOpenChange={setListOpen}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Pull Requests (last 8 weeks)</h2>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" aria-expanded={listOpen}>
                    {listOpen ? 'Collapse PR list' : 'Show PR list'}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-4">
                  <PRList
                    prs={recentPRs.data!}
                    owner={repoInfo!.owner}
                    repo={repoInfo!.repo}
                    token={repoInfo!.token}
                    onSelect={(n) => {
                      setSelectedNumber(n);
                      setListOpen(false);
                    }}
                    selected={selectedNumber ?? undefined}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : repoInfo ? (
          <div className="mt-8 text-center text-muted-foreground">No PRs in the last 8 weeks.</div>
        ) : (
          <div className="mt-8 text-center text-muted-foreground">Enter a repository to see PR metrics and recent PRs.</div>
        )}

        {timelineQuery.error ? (
          <div className="mt-6 text-destructive">{(timelineQuery.error as Error).message}</div>
        ) : null}

        {repoInfo && selectedNumber && timelineQuery.data ? (
          <div className="mt-8">
            <ReviewTimeline events={timelineQuery.data.timeline} owner={repoInfo.owner} repo={repoInfo.repo} number={selectedNumber} />
          </div>
        ) : null}
      </section>
    </main>
  );
};

export default Index;
