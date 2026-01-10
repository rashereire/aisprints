"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { McqForm } from "@/components/mcq/McqForm";
import type { McqWithChoices, McqCreateInput } from "@/lib/schemas/mcq-schema";
import { toast } from "sonner";

interface McqEditClientProps {
  mcq: McqWithChoices;
}

/**
 * Client component for editing an MCQ.
 * Handles form submission and API calls.
 */
export function McqEditClient({ mcq }: McqEditClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: McqCreateInput) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/mcqs/${mcq.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (response.status === 403) {
          toast.error("You don't have permission to edit this MCQ");
          return;
        }
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || "Failed to update MCQ");
      }

      toast.success("MCQ updated successfully!");
      router.push("/mcqs");
    } catch (error) {
      console.error("Error updating MCQ:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update MCQ. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/mcqs");
  };

  return (
    <McqForm
      initialData={mcq}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
    />
  );
}
