import { format } from 'date-fns';

type Props = {
  author: string;
  by?: string;
  at: string;
  body?: string;
};

export function CommentBubble({ author, by, at, body }: Props) {
  const isAuthor = by && by.toLowerCase() === author?.toLowerCase();
  return (
    <div className={`flex ${isAuthor ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[48ch] md:max-w-[64ch] rounded-lg px-4 py-3 shadow-sm ${isAuthor ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'}`}>
        <div className="text-xs opacity-80 mb-1">
          <span className="font-medium">{by || 'unknown'}</span>
          <span className="mx-2">•</span>
          <time>{format(new Date(at), 'PPpp')}</time>
        </div>
        {body ? <p className="text-sm leading-relaxed">{body}</p> : null}
      </div>
    </div>
  );
}
