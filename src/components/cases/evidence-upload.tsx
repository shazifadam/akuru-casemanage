"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Paperclip, Loader2, CheckCircle2 } from "lucide-react";
import { addCaseEvidence } from "@/lib/actions/cases";

interface EvidenceUploadProps {
  caseId: string;
  caseNumber: string;
}

export function EvidenceUpload({ caseId, caseNumber }: EvidenceUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const path = `cases/${caseNumber}/${Date.now()}-${file.name}`;

    const { data, error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(path, file);

    if (uploadError) {
      setError("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("evidence")
      .getPublicUrl(data.path);

    setUploading(false);

    startTransition(async () => {
      try {
        await addCaseEvidence(caseId, urlData.publicUrl, file.name);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to log evidence");
      }
      // Reset file input
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  const isLoading = uploading || isPending;

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={isLoading}
      />
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={() => fileRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : success ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <Paperclip className="h-3.5 w-3.5" />
        )}
        {uploading ? "Uploading..." : isPending ? "Saving..." : success ? "Uploaded!" : "Upload Evidence"}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
