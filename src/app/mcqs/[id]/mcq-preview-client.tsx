"use client";

import { useState } from "react";
import { McqPreview } from "@/components/mcq/McqPreview";
import type { McqWithChoices, McqAttempt } from "@/lib/schemas/mcq-schema";
import { toast } from "sonner";

interface McqPreviewClientProps {
  mcq: McqWithChoices;
  userId: string | null;
  initialAttempts: McqAttempt[];
}

/**
 * Client component wrapper for McqPreview.
 * Handles attempt submission and state management.
 */
export function McqPreviewClient({
  mcq,
  userId,
  initialAttempts,
}: McqPreviewClientProps) {
  const [attempts, setAttempts] = useState<McqAttempt[]>(initialAttempts);

  const handleSubmit = async (selectedChoiceId: string): Promise<McqAttempt> => {
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const response = await fetch(`/api/mcqs/${mcq.id}/attempt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ selectedChoiceId }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required");
      }
      const errorData = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(errorData.error || "Failed to submit attempt");
    }

    const attempt: McqAttempt = await response.json();
    
    // Add new attempt to the list
    setAttempts((prev) => [attempt, ...prev]);
    
    return attempt;
  };

  return (
    <McqPreview
      mcq={mcq}
      onSubmit={handleSubmit}
      userAttempts={attempts}
    />
  );
}
