"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

interface McqEmptyStateProps {
  onCreateClick: () => void;
}

/**
 * Empty state component displayed when no MCQs are found.
 * Shows a friendly message and a prominent "Create MCQ" button.
 */
export function McqEmptyState({ onCreateClick }: McqEmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="size-8 text-muted-foreground" />
        </div>
        <CardTitle>No MCQs found</CardTitle>
        <CardDescription>
          Get started by creating your first Multiple Choice Question!
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button onClick={onCreateClick} size="lg">
          Create MCQ
        </Button>
      </CardContent>
    </Card>
  );
}
