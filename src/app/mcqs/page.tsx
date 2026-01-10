import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/services/auth-service";
import { getDatabaseFromEnv } from "@/lib/auth/get-database";
import { McqListingClient } from "./mcq-listing-client";

export default async function MCQsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; sort?: string; order?: string }>;
}) {
  // Verify authentication
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  const sessionToken = sessionCookie?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  try {
    const db = getDatabaseFromEnv();
    const isValid = await verifySession(db, sessionToken);

    if (!isValid) {
      redirect("/login");
    }
  } catch (error) {
    console.error("Error verifying session:", error);
    redirect("/login");
  }

  // Parse search params
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const search = params.search || "";
  const sort = params.sort || "createdAt";
  const order = (params.order as "asc" | "desc") || "desc";

  return (
    <McqListingClient
      initialPage={page}
      initialSearch={search}
      initialSort={sort}
      initialOrder={order}
    />
  );
}
