"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { McqForm } from "@/components/mcq/McqForm";
import type { McqCreateInput } from "@/lib/schemas/mcq-schema";
import { toast } from "sonner";

/**
 * Page for creating a new MCQ.
 * Requires authentication and redirects to login if not authenticated.
 */
export default function NewMcqPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          router.push("/login");
          return;
        }
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error checking authentication:", error);
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (data: McqCreateInput) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/mcqs", {
        method: "POST",
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
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || "Failed to create MCQ");
      }

      toast.success("MCQ created successfully!");
      router.push("/mcqs");
    } catch (error) {
      console.error("Error creating MCQ:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create MCQ. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/mcqs");
  };

  if (isAuthenticated === null) {
    return (
      <div className="container mx-auto p-6 md:p-10">
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto p-6 md:p-10">
      <McqForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
