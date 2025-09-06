import { TimelineEvent } from '@/lib/github';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GitPullRequest, GitMerge, CheckCircle2, XCircle, Clock, UserCheck, MessageSquare, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { format, formatDistanceToNow, differenceInHours, differenceInMinutes } from 'date-fns';
import { useState } from 'react';

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
  const reviewEvents = events.filter(e => e.type === 'review');
  const firstReview = reviewEvents.length > 0 ? reviewEvents[0] : null;
  const approved = reviewEvents.find(e => e.state === 'APPROVED');
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

const formatRichText = (text: string) => {
  if (!text) return null;
  
  // Convert markdown-like formatting to JSX elements
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|https?:\/\/[^\s]+)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{part.slice(1, -1)}</code>;
    }
    if (part.match(/^https?:\/\/[^\s]+$/)) {
      return <a key={index} href={part} target="_blank" rel="noopener" className="text-primary hover:underline break-all">{part}</a>;
    }
    return part;
  });
};

const getEventColor = (event: TimelineEvent) => {
  switch (event.type) {
    case 'opened':
      return 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400';
    case 'review_requested':
      return 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400';
    case 'review':
      if (event.state === 'APPROVED') return 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400';
      if (event.state === 'CHANGES_REQUESTED') return 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400';
      return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400';
    case 'merged':
      return 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-400';
    case 'closed':
      return 'bg-gray-500/10 border-gray-500/20 text-gray-700 dark:text-gray-400';
    case 'comment':
      return 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400';
    default:
      return 'bg-muted/50 border-border text-foreground';
  }
};

const getIconColor = (event: TimelineEvent) => {
  switch (event.type) {
    case 'opened':
      return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
    case 'review_requested':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
    case 'review':
      if (event.state === 'APPROVED') return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      if (event.state === 'CHANGES_REQUESTED') return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400';
    case 'merged':
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
    case 'closed':
      return 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400';
    case 'comment':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function ReviewTimeline({ events, owner, repo, number }: Props) {
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const author = events.find((e) => e.type === 'opened')?.by ?? '';
  const metrics = calculateReviewMetrics(events);

  const toggleComment = (index: number) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedComments(newExpanded);
  };

  return (
    <Card className="card-elevated shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">{owner}/{repo} • PR #{number}</span>
          </div>
          <a 
            className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline transition-colors" 
            href={`https://github.com/${owner}/${repo}/pull/${number}`} 
            target="_blank" 
            rel="noreferrer"
          >
            <ExternalLink className="h-3 w-3" />
            View on GitHub
          </a>
        </CardTitle>
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-border/50">
            <div className="text-center group hover:scale-105 transition-transform">
              <div className="text-3xl font-bold text-primary mb-1">{metrics.timeToFirstReview ? formatDuration(metrics.timeToFirstReview) : 'N/A'}</div>
              <div className="text-sm text-muted-foreground">Time to first review</div>
            </div>
            <div className="text-center group hover:scale-105 transition-transform">
              <div className="text-3xl font-bold text-primary mb-1">{metrics.timeToApproval ? formatDuration(metrics.timeToApproval) : 'N/A'}</div>
              <div className="text-sm text-muted-foreground">Time to approval</div>
            </div>
            <div className="text-center group hover:scale-105 transition-transform">
              <div className="text-3xl font-bold text-primary mb-1">{formatDuration(metrics.totalTime)}</div>
              <div className="text-sm text-muted-foreground">Total time ({metrics.status})</div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-primary/20 to-transparent"></div>
          
          <div className="space-y-6">
            {events.map((event, idx) => {
              const meta = eventMeta(event);
              const Icon = meta.icon;
              const isComment = event.type === 'comment' && event.body;
              const isExpanded = expandedComments.has(idx);
              const hasLongComment = event.body && event.body.length > 150;
              
              return (
                <div 
                  key={idx} 
                  className="relative flex items-start gap-4 group animate-fade-in hover:bg-muted/30 rounded-lg p-3 transition-all duration-200"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {/* Timeline dot with icon */}
                  <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full border-2 border-background shadow-md flex items-center justify-center ${getIconColor(event)} transition-all duration-200 group-hover:scale-110`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Event header */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{meta.label}</span>
                        {event.by && (
                          <>
                            <span className="text-muted-foreground">by</span>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {event.by.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-primary">{event.by}</span>
                          </>
                        )}
                      </div>
                      <Badge variant="outline" className={getEventColor(event)}>
                        {format(new Date(event.at), 'MMM d, HH:mm')}
                      </Badge>
                    </div>
                    
                    {/* Relative time */}
                    <div className="text-xs text-muted-foreground mb-3">
                      {formatDistanceToNow(new Date(event.at), { addSuffix: true })}
                    </div>
                    
                    {/* Comment content */}
                    {event.body && (
                      <div className="mt-3">
                        {isComment ? (
                          <div className="bg-gradient-to-br from-card to-muted/30 border border-border/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium text-foreground">Comment</span>
                              </div>
                              {hasLongComment && (
                                <button
                                  onClick={() => toggleComment(idx)}
                                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                                >
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  {isExpanded ? 'Show less' : 'Show more'}
                                </button>
                              )}
                            </div>
                            <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed">
                              {hasLongComment && !isExpanded ? (
                                <>
                                  <div>{formatRichText(event.body.slice(0, 150))}</div>
                                  <span className="text-muted-foreground">...</span>
                                </>
                              ) : (
                                <div>{formatRichText(event.body)}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-foreground/80 bg-muted/50 rounded-lg p-3 border-l-4 border-primary/30">
                            {formatRichText(event.body)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}