import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookLoopProvider } from '@/components/BookLoopProvider';
import { useBookLoopState } from '@/hooks/useBookLoopState';
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
localStorage.setItem('feature_flag_overrides', JSON.stringify({ server_book_loop_enabled: true }));
export function Editor({ userId }: { userId: string }) {
  const { state, persist } = useBookLoopState('crm', userId, '2026-10-19');
  const [move, setMove] = useState(state.move);
  const [status, setStatus] = useState('');
  useEffect(() => setMove(state.move), [state.move]);
  return <><p data-testid="saved-move">{state.move || '(empty)'}</p><label>Move<input value={move} onChange={e => setMove(e.target.value)} /></label><button onClick={async () => setStatus(await persist(s => ({ ...s, move })) ? 'Saved' : 'Failed')}>Save</button><p role="status">{status}</p></>;
}
export function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  useEffect(() => { void supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null)); }, []);
  if (!userId) return <form onSubmit={async e => { e.preventDefault(); const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setError(error.message); else setUserId(data.user.id); }}><label>Email<input value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} /></label><button>Sign in</button><p role="alert">{error}</p></form>;
  return <BookLoopProvider userId={userId}><Editor userId={userId} /><button onClick={async () => { await supabase.auth.signOut(); setUserId(null); }}>Sign out</button></BookLoopProvider>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><App /></QueryClientProvider>);
