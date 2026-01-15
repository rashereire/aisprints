"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { McqActionMenu } from "./McqActionMenu";
import type { McqWithChoices } from "@/lib/schemas/mcq-schema";
import { cn } from "@/lib/utils";

interface McqTableProps {
  mcqs: McqWithChoices[];
  isLoading?: boolean;
  onEdit?: (mcqId: string) => void;
  onDelete?: (mcqId: string) => void;
}

/**
 * Table component for displaying MCQs.
 * Shows title, description, question text, choice count, created date, and actions.
 * Rows are clickable to navigate to the MCQ detail page.
 */
export function McqTable({
  mcqs,
  isLoading = false,
  onEdit,
  onDelete,
}: McqTableProps) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return "Today";
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const handleRowClick = (mcqId: string) => {
    router.push(`/mcqs/${mcqId}`);
  };

  const handleEdit = (mcqId: string) => {
    if (onEdit) {
      onEdit(mcqId);
    } else {
      router.push(`/mcqs/${mcqId}/edit`);
    }
  };

  const handleDelete = (mcqId: string) => {
    if (onDelete) {
      onDelete(mcqId);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <Card className="px-6">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Choices</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </Card>
      </div>
    );
  }

  if (mcqs.length === 0) {
    return null; // Empty state is handled by parent component
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Card className="px-6">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-12">Title</TableHead>
            <TableHead className="h-12">Description</TableHead>
            <TableHead className="h-12">Question</TableHead>
            <TableHead className="h-12">Choices</TableHead>
            <TableHead className="h-12">Created</TableHead>
            <TableHead className="h-12 w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mcqs.map((mcq) => (
            <TableRow
              key={mcq.id}
              className={cn(
                "cursor-pointer transition-colors",
                "hover:bg-muted/50"
              )}
              onClick={() => handleRowClick(mcq.id)}
            >
              <TableCell className="font-medium">{mcq.title}</TableCell>
              <TableCell className="max-w-[200px]">
                <span
                  title={mcq.description || ""}
                  className="block truncate text-sm text-muted-foreground"
                >
                  {mcq.description
                    ? truncateText(mcq.description, 100)
                    : "—"}
                </span>
              </TableCell>
              <TableCell className="max-w-[300px]">
                <span
                  title={mcq.questionText}
                  className="block truncate text-sm"
                >
                  {truncateText(mcq.questionText, 150)}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {mcq.choices.length} {mcq.choices.length === 1 ? "choice" : "choices"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(mcq.createdAt)}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <McqActionMenu
                  mcqId={mcq.id}
                  onEdit={() => handleEdit(mcq.id)}
                  onDelete={() => handleDelete(mcq.id)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </Card>
    </div>
  );
}
