import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Timer } from 'lucide-react';

type Props = {
  prs: any[];
  onSelect: (number: number) => void;
  selected?: number;
};

export function PRList({ prs, onSelect, selected }: Props) {
  const items = useMemo(
    () => [...prs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [prs]
  );

  const [numberQuery, setNumberQuery] = useState('');
  const [labelQuery, setLabelQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    const nq = numberQuery.trim();
    const lq = labelQuery.trim().toLowerCase();
    return items.filter((pr: any) => {
      const matchesNumber = nq ? String(pr.number).includes(nq) : true;
      const labels: string[] = Array.isArray(pr.labels)
        ? pr.labels.map((l: any) => (typeof l === 'string' ? l : l?.name)).filter(Boolean)
        : [];
      const matchesLabel = lq ? labels.some((name) => name.toLowerCase().includes(lq)) : true;
      return matchesNumber && matchesLabel;
    });
  }, [items, numberQuery, labelQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

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
              <label htmlFor="pr-label" className="sr-only">
                Search by label
              </label>
              <Input
                id="pr-label"
                placeholder="Search by label"
                value={labelQuery}
                onChange={(e) => {
                  setLabelQuery(e.target.value);
                  setPage(1);
                }}
                aria-label="Search by PR label"
              />
            </div>
          </div>
        </div>

        <ol className="divide-y divide-border">
          {pageItems.map((pr: any) => {
            const isSelected = selected === pr.number;
            const state = pr.merged_at ? 'merged' : pr.state;
            const metricLabel = pr.merged_at ? 'TTM' : 'Open';
            const metricValue = pr.merged_at
              ? formatDistanceStrict(new Date(pr.created_at), new Date(pr.merged_at))
              : formatDistanceToNow(new Date(pr.created_at));
            return (
              <li key={pr.id}>
                <button
                  className={`w-full text-left p-4 md:p-5 hover:bg-secondary/50 transition ${isSelected ? 'bg-secondary/60' : ''}`}
                  onClick={() => onSelect(pr.number)}
                  aria-label={`Open PR #${pr.number} timeline`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold">
                        #{pr.number} • {pr.title}
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
                      <Badge variant={state === 'open' ? 'default' : state === 'merged' ? 'secondary' : 'outline'} className="capitalize">
                        {state}
                      </Badge>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
          {pageItems.length === 0 ? (
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
