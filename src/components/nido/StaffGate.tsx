import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COORDINATOR_EMAIL = "coordinator@nidoabierto.org";

/** Shared-password gate for coordinator tools. The real protection is server-side: serverFns require this session. */
export function StaffGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;
    void import("@/integrations/supabase/client").then(({ supabase }) => {
      if (cancelled) return;
      void supabase.auth.getSession().then(({ data }) => { if (!cancelled) setSession(data.session); });
      const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.auth.signInWithPassword({ email: COORDINATOR_EMAIL, password });
    setBusy(false);
    if (error) toast.error("Wrong password."); else setPassword("");
  }

  if (session === undefined) return null;
  if (!session) {
    return (
      <form onSubmit={signIn} className="mx-auto mt-10 max-w-sm space-y-3 rounded-xl bg-card p-6 shadow-card">
        <h2 className="text-xl font-semibold">Coordinator sign-in</h2>
        <p className="text-sm text-muted-foreground">Enter the shared coordinator password to review documents and publish to the open books.</p>
        <Input type="password" aria-label="Coordinator password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" className="w-full" disabled={busy || !password}>Sign in</Button>
      </form>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={async () => { const { supabase } = await import("@/integrations/supabase/client"); await supabase.auth.signOut(); }}>Sign out</Button></div>
      {children}
    </div>
  );
}
