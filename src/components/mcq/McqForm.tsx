"use client";

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
import { mcqCreateSchema, type McqCreateInput, type McqWithChoices } from "@/lib/schemas/mcq-schema";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit MCQ" : "Create MCQ"}</CardTitle>
        <CardDescription>
          {initialData
            ? "Update the multiple choice question details below."
            : "Fill in the details to create a new multiple choice question."}
        </CardDescription>
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
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-start gap-3 rounded-md border p-3"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={correctChoiceIndex === index}
                          onChange={() => handleCorrectAnswerChange(index)}
                          className="size-4"
                          aria-label={`Mark choice ${index + 1} as correct`}
                        />
                        <label className="text-sm font-medium">
                          Choice {index + 1}
                          {correctChoiceIndex === index && (
                            <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                              (Correct Answer)
                            </span>
                          )}
                        </label>
                      </div>
                      <Input
                        {...register(`choices.${index}.choiceText`)}
                        placeholder={`Enter choice ${index + 1} text`}
                        aria-invalid={!!errors.choices?.[index]?.choiceText}
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
              </div>
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
  );
}
