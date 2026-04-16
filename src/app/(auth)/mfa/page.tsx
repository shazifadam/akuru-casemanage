"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function MfaChallengePage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [factorId,    setFactorId]    = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code,        setCode]        = useState("");
  const [loading,     setLoading]     = useState(true);
  const [verifying,   setVerifying]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Get the enrolled TOTP factor and issue a challenge
  useEffect(() => {
    (async () => {
      const { data: list, error: listErr } = await supabase.auth.mfa.listFactors();
      if (listErr || !list?.totp?.length) {
        // No enrolled factors — send to enrolment
        router.replace("/mfa-enroll");
        return;
      }

      const factor = list.totp.find((f) => f.status === "verified");
      if (!factor) {
        router.replace("/mfa-enroll");
        return;
      }

      setFactorId(factor.id);

      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });

      if (chErr || !ch) {
        setError("Could not start MFA challenge. Please refresh the page.");
        setLoading(false);
        return;
      }

      setChallengeId(ch.id);
      setLoading(false);
    })();
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || !challengeId) return;
    setVerifying(true);
    setError(null);

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.replace(/\s/g, ""),
    });

    if (error) {
      setError("Invalid code. Please try again.");
      setVerifying(false);
      // Re-issue challenge — previous one is consumed
      const { data: ch } = await supabase.auth.mfa.challenge({ factorId });
      if (ch) setChallengeId(ch.id);
      return;
    }

    // aal2 achieved — go to dashboard
    router.replace("/dashboard");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-xs space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-2">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-semibold">Two-factor verification</h1>
          <p className="text-xs text-muted-foreground">
            Enter the 6-digit code from your authenticator app to continue.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Authenticator code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
              {verifying ? "Verifying…" : "Continue"}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
            >
              Sign out and use a different account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
