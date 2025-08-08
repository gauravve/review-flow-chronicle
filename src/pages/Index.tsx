import { useCallback, useMemo, useRef, useState } from 'react';
import { PRSearch, PRQuery } from '@/components/PRSearch';
import { ReviewTimeline } from '@/components/ReviewTimeline';
import { useQuery } from '@tanstack/react-query';
import { fetchPRTimeline } from '@/lib/github';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [query, setQuery] = useState<PRQuery | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    (e.currentTarget as HTMLDivElement).style.setProperty('--cursor-x', `${x}%`);
    (e.currentTarget as HTMLDivElement).style.setProperty('--cursor-y', `${y}%`);
  }, []);

  const { data, isFetching, error } = useQuery({
    queryKey: ['prTimeline', query?.owner, query?.repo, query?.number, Boolean(query?.token)],
    queryFn: () => fetchPRTimeline({ owner: query!.owner, repo: query!.repo, number: query!.number, token: query!.token }),
    enabled: !!query,
  });

  const hasResults = useMemo(() => Boolean(data?.timeline?.length), [data]);

  return (
    <main>
      <section ref={heroRef} onMouseMove={onMouseMove} className="bg-hero">
        <div className="container py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">GitHub PR Review Timeline</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6">Instantly visualize PR review progress: review requests, approvals, changes requested, and merges. Bring clarity to your review flow.</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="hero" onClick={() => heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })}>Get Started</Button>
            <a className="text-sm text-primary underline-offset-4 hover:underline" href="https://docs.github.com/en/rest" target="_blank" rel="noreferrer">GitHub API Docs</a>
          </div>
        </div>
      </section>

      <section className="container py-10 md:py-12">
        <PRSearch onSearch={setQuery} loading={isFetching} />
        {error ? (
          <div className="mt-6 text-destructive">{(error as Error).message}</div>
        ) : null}
        {hasResults && query ? (
          <div className="mt-8">
            <ReviewTimeline events={data!.timeline} owner={query.owner} repo={query.repo} number={query.number} />
          </div>
        ) : (
          <div className="mt-8 text-center text-muted-foreground">Enter a repository and PR number to build the timeline.</div>
        )}
      </section>
    </main>
  );
};

export default Index;
