"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { McqTable } from "@/components/mcq/McqTable";
import { McqSearch } from "@/components/mcq/McqSearch";
import { McqPagination } from "@/components/mcq/McqPagination";
import { McqEmptyState } from "@/components/mcq/McqEmptyState";
import type { McqWithChoices, PaginatedMcqs } from "@/lib/schemas/mcq-schema";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface McqListingClientProps {
  initialPage: number;
  initialSearch: string;
  initialSort: string;
  initialOrder: "asc" | "desc";
}

/**
 * Client component for MCQ listing page.
 * Handles state management, API calls, and user interactions.
 */
export function McqListingClient({
  initialPage,
  initialSearch,
  initialSort,
  initialOrder,
}: McqListingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mcqs, setMcqs] = useState<McqWithChoices[]>([]);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState(initialSort);
  const [order, setOrder] = useState<"asc" | "desc">(initialOrder);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch MCQs from API
  const fetchMcqs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      if (search) params.set("search", search);
      if (sort) params.set("sort", sort);
      if (order) params.set("order", order);

      const response = await fetch(`/api/mcqs?${params.toString()}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch MCQs");
      }

      const data: PaginatedMcqs = await response.json();
      setMcqs(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching MCQs:", error);
      toast.error("Failed to load MCQs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Sync state from URL params (handles browser nav, direct links, etc.)
  useEffect(() => {
    const urlPage = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const urlSearch = searchParams.get('search') || '';
    const urlSort = searchParams.get('sort') || 'createdAt';
    const urlOrder = (searchParams.get('order') as 'asc' | 'desc') || 'desc';

    // Only update state if URL params differ from current state
    // This prevents unnecessary re-renders and circular updates
    if (urlPage !== pagination.page) {
      setPagination((prev) => ({ ...prev, page: urlPage }));
    }
    if (urlSearch !== search) {
      setSearch(urlSearch);
    }
    if (urlSort !== sort) {
      setSort(urlSort);
    }
    if (urlOrder !== order) {
      setOrder(urlOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only depend on searchParams to avoid circular dependencies

  // Fetch MCQs when params change
  useEffect(() => {
    fetchMcqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, search, sort, order]);

  // Update URL when params change (only if URL differs from state)
  useEffect(() => {
    const currentPage = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const currentSearch = searchParams.get('search') || '';
    const currentSort = searchParams.get('sort') || 'createdAt';
    const currentOrder = (searchParams.get('order') as 'asc' | 'desc') || 'desc';

    // Check if URL already matches state
    const urlMatchesState =
      currentPage === pagination.page &&
      currentSearch === search &&
      currentSort === sort &&
      currentOrder === order;

    // Skip URL update if it already matches state to prevent unnecessary router.replace calls
    if (urlMatchesState) {
      return;
    }

    // Build new URL params
    const params = new URLSearchParams();
    if (pagination.page > 1) params.set("page", pagination.page.toString());
    if (search) params.set("search", search);
    if (sort !== "createdAt") params.set("sort", sort);
    if (order !== "desc") params.set("order", order);

    const newUrl = params.toString() ? `/mcqs?${params.toString()}` : "/mcqs";
    router.replace(newUrl, { scroll: false });
  }, [pagination.page, search, sort, order, router, searchParams]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page on search
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleSort = (newSort: string) => {
    if (sort === newSort) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(newSort);
      setOrder("desc");
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleEdit = (mcqId: string) => {
    router.push(`/mcqs/${mcqId}/edit`);
  };

  const handleDelete = async (mcqId: string) => {
    try {
      const response = await fetch(`/api/mcqs/${mcqId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (response.status === 403) {
          toast.error("You don't have permission to delete this MCQ");
          return;
        }
        throw new Error("Failed to delete MCQ");
      }

      toast.success("MCQ deleted successfully");
      fetchMcqs(); // Refresh the list
    } catch (error) {
      console.error("Error deleting MCQ:", error);
      toast.error("Failed to delete MCQ. Please try again.");
    }
  };

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-7xl px-6 py-6 md:px-8 md:py-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Multiple Choice Questions</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your MCQs
          </p>
        </div>
        <Button onClick={() => router.push("/mcqs/new")} className="gap-2">
          <Plus className="size-4" />
          Create MCQ
        </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
        <McqSearch
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by title, description, or question text..."
        />
        </div>

        {/* Table or Empty State */}
        {!isLoading && mcqs.length === 0 ? (
        <McqEmptyState onCreateClick={() => router.push("/mcqs/new")} />
      ) : (
        <>
          <McqTable
            mcqs={mcqs}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          {pagination.totalPages > 1 && (
            <div className="mt-6">
              <McqPagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
        )}
      </div>
    </div>
  );
}
