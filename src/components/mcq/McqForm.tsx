"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { mcqCreateSchema, type McqCreateInput, type McqWithChoices } from "@/lib/schemas/mcq-schema";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeksMcqGeneratorDialog } from "./TeksMcqGeneratorDialog";

interface McqFormProps {
  initialData?: McqWithChoices;
  onSubmit: (data: McqCreateInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/**
 * Form component for creating or editing MCQs.
 * Uses React Hook Form with Zod validation.
 * Supports dynamic choices (2-4) with exactly one correct answer.
 */
export function McqForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: McqFormProps) {
  const [isTeksDialogOpen, setIsTeksDialogOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
    watch,
  } = useForm<McqCreateInput>({
    resolver: zodResolver(mcqCreateSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          description: initialData.description || undefined,
          questionText: initialData.questionText,
          choices: initialData.choices.map((choice) => ({
            choiceText: choice.choiceText,
            isCorrect: choice.isCorrect,
            displayOrder: choice.displayOrder,
          })),
        }
      : {
          title: "",
          description: undefined,
          questionText: "",
          choices: [
            { choiceText: "", isCorrect: true, displayOrder: 0 },
            { choiceText: "", isCorrect: false, displayOrder: 1 },
          ],
        },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "choices",
  });

  const watchedChoices = watch("choices");
  const correctChoiceIndex = watchedChoices.findIndex((c) => c.isCorrect);

  const handleCorrectAnswerChange = (index: number) => {
    // Update all choices to set isCorrect based on the selected index
    watchedChoices.forEach((_, i) => {
      setValue(`choices.${i}.isCorrect`, i === index, { shouldValidate: true });
    });
  };

  const handleAddChoice = () => {
    if (fields.length < 4) {
      append({
        choiceText: "",
        isCorrect: false,
        displayOrder: fields.length,
      });
    }
  };

  const handleRemoveChoice = (index: number) => {
    if (fields.length > 2) {
      const wasCorrect = correctChoiceIndex === index;
      remove(index);
      // If we removed the correct answer, set the first remaining choice as correct
      if (wasCorrect && fields.length > 1) {
        setValue(`choices.0.isCorrect`, true, { shouldValidate: true });
      }
    }
  };

  const onFormSubmit = async (data: McqCreateInput) => {
    // Ensure displayOrder is set correctly
    const choicesWithOrder = data.choices.map((choice, index) => ({
      ...choice,
      displayOrder: index,
    }));
    await onSubmit({ ...data, choices: choicesWithOrder });
  };

  // Handle TEKS-generated MCQ
  const handleTeksGenerated = (mcq: McqCreateInput) => {
    console.log('handleTeksGenerated called with MCQ:', mcq);
    
    try {
      // Populate form with generated MCQ
      console.log('Setting form values...');
      setValue("title", mcq.title);
      setValue("description", mcq.description || undefined);
      setValue("questionText", mcq.questionText);
      console.log('Form values set');
      
      // Remove all existing choices - use a safer approach
      console.log('Current fields length:', fields.length);
      // Remove from the end to avoid index shifting issues
      for (let i = fields.length - 1; i >= 0; i--) {
        console.log(`Removing field at index ${i}`);
        remove(i);
      }
      console.log('All fields removed');
      
      // Add all generated choices
      console.log('Adding generated choices, count:', mcq.choices.length);
      mcq.choices.forEach((choice, index) => {
        console.log(`Adding choice ${index}:`, choice);
        append({
          choiceText: choice.choiceText,
          isCorrect: choice.isCorrect,
          displayOrder: choice.displayOrder ?? index,
        });
      });
      console.log('All choices added, handleTeksGenerated complete');
    } catch (error) {
      console.error('Error in handleTeksGenerated:', error);
      throw error;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{initialData ? "Edit MCQ" : "Create MCQ"}</CardTitle>
              <CardDescription>
                {initialData
                  ? "Update the multiple choice question details below."
                  : "Fill in the details to create a new multiple choice question."}
              </CardDescription>
            </div>
            {!initialData && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTeksDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate with TEKS
              </Button>
            )}
          </div>
        </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          <FieldGroup>
            {/* Title Field */}
            <Field data-invalid={!!errors.title}>
              <FieldLabel>
                Title <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                {...register("title")}
                placeholder="Enter MCQ title"
                aria-invalid={!!errors.title}
              />
              {errors.title && (
                <FieldError>{errors.title.message}</FieldError>
              )}
              <FieldDescription>
                A brief title for this MCQ (1-200 characters)
              </FieldDescription>
            </Field>

            {/* Description Field */}
            <Field data-invalid={!!errors.description}>
              <FieldLabel>Description (Optional)</FieldLabel>
              <Textarea
                {...register("description")}
                placeholder="Enter description (optional)"
                rows={3}
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <FieldError>{errors.description.message}</FieldError>
              )}
              <FieldDescription>
                Additional context or instructions (max 500 characters)
              </FieldDescription>
            </Field>

            {/* Question Text Field */}
            <Field data-invalid={!!errors.questionText}>
              <FieldLabel>
                Question Text <span className="text-destructive">*</span>
              </FieldLabel>
              <Textarea
                {...register("questionText")}
                placeholder="Enter the question"
                rows={4}
                aria-invalid={!!errors.questionText}
              />
              {errors.questionText && (
                <FieldError>{errors.questionText.message}</FieldError>
              )}
              <FieldDescription>
                The actual question to be answered (1-1000 characters)
              </FieldDescription>
            </Field>

            {/* Choices Section */}
            <Field data-invalid={!!errors.choices}>
              <FieldLabel>
                Choices <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>
                Add 2-4 choices. Exactly one must be marked as correct.
              </FieldDescription>
              <RadioGroup
                value={correctChoiceIndex.toString()}
                onValueChange={(value) => handleCorrectAnswerChange(parseInt(value, 10))}
                className="space-y-3"
              >
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-start gap-3 rounded-md border p-4"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={index.toString()} id={`choice-${index}`} />
                        <Label
                          htmlFor={`choice-${index}`}
                          className="text-sm font-medium cursor-pointer flex items-center gap-2"
                        >
                          Choice {index + 1}
                          {correctChoiceIndex === index && (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              (Correct Answer)
                            </span>
                          )}
                        </Label>
                      </div>
                      <Input
                        {...register(`choices.${index}.choiceText`)}
                        placeholder={`Enter choice ${index + 1} text`}
                        aria-invalid={!!errors.choices?.[index]?.choiceText}
                        className="mt-2"
                      />
                      {errors.choices?.[index]?.choiceText && (
                        <p className="text-sm text-destructive">
                          {errors.choices[index]?.choiceText?.message}
                        </p>
                      )}
                    </div>
                    {fields.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveChoice(index)}
                        aria-label={`Remove choice ${index + 1}`}
                        className="mt-1"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </RadioGroup>
              {errors.choices && typeof errors.choices.message === "string" && (
                <FieldError>{errors.choices.message}</FieldError>
              )}
              {fields.length < 4 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddChoice}
                  className="w-full"
                >
                  <Plus className="mr-2 size-4" />
                  Add Choice
                </Button>
              )}
            </Field>
          </FieldGroup>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Saving..." : initialData ? "Update MCQ" : "Create MCQ"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    
    {/* TEKS Generator Dialog */}
    {!initialData && (
      <TeksMcqGeneratorDialog
        open={isTeksDialogOpen}
        onOpenChange={setIsTeksDialogOpen}
        onSuccess={handleTeksGenerated}
      />
    )}
    </>
  );
}
