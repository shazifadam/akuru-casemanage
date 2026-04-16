"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export default function MfaEnrollPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [qrCode,      setQrCode]      = useState<string | null>(null);
  const [secret,      setSecret]      = useState<string | null>(null);
  const [factorId,    setFactorId]    = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code,        setCode]        = useState("");
  const [loading,     setLoading]     = useState(true);
  const [verifying,   setVerifying]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [done,        setDone]        = useState(false);

  // Enrol a TOTP factor on mount
  useEffect(() => {
    (async () => {
      // Check if a factor already exists (e.g., page refresh)
      const { data: list } = await supabase.auth.mfa.listFactors();
      const existing = list?.totp?.[0];

      if (existing?.status === "verified") {
        // Already enrolled — challenge instead
        router.replace("/mfa");
        return;
      }

      // Start a fresh enrolment
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error || !data) {
        setError("Failed to start MFA enrolment. Please refresh and try again.");
        setLoading(false);
        return;
      }

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);

      // Create a challenge immediately so we're ready to verify
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: data.id });
      if (chErr || !ch) {
        setError("Failed to create MFA challenge. Please refresh.");
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
      setError("Invalid code. Please check your authenticator and try again.");
      setVerifying(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.replace("/dashboard"), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-2">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-semibold">Set up two-factor authentication</h1>
          <p className="text-xs text-muted-foreground">
            Your account requires MFA. Scan the QR code with an authenticator app
            (Google Authenticator, Authy, 1Password, etc.)
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && !done && qrCode && (
          <>
            {/* QR Code */}
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5">
              <div className="rounded-lg overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="MFA QR code" width={180} height={180} />
              </div>
              {secret && (
                <div className="w-full">
                  <p className="text-[10px] text-center text-muted-foreground mb-1">
                    Can't scan? Enter this key manually:
                  </p>
                  <code className="block text-center text-xs font-mono bg-muted rounded px-2 py-1 break-all">
                    {secret}
                  </code>
                </div>
              )}
            </div>

            {/* Verify form */}
            <form onSubmit={handleVerify} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">
                  Enter the 6-digit code from your app
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
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
                {verifying ? "Verifying…" : "Activate MFA"}
              </button>
            </form>
          </>
        )}

        {done && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-medium">MFA activated successfully</p>
            <p className="text-xs text-muted-foreground">Redirecting to dashboard…</p>
          </div>
        )}

        {error && !qrCode && (
          <p className="text-xs text-red-600 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
