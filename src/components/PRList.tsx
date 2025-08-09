import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

type Props = {
  prs: any[];
  onSelect: (number: number) => void;
  selected?: number;
};

export function PRList({ prs, onSelect, selected }: Props) {
  const items = [...prs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Card className="card-elevated">
      <CardContent className="p-0">
        <ol className="divide-y divide-border">
          {items.map((pr: any) => {
            const isSelected = selected === pr.number;
            const state = pr.merged_at ? 'merged' : pr.state;
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
                      <Badge variant={state === 'open' ? 'default' : state === 'merged' ? 'secondary' : 'outline'} className="capitalize">
                        {state}
                      </Badge>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
