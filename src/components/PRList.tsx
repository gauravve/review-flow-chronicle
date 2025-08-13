import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { formatDistanceToNow, formatDistanceStrict } from 'date-fns';
import { Timer, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useBuildStatuses } from '@/hooks/use-build-status';

type Props = {
  prs: any[];
  onSelect: (number: number) => void;
  selected?: number;
  owner: string;
  repo: string;
  token?: string;
};

export function PRList({ prs, onSelect, selected, owner, repo, token }: Props) {
  const items = useMemo(
    () => [...prs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [prs]
  );

  const [numberQuery, setNumberQuery] = useState('');
  const [titleQuery, setTitleQuery] = useState('');
  const [showDrafts, setShowDrafts] = useState(false); // default hide drafts
  const [showMerged, setShowMerged] = useState(false); // default show open PRs only
  const [showGreenOnly, setShowGreenOnly] = useState(false); // requires build status; toggle UI only for now
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filtered = useMemo(() => {
    const nq = numberQuery.trim();
    const tq = titleQuery.trim().toLowerCase();
    return items.filter((pr: any) => {
      const matchesNumber = nq ? String(pr.number).includes(nq) : true;
      const title: string = String(pr.title || '');
      const matchesTitle = tq ? title.toLowerCase().includes(tq) : true;

      // filter toggles
      const hideDrafts = !showDrafts && Boolean(pr.draft);
      const hideMerged = !showMerged && Boolean(pr.merged_at);

      if (hideDrafts || hideMerged) return false;

      // TODO: green build filter requires commit status data
      return matchesNumber && matchesTitle;
    });
  }, [items, numberQuery, titleQuery, showDrafts, showMerged]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const { statuses: buildStatuses } = useBuildStatuses({ owner, repo, token, prs: pageItems });

  const displayItems = useMemo(() => {
    if (!showGreenOnly) return pageItems;
    return pageItems.filter((pr: any) => buildStatuses[pr.number] === 'success');
  }, [pageItems, showGreenOnly, buildStatuses]);

  const goToPage = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)));

  const renderPageNumbers = () => {
    const pages: number[] = [];
    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      const neighbors = [currentPage - 1, currentPage, currentPage + 1].filter(
        (n) => n > 1 && n < totalPages
      );
      const unique = Array.from(new Set([1, ...neighbors, totalPages])).sort((a, b) => a - b);
      // Insert placeholders (-1) for ellipsis where gaps exist
      for (let i = 1; i < unique.length; i++) {
        const prev = unique[i - 1];
        const curr = unique[i];
        if (curr - prev > 1) pages.push(-1);
        pages.push(curr);
      }
      return pages;
    }
    return pages;
  };

  return (
    <Card className="card-elevated">
      <CardContent className="p-0">
        <div className="p-4 md:p-5 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label htmlFor="pr-number" className="sr-only">
                Search by PR number
              </label>
              <Input
                id="pr-number"
                placeholder="Search by PR number"
                value={numberQuery}
                onChange={(e) => {
                  setNumberQuery(e.target.value);
                  setPage(1);
                }}
                inputMode="numeric"
                aria-label="Search by PR number"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="pr-title" className="sr-only">
                Search by title
              </label>
              <Input
                id="pr-title"
                placeholder="Search by title"
                value={titleQuery}
                onChange={(e) => {
                  setTitleQuery(e.target.value);
                  setPage(1);
                }}
                aria-label="Search by PR title"
              />
            </div>
          </div>
        </div>

        <div className="p-4 md:p-5 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center justify-between md:justify-start gap-3">
              <Switch id="filter-drafts" checked={showDrafts} onCheckedChange={(v) => { setShowDrafts(Boolean(v)); setPage(1); }} />
              <Label htmlFor="filter-drafts" className="text-sm">Show Draft PRs</Label>
            </div>
            <div className="flex items-center justify-between md:justify-start gap-3">
              <Switch id="filter-merged" checked={showMerged} onCheckedChange={(v) => { setShowMerged(Boolean(v)); setPage(1); }} />
              <Label htmlFor="filter-merged" className="text-sm">Show Merged PRs</Label>
            </div>
            <div className="flex items-center justify-between md:justify-start gap-3">
              <Switch id="filter-green" checked={showGreenOnly} onCheckedChange={(v) => { setShowGreenOnly(Boolean(v)); setPage(1); }} />
              <Label htmlFor="filter-green" className="text-sm">Only Show Green Builds</Label>
            </div>
          </div>
        </div>

        <ol className="divide-y divide-border">
          {displayItems.map((pr: any) => {
            const isSelected = selected === pr.number;
            const state = pr.merged_at ? 'merged' : pr.state;
            const metricLabel = pr.merged_at ? 'TTM' : 'Open';
            const metricValue = pr.merged_at
              ? formatDistanceStrict(new Date(pr.created_at), new Date(pr.merged_at))
              : formatDistanceToNow(new Date(pr.created_at));
            const buildState = buildStatuses[pr.number] as 'success' | 'failure' | 'pending' | undefined;
            const buildLabel = buildState === 'success' ? 'Passing' : buildState === 'failure' ? 'Failing' : buildState === 'pending' ? 'Pending' : 'Unknown';
            const buildVariant = buildState === 'success' ? 'success' : buildState === 'failure' ? 'destructive' : buildState === 'pending' ? 'warning' : 'outline';
            const BuildIcon = buildState === 'success' ? CheckCircle2 : buildState === 'failure' ? XCircle : Clock;
            return (

              <li key={pr.id}>
                <div
                  role="button"
                  tabIndex={0}
                  className={`w-full text-left p-4 md:p-5 hover:bg-secondary/50 transition ${isSelected ? 'bg-secondary/60' : ''}`}
                  onClick={() => onSelect(pr.number)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(pr.number);
                    }
                  }}
                  aria-label={`Open PR #${pr.number} timeline`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        <a
                          href={`https://github.com/${owner}/${repo}/pull/${pr.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="underline-offset-2 hover:underline"
                          aria-label={`Open PR #${pr.number} on GitHub`}
                          title="Open on GitHub"
                        >
                          #{pr.number}
                        </a>
                        {pr.draft ? (
                          <Badge variant="outline" className="uppercase">Draft</Badge>
                        ) : null}
                        <span>• {pr.title}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        by {pr.user?.login} • {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="gap-1 hover-scale shadow-sm"
                        aria-label={`${pr.merged_at ? 'Time to merge' : 'Time open'} ${metricValue}`}
                      >
                        <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="font-medium">{metricLabel}:</span>
                        <span>{metricValue}</span>
                      </Badge>
                      <Badge
                        variant={buildVariant}
                        className="gap-1 hover-scale shadow-sm"
                        aria-label={`Build status ${buildLabel}`}
                      >
                        <BuildIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="font-medium">Build:</span>
                        <span>{buildLabel}</span>
                      </Badge>
                      <Badge variant={state === 'open' ? 'default' : state === 'merged' ? 'secondary' : 'outline'} className="capitalize">
                        {state}
                      </Badge>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
          {displayItems.length === 0 ? (
            <li className="p-4 md:p-5 text-sm text-muted-foreground">No pull requests match your filters.</li>
          ) : null}
        </ol>

        <div className="p-3">
          <Pagination className="w-full">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); goToPage(currentPage - 1); }} />
              </PaginationItem>
              {renderPageNumbers().map((p, idx) => (
                p === -1 ? (
                  <PaginationItem key={`el-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink href="#" isActive={p === currentPage} onClick={(e) => { e.preventDefault(); goToPage(p); }}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              ))}
              <PaginationItem>
                <PaginationNext href="#" onClick={(e) => { e.preventDefault(); goToPage(currentPage + 1); }} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  );
}
