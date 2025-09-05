import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { Timer, CheckCircle2, XCircle, Clock, ListTodo, CheckCheck, AlertTriangle, X, UserCheck, Users } from 'lucide-react';
import { useBuildStatuses } from '@/hooks/use-build-status';
import { fetchRepositoryContributors, fetchPRApprovalStatus } from '@/lib/github';

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
  const [showClosed, setShowClosed] = useState(false); // default hide closed PRs
  const [showGreenOnly, setShowGreenOnly] = useState(false); // requires build status; toggle UI only for now
  const [completedPRs, setCompletedPRs] = useState<Set<number>>(new Set());
  const [deferredPRs, setDeferredPRs] = useState<Set<number>>(new Set());
  const [assignedContributors, setAssignedContributors] = useState<Map<number, { login: string; avatar_url: string }>>(new Map());
  const [contributors, setContributors] = useState<any[]>([]);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [approvalStatuses, setApprovalStatuses] = useState<Map<number, any>>(new Map());
  const [page, setPage] = useState(1);

  const storageKey = `todo-prs-${owner}-${repo}`;
  const deferredStorageKey = `deferred-prs-${owner}-${repo}`;
  const assignedStorageKey = `assigned-prs-${owner}-${repo}`;
  const showClosedStorageKey = `show-closed-${owner}-${repo}`;

  // Load completed, deferred PRs, assigned contributors and showClosed setting from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const completedArray = JSON.parse(stored);
        setCompletedPRs(new Set(completedArray));
      }
      
      const deferredStored = localStorage.getItem(deferredStorageKey);
      if (deferredStored) {
        const deferredArray = JSON.parse(deferredStored);
        setDeferredPRs(new Set(deferredArray));
      }

      const assignedStored = localStorage.getItem(assignedStorageKey);
      if (assignedStored) {
        const assignedArray = JSON.parse(assignedStored);
        setAssignedContributors(new Map(assignedArray));
      }

      const showClosedStored = localStorage.getItem(showClosedStorageKey);
      if (showClosedStored !== null) {
        setShowClosed(JSON.parse(showClosedStored));
      }
    } catch (error) {
      console.warn('Failed to load TODO/deferred/assigned/showClosed state from localStorage:', error);
    }
  }, [storageKey, deferredStorageKey, assignedStorageKey, showClosedStorageKey]);

  // Fetch contributors on mount
  useEffect(() => {
    const loadContributors = async () => {
      try {
        const contributorList = await fetchRepositoryContributors({ owner, repo, token });
        setContributors(contributorList);
      } catch (error) {
        console.warn('Failed to fetch contributors:', error);
      }
    };
    loadContributors();
  }, [owner, repo, token]);

  // Save completed PRs to localStorage whenever state changes
  useEffect(() => {
    try {
      const completedArray = Array.from(completedPRs);
      localStorage.setItem(storageKey, JSON.stringify(completedArray));
    } catch (error) {
      console.warn('Failed to save TODO state to localStorage:', error);
    }
  }, [completedPRs, storageKey]);

  // Save deferred PRs to localStorage whenever state changes
  useEffect(() => {
    try {
      const deferredArray = Array.from(deferredPRs);
      localStorage.setItem(deferredStorageKey, JSON.stringify(deferredArray));
    } catch (error) {
      console.warn('Failed to save deferred state to localStorage:', error);
    }
  }, [deferredPRs, deferredStorageKey]);

  // Save assigned contributors to localStorage whenever state changes
  useEffect(() => {
    try {
      const assignedArray = Array.from(assignedContributors.entries());
      localStorage.setItem(assignedStorageKey, JSON.stringify(assignedArray));
    } catch (error) {
      console.warn('Failed to save assigned state to localStorage:', error);
    }
  }, [assignedContributors, assignedStorageKey]);

  // Save showClosed setting to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(showClosedStorageKey, JSON.stringify(showClosed));
    } catch (error) {
      console.warn('Failed to save showClosed state to localStorage:', error);
    }
  }, [showClosed, showClosedStorageKey]);

  const pageSize = 20;

  // Extract all unique labels from PRs
  const allLabels = useMemo(() => {
    const labelSet = new Set<string>();
    items.forEach((pr: any) => {
      if (pr.labels && Array.isArray(pr.labels)) {
        pr.labels.forEach((label: any) => labelSet.add(label.name));
      }
    });
    return Array.from(labelSet).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const nq = numberQuery.trim();
    const tq = titleQuery.trim().toLowerCase();
    return items.filter((pr: any) => {
      const matchesNumber = nq ? String(pr.number).includes(nq) : true;
      const title: string = String(pr.title || '');
      const matchesTitle = tq ? title.toLowerCase().includes(tq) : true;

      // Label filtering
      const matchesLabels = selectedLabels.size === 0 || 
        (pr.labels && pr.labels.some((label: any) => selectedLabels.has(label.name)));

      // filter toggles
      const hideDrafts = !showDrafts && Boolean(pr.draft);
      const hideMerged = !showMerged && Boolean(pr.merged_at);
      const hideClosed = !showClosed && pr.state === 'closed' && !pr.merged_at;

      if (hideDrafts || hideMerged || hideClosed) return false;

      // TODO: green build filter requires commit status data
      return matchesNumber && matchesTitle && matchesLabels;
    });
  }, [items, numberQuery, titleQuery, showDrafts, showMerged, showClosed, selectedLabels]);

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

  // Fetch approval statuses for current page items
  useEffect(() => {
    const loadApprovalStatuses = async () => {
      const newStatuses = new Map(approvalStatuses);
      
      for (const pr of pageItems) {
        if (!newStatuses.has(pr.number)) {
          try {
            const status = await fetchPRApprovalStatus({ owner, repo, number: pr.number, token });
            newStatuses.set(pr.number, status);
          } catch (error) {
            console.warn(`Failed to fetch approval status for PR #${pr.number}:`, error);
          }
        }
      }
      
      setApprovalStatuses(newStatuses);
    };

    if (pageItems.length > 0) {
      loadApprovalStatuses();
    }
  }, [pageItems, owner, repo, token]);

  // Calculate TODO metrics based on filtered items (all pages, not just current page)
  const todoMetrics = useMemo(() => {
    const totalPRs = filtered.length;
    const completedCount = filtered.filter(pr => completedPRs.has(pr.number)).length;
    const deferredCount = filtered.filter(pr => deferredPRs.has(pr.number)).length;
    const remainingCount = totalPRs - completedCount - deferredCount;
    const completionPercentage = totalPRs > 0 ? Math.round((completedCount / totalPRs) * 100) : 0;
    
    return {
      total: totalPRs,
      completed: completedCount,
      deferred: deferredCount,
      remaining: remainingCount,
      percentage: completionPercentage
    };
  }, [filtered, completedPRs, deferredPRs]);

  const goToPage = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)));

  const assignContributor = (prNumber: number, contributor: { login: string; avatar_url: string }) => {
    setAssignedContributors(prev => new Map(prev.set(prNumber, contributor)));
    setDeferredPRs(prev => new Set(prev.add(prNumber)));
    // Remove from completed if assigning
    setCompletedPRs(prev => {
      const newSet = new Set(prev);
      newSet.delete(prNumber);
      return newSet;
    });
    setOpenDropdown(null);
  };

  const removeAssignedContributor = (prNumber: number) => {
    setAssignedContributors(prev => {
      const newMap = new Map(prev);
      newMap.delete(prNumber);
      return newMap;
    });
    setDeferredPRs(prev => {
      const newSet = new Set(prev);
      newSet.delete(prNumber);
      return newSet;
    });
  };

  const toggleLabelFilter = (labelName: string) => {
    setSelectedLabels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(labelName)) {
        newSet.delete(labelName);
      } else {
        newSet.add(labelName);
      }
      return newSet;
    });
    setPage(1);
  };

  const clearLabelFilters = () => {
    setSelectedLabels(new Set());
    setPage(1);
  };

  // Function to generate a consistent color for labels
  const getLabelColor = (labelName: string) => {
    const colors = [
      'bg-red-100 text-red-800 border-red-200',
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-teal-100 text-teal-800 border-teal-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200',
    ];
    
    // Simple hash function to get consistent color for same label
    let hash = 0;
    for (let i = 0; i < labelName.length; i++) {
      const char = labelName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const togglePRCompletion = (prNumber: number) => {
    setCompletedPRs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(prNumber)) {
        newSet.delete(prNumber);
      } else {
        newSet.add(prNumber);
        // Remove from deferred if adding to completed
        setDeferredPRs(curr => {
          const deferredSet = new Set(curr);
          deferredSet.delete(prNumber);
          return deferredSet;
        });
      }
      return newSet;
    });
  };

  const togglePRDefer = (prNumber: number) => {
    setDeferredPRs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(prNumber)) {
        newSet.delete(prNumber);
      } else {
        newSet.add(prNumber);
        // Remove from completed if adding to deferred
        setCompletedPRs(curr => {
          const completedSet = new Set(curr);
          completedSet.delete(prNumber);
          return completedSet;
        });
      }
      return newSet;
    });
  };

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
        {/* TODO Review Metrics */}
        <div className="p-4 md:p-5 border-b bg-secondary/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Review Progress
            </h3>
            <Badge variant={todoMetrics.remaining === 0 ? "default" : "secondary"} className="gap-1">
              <CheckCheck className="h-3 w-3" />
              {todoMetrics.completed}/{todoMetrics.total}
            </Badge>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">{todoMetrics.percentage}%</span>
            </div>
            <Progress value={todoMetrics.percentage} className="h-2" />
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-primary">{todoMetrics.total}</div>
                <div className="text-xs text-muted-foreground">Total PRs</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-600">{todoMetrics.completed}</div>
                <div className="text-xs text-muted-foreground">Reviewed</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-orange-600">{todoMetrics.deferred}</div>
                <div className="text-xs text-muted-foreground">Deferred</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-amber-600">{todoMetrics.remaining}</div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
            </div>
          </div>
        </div>
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

        {/* Label Filters */}
        {allLabels.length > 0 && (
          <div className="p-4 md:p-5 border-b bg-secondary/10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Filter by Labels</h4>
              {selectedLabels.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLabelFilters}
                  className="text-xs h-6 px-2"
                >
                  Clear ({selectedLabels.size})
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allLabels.map((label) => {
                const isSelected = selectedLabels.has(label);
                return (
                  <Badge
                    key={label}
                    variant={isSelected ? "default" : "secondary"}
                    className={`cursor-pointer transition-all hover:scale-105 ${
                      isSelected ? '' : getLabelColor(label)
                    }`}
                    onClick={() => toggleLabelFilter(label)}
                  >
                    {label}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-4 md:p-5 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center justify-between md:justify-start gap-3">
              <Switch id="filter-drafts" checked={showDrafts} onCheckedChange={(v) => { setShowDrafts(Boolean(v)); setPage(1); }} />
              <Label htmlFor="filter-drafts" className="text-sm">Show Draft PRs</Label>
            </div>
            <div className="flex items-center justify-between md:justify-start gap-3">
              <Switch id="filter-merged" checked={showMerged} onCheckedChange={(v) => { setShowMerged(Boolean(v)); setPage(1); }} />
              <Label htmlFor="filter-merged" className="text-sm">Show Merged PRs</Label>
            </div>
            <div className="flex items-center justify-between md:justify-start gap-3">
              <Switch id="filter-closed" checked={showClosed} onCheckedChange={(v) => { setShowClosed(Boolean(v)); setPage(1); }} />
              <Label htmlFor="filter-closed" className="text-sm">Show Closed PRs</Label>
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
                <div className="flex items-start gap-3 p-4 md:p-5 hover:bg-secondary/50 transition">
                  <div className="flex flex-col gap-2 mt-1">
                    <Checkbox 
                      checked={completedPRs.has(pr.number)}
                      onCheckedChange={() => togglePRCompletion(pr.number)}
                      aria-label={`Mark PR #${pr.number} as completed`}
                    />
                    <Popover open={openDropdown === pr.number} onOpenChange={(open) => setOpenDropdown(open ? pr.number : null)}>
                      <PopoverTrigger asChild>
                        <div 
                          className={`
                            h-4 w-4 shrink-0 rounded-sm border cursor-pointer transition-colors
                            ${deferredPRs.has(pr.number) 
                              ? 'bg-green-600 border-green-600 text-white' 
                              : 'border-green-600 hover:bg-green-50'
                            }
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                          `}
                          role="button"
                          aria-label={`Assign PR #${pr.number} to contributor`}
                          tabIndex={0}
                        >
                          {deferredPRs.has(pr.number) && (
                            <AlertTriangle className="h-3 w-3 text-white m-0.5" />
                          )}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" side="right" align="start">
                        <Command>
                          <CommandInput placeholder="Search contributors..." className="h-9" />
                          <CommandList>
                            <CommandEmpty>No contributors found.</CommandEmpty>
                            <CommandGroup>
                              {contributors.map((contributor) => (
                                <CommandItem
                                  key={contributor.login}
                                  value={contributor.login}
                                  onSelect={() => assignContributor(pr.number, contributor)}
                                  className="flex items-center gap-2"
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={contributor.avatar_url} alt={contributor.login} />
                                    <AvatarFallback>{contributor.login.slice(0, 2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <span>{contributor.login}</span>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {contributor.contributions} contributions
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    className={`flex-1 cursor-pointer transition-all duration-300 ${isSelected ? 'bg-secondary/60 -mx-3 px-3 py-1 rounded' : ''} ${
                      completedPRs.has(pr.number) ? 'opacity-60' : deferredPRs.has(pr.number) ? 'opacity-70 bg-orange-50/30' : ''
                    }`}
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
                        <div className={`font-semibold flex items-center gap-2 transition-all duration-300 ${
                          completedPRs.has(pr.number) ? 'line-through' : ''
                        }`}>
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
                        <div className={`text-sm text-muted-foreground mt-1 transition-all duration-300 ${
                          completedPRs.has(pr.number) ? 'line-through' : ''
                        }`}>
                          by {pr.user?.login} • {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
                        </div>
                        {assignedContributors.has(pr.number) && (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="flex items-center gap-2">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={assignedContributors.get(pr.number)?.avatar_url} alt={assignedContributors.get(pr.number)?.login} />
                                <AvatarFallback>{assignedContributors.get(pr.number)?.login.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs">Assigned to {assignedContributors.get(pr.number)?.login}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAssignedContributor(pr.number);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          </div>
                        )}
                        {pr.labels && pr.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pr.labels.map((label: any) => (
                              <Badge
                                key={label.id}
                                className={`text-xs px-2 py-0 cursor-pointer transition-all hover:scale-105 ${getLabelColor(label.name)}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLabelFilter(label.name);
                                }}
                              >
                                {label.name}
                              </Badge>
                            ))}
                          </div>
                        )}
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
                       {(() => {
                         const approvalStatus = approvalStatuses.get(pr.number);
                         if (!approvalStatus) return null;
                         
                         const { approvals, changesRequested, isApproved } = approvalStatus;
                         
                         if (changesRequested.length > 0) {
                           return (
                             <Badge variant="destructive" className="gap-1 hover-scale shadow-sm">
                               <XCircle className="h-3.5 w-3.5" />
                               <span className="font-medium">Changes Requested</span>
                             </Badge>
                           );
                         }
                         
                         if (isApproved) {
                           return (
                             <Badge variant="default" className="gap-1 hover-scale shadow-sm bg-green-600 hover:bg-green-700">
                               <UserCheck className="h-3.5 w-3.5" />
                               <span className="font-medium">
                                 Approved by {approvals.map(a => a.login).join(', ')}
                               </span>
                             </Badge>
                           );
                         }
                         
                         return null;
                       })()}
                     </div>
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
