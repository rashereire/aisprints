import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/services/auth-service";
import { getDatabaseFromEnv } from "@/lib/auth/get-database";
import { getMcqById, verifyMcqOwnership } from "@/lib/services/mcq-service";
import { getCurrentUser as getCurrentUserFromService } from "@/lib/services/auth-service";
import { McqEditClient } from "../mcq-edit-client";
import type { McqWithChoices } from "@/lib/schemas/mcq-schema";

/**
 * Server component that fetches MCQ data and verifies ownership.
 * Redirects if not authenticated or not the owner.
 */
export default async function EditMcqPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;

  // Fetch MCQ and verify ownership
  let mcq: McqWithChoices | null = null;
  let userId: string | null = null;

  try {
    const db = getDatabaseFromEnv();
    mcq = await getMcqById(db, id);

    if (!mcq) {
      redirect("/mcqs");
    }

    // Get current user and verify ownership
    const user = await getCurrentUserFromService(db, sessionToken);
    if (!user) {
      redirect("/login");
    }

    userId = user.id;
    const isOwner = await verifyMcqOwnership(db, id, user.id);

    if (!isOwner) {
      redirect("/mcqs");
    }
  } catch (error) {
    console.error("Error fetching MCQ:", error);
    redirect("/mcqs");
  }

  return (
    <div className="container mx-auto p-6 md:p-10">
      <McqEditClient mcq={mcq} />
    </div>
  );
}
