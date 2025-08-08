import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export type PRQuery = {
  owner: string;
  repo: string;
  number: number;
  token?: string;
};

type Props = {
  onSearch: (q: PRQuery) => void;
  loading?: boolean;
};

const parseRepo = (s: string) => {
  const [owner, repo] = s.split('/');
  if (!owner || !repo) return null;
  return { owner, repo };
};

export function PRSearch({ onSearch, loading }: Props) {
  const [repoFull, setRepoFull] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [token, setToken] = useState('');
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('gh_token');
    if (saved) setToken(saved);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseRepo(repoFull.trim());
    const num = Number(prNumber);
    if (!parsed || !num) return;
    if (remember && token) localStorage.setItem('gh_token', token);
    onSearch({ owner: parsed.owner, repo: parsed.repo, number: num, token: token || undefined });
  };

  return (
    <Card className="card-elevated">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-6">
          <div className="md:col-span-3">
            <Label htmlFor="repo">Repository</Label>
            <Input id="repo" placeholder="owner/repo (e.g. vercel/next.js)" value={repoFull} onChange={e => setRepoFull(e.target.value)} />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="pr">PR #</Label>
            <Input id="pr" inputMode="numeric" pattern="[0-9]*" placeholder="1234" value={prNumber} onChange={e => setPrNumber(e.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="token">GitHub Token (optional)</Label>
            <Input id="token" type="password" placeholder="ghp_..." value={token} onChange={e => setToken(e.target.value)} />
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <input id="remember" type="checkbox" className="h-4 w-4 accent-primary" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <label htmlFor="remember">Remember token in this browser</label>
            </div>
          </div>
          <div className="md:col-span-6 flex justify-end">
            <Button type="submit" variant="hero" disabled={loading}>
              {loading ? 'Loading…' : 'Build Timeline'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
