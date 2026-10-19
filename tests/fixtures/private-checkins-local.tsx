import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PrivateCheckinCard } from '@/components/wellness/PrivateCheckinCard';
import { ReviewDayInvite } from '@/components/formation/ReviewDayInvite';
import '@/index.css';
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
export function PrivateCheckinLocalApp() {
  const [userId,setUserId]=useState<string|null>(null);
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  useEffect(()=>{void supabase.auth.getSession().then(({data})=>setUserId(data.session?.user.id??null));},[]);
  if (!userId) return <form onSubmit={async e=>{e.preventDefault();const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;setUserId(data.user.id);}}><label>Email<input value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button>Sign in</button></form>;
  return <main className="mx-auto max-w-3xl space-y-4 p-4"><PrivateCheckinCard userId={userId}/><ReviewDayInvite dayNumber={7}/></main>;
}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><PrivateCheckinLocalApp/></QueryClientProvider>);
