"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { teksData, type TeksSubject, type TeksGrade, type TeksStrand, type TeksStandard } from "@/lib/services/TEKS";
import { type McqCreateInput } from "@/lib/schemas/mcq-schema";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeksMcqGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (mcq: McqCreateInput) => void;
}

/**
 * Dialog component for generating MCQs aligned with TEKS standards.
 * Provides cascading dropdowns to select Subject → Grade → Strand → Standard,
 * and a text input for topic description.
 */
export function TeksMcqGeneratorDialog({
  open,
  onOpenChange,
  onSuccess,
}: TeksMcqGeneratorDialogProps) {
  // Form state
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedStrand, setSelectedStrand] = useState<string>("");
  const [selectedStandard, setSelectedStandard] = useState<string>("");
  const [topicDescription, setTopicDescription] = useState<string>("");
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtered data based on selections
  const availableGrades = useMemo(() => {
    if (!selectedSubject) return [];
    const subject = teksData.find((s) => s.subject === selectedSubject);
    return subject?.grades || [];
  }, [selectedSubject]);

  const availableStrands = useMemo(() => {
    if (!selectedSubject || !selectedGrade) return [];
    const subject = teksData.find((s) => s.subject === selectedSubject);
    const grade = subject?.grades.find((g) => g.level === selectedGrade);
    return grade?.strands || [];
  }, [selectedSubject, selectedGrade]);

  const availableStandards = useMemo(() => {
    if (!selectedSubject || !selectedGrade || !selectedStrand) return [];
    const subject = teksData.find((s) => s.subject === selectedSubject);
    const grade = subject?.grades.find((g) => g.level === selectedGrade);
    const strand = grade?.strands.find((s) => s.name === selectedStrand);
    return strand?.standards || [];
  }, [selectedSubject, selectedGrade, selectedStrand]);

  // Get selected standard details
  const selectedStandardDetails = useMemo(() => {
    if (!selectedStandard) return null;
    return availableStandards.find((s) => s.code === selectedStandard) || null;
  }, [selectedStandard, availableStandards]);

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setSelectedSubject("");
      setSelectedGrade("");
      setSelectedStrand("");
      setSelectedStandard("");
      setTopicDescription("");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  // Handle cascading dropdown changes
  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    setSelectedGrade("");
    setSelectedStrand("");
    setSelectedStandard("");
  };

  const handleGradeChange = (value: string) => {
    setSelectedGrade(value);
    setSelectedStrand("");
    setSelectedStandard("");
  };

  const handleStrandChange = (value: string) => {
    setSelectedStrand(value);
    setSelectedStandard("");
  };

  // Validate form
  const isFormValid = useMemo(() => {
    return (
      selectedSubject !== "" &&
      selectedGrade !== "" &&
      selectedStrand !== "" &&
      selectedStandard !== "" &&
      topicDescription.trim().length >= 10
    );
  }, [selectedSubject, selectedGrade, selectedStrand, selectedStandard, topicDescription]);

  // Handle form submission
  const handleGenerate = async () => {
    if (!isFormValid || !selectedStandardDetails) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/mcqs/generate-teks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: selectedSubject,
          gradeLevel: selectedGrade,
          strandName: selectedStrand,
          standardCode: selectedStandardDetails.code,
          standardDescription: selectedStandardDetails.description,
          topicDescription: topicDescription.trim(),
        }),
      });

      // Parse response once - response body can only be read once
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      let responseData;
      try {
        const text = await response.text();
        console.log('Response text length:', text.length);
        console.log('Response text preview (first 500 chars):', text.substring(0, 500));
        
        responseData = JSON.parse(text);
        console.log('Parsed response data:', responseData);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error(`Failed to parse response (${response.status})`);
      }

      if (!response.ok) {
        const errorData = responseData as {
          error?: string;
          details?: unknown;
        };
        throw new Error(
          errorData.error || `Failed to generate MCQ (${response.status})`
        );
      }

      const generatedMcq = responseData as McqCreateInput;
      console.log('Generated MCQ:', generatedMcq);
      console.log('Calling onSuccess callback...');

      // Call success callback
      try {
        onSuccess(generatedMcq);
        console.log('onSuccess callback completed');
      } catch (callbackError) {
        console.error('Error in onSuccess callback:', callbackError);
        throw callbackError;
      }

      // Close dialog
      console.log('Closing dialog...');
      handleOpenChange(false);
      console.log('Dialog closed');
    } catch (err) {
      console.error("Error generating MCQ:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate MCQ with TEKS Standards</DialogTitle>
          <DialogDescription>
            Select a TEKS standard and provide a topic description to generate
            an aligned multiple choice question.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Subject Dropdown */}
          <Field>
            <FieldLabel htmlFor="subject">Subject</FieldLabel>
            <select
              id="subject"
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <option value="">Select a subject...</option>
              {teksData.map((subject) => (
                <option key={subject.subject} value={subject.subject}>
                  {subject.subject}
                </option>
              ))}
            </select>
          </Field>

          {/* Grade Level Dropdown */}
          <Field>
            <FieldLabel htmlFor="grade">Grade Level</FieldLabel>
            <select
              id="grade"
              value={selectedGrade}
              onChange={(e) => handleGradeChange(e.target.value)}
              disabled={!selectedSubject}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <option value="">
                {selectedSubject
                  ? "Select a grade level..."
                  : "Select a subject first..."}
              </option>
              {availableGrades.map((grade) => (
                <option key={grade.level} value={grade.level}>
                  {grade.level}
                </option>
              ))}
            </select>
          </Field>

          {/* Strand Dropdown */}
          <Field>
            <FieldLabel htmlFor="strand">Strand</FieldLabel>
            <select
              id="strand"
              value={selectedStrand}
              onChange={(e) => handleStrandChange(e.target.value)}
              disabled={!selectedGrade}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <option value="">
                {selectedGrade
                  ? "Select a strand..."
                  : "Select a grade level first..."}
              </option>
              {availableStrands.map((strand) => (
                <option key={strand.name} value={strand.name}>
                  {strand.name}
                </option>
              ))}
            </select>
          </Field>

          {/* Standard Dropdown */}
          <Field>
            <FieldLabel htmlFor="standard">TEKS Standard</FieldLabel>
            <select
              id="standard"
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              disabled={!selectedStrand}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <option value="">
                {selectedStrand
                  ? "Select a standard..."
                  : "Select a strand first..."}
              </option>
              {availableStandards.map((standard) => (
                <option key={standard.code} value={standard.code}>
                  {standard.code}: {standard.description}
                </option>
              ))}
            </select>
            {selectedStandardDetails && (
              <FieldDescription>
                <strong>{selectedStandardDetails.code}:</strong>{" "}
                {selectedStandardDetails.description}
              </FieldDescription>
            )}
          </Field>

          {/* Topic Description Input */}
          <Field>
            <FieldLabel htmlFor="topic">Topic Description</FieldLabel>
            <Textarea
              id="topic"
              placeholder="e.g., photosynthesis in plants, decomposing problems using flowcharts..."
              value={topicDescription}
              onChange={(e) => setTopicDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <FieldDescription>
              Provide a brief description of the specific topic or subject matter
              (10-500 characters). This helps generate a focused question.
            </FieldDescription>
            {topicDescription.trim().length > 0 &&
              topicDescription.trim().length < 10 && (
                <FieldError
                  errors={[
                    {
                      message: "Topic description must be at least 10 characters",
                    },
                  ]}
                />
              )}
          </Field>

          {/* Error Display */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate MCQ"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
