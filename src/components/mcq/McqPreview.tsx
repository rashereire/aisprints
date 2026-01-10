"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { McqWithChoices, McqAttempt } from "@/lib/schemas/mcq-schema";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface McqPreviewProps {
  mcq: McqWithChoices;
  onSubmit: (selectedChoiceId: string) => Promise<McqAttempt>;
  userAttempts?: McqAttempt[];
}

/**
 * Component for previewing and taking an MCQ.
 * Displays the question, choices, and allows submission.
 * Shows feedback after submission and attempt history.
 */
export function McqPreview({
  mcq,
  onSubmit,
  userAttempts = [],
}: McqPreviewProps) {
  const router = useRouter();
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<McqAttempt | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedChoiceId) return;

    setIsSubmitting(true);
    try {
      const attempt = await onSubmit(selectedChoiceId);
      setLastAttempt(attempt);
      setHasSubmitted(true);
    } catch (error) {
      console.error("Failed to submit attempt:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedChoiceId(null);
    setLastAttempt(null);
    setHasSubmitted(false);
  };

  const selectedChoice = mcq.choices.find((c) => c.id === selectedChoiceId);
  const isCorrect = lastAttempt?.isCorrect ?? false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push("/mcqs")}
          className="gap-2"
        >
          <ArrowLeft className="size-4" />
          Back to List
        </Button>
      </div>

      {/* MCQ Card */}
      <Card>
        <CardHeader>
          <CardTitle>{mcq.title}</CardTitle>
          {mcq.description && (
            <CardDescription>{mcq.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Question */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Question</h3>
            <p className="text-base">{mcq.questionText}</p>
          </div>

          <Separator />

          {/* Choices */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Select an Answer</h3>
            <RadioGroup
              value={selectedChoiceId || ""}
              onValueChange={setSelectedChoiceId}
              disabled={hasSubmitted}
              className="space-y-3"
            >
              {mcq.choices.map((choice, index) => {
                const isSelected = selectedChoiceId === choice.id;
                const showFeedback =
                  hasSubmitted &&
                  lastAttempt &&
                  (choice.id === lastAttempt.selectedChoiceId || choice.isCorrect);

                return (
                  <div
                    key={choice.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-4 transition-colors",
                      isSelected && "border-primary bg-primary/5",
                      !hasSubmitted && "hover:bg-accent",
                      showFeedback &&
                        (choice.isCorrect
                          ? "border-green-500 bg-green-50 dark:bg-green-950"
                          : choice.id === lastAttempt?.selectedChoiceId
                            ? "border-red-500 bg-red-50 dark:bg-red-950"
                            : "")
                    )}
                  >
                    <RadioGroupItem
                      value={choice.id}
                      id={`preview-choice-${choice.id}`}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={`preview-choice-${choice.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <span>{choice.choiceText}</span>
                        {showFeedback && choice.isCorrect && (
                          <CheckCircle2 className="ml-auto size-5 text-green-600 dark:text-green-400" />
                        )}
                        {showFeedback &&
                          !choice.isCorrect &&
                          choice.id === lastAttempt?.selectedChoiceId && (
                            <XCircle className="ml-auto size-5 text-red-600 dark:text-red-400" />
                          )}
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Feedback */}
          {hasSubmitted && lastAttempt && (
            <>
              <Separator />
              <div
                className={cn(
                  "rounded-lg border p-4",
                  isCorrect
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : "border-red-500 bg-red-50 dark:bg-red-950"
                )}
              >
                <div className="flex items-center gap-2">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
                      <span className="font-semibold text-green-700 dark:text-green-300">
                        Correct!
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-5 text-red-600 dark:text-red-400" />
                      <span className="font-semibold text-red-700 dark:text-red-300">
                        Incorrect
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isCorrect
                    ? "Great job! You selected the correct answer."
                    : `The correct answer was: ${mcq.choices.find((c) => c.isCorrect)?.choiceText}`}
                </p>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!hasSubmitted ? (
              <Button
                onClick={handleSubmit}
                disabled={!selectedChoiceId || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? "Submitting..." : "Submit Answer"}
              </Button>
            ) : (
              <Button onClick={handleReset} variant="outline" className="w-full">
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attempt History */}
      {userAttempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Attempt History</CardTitle>
            <CardDescription>
              View your previous attempts for this MCQ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userAttempts.map((attempt) => {
                const attemptChoice = mcq.choices.find(
                  (c) => c.id === attempt.selectedChoiceId
                );
                return (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {attempt.isCorrect ? (
                        <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="size-5 text-red-600 dark:text-red-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          Selected: {attemptChoice?.choiceText}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(attempt.attemptedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={attempt.isCorrect ? "default" : "destructive"}
                    >
                      {attempt.isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
