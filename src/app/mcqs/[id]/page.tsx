import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/services/auth-service";
import { getDatabaseFromEnv } from "@/lib/auth/get-database";
import { getMcqById } from "@/lib/services/mcq-service";
import { getAttemptsByMcq } from "@/lib/services/mcq-attempt-service";
import { getCurrentUser as getCurrentUserFromService } from "@/lib/services/auth-service";
import { McqPreviewClient } from "./mcq-preview-client";
import type { McqWithChoices, McqAttempt } from "@/lib/schemas/mcq-schema";

/**
 * Server component that fetches MCQ data and user attempts.
 * Passes data to client component for interaction.
 */
export default async function McqPage({
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

  // Fetch MCQ
  let mcq: McqWithChoices | null = null;
  let userAttempts: McqAttempt[] = [];
  let userId: string | null = null;

  try {
    const db = getDatabaseFromEnv();
    mcq = await getMcqById(db, id);

    if (!mcq) {
      redirect("/mcqs");
    }

    // Get current user to fetch their attempts
    const user = await getCurrentUserFromService(db, sessionToken);
    if (user) {
      userId = user.id;
      userAttempts = await getAttemptsByMcq(db, id, user.id);
    }
  } catch (error) {
    console.error("Error fetching MCQ:", error);
    redirect("/mcqs");
  }

  return (
    <div className="container mx-auto p-6 md:p-10">
      <McqPreviewClient
        mcq={mcq}
        userId={userId}
        initialAttempts={userAttempts}
      />
    </div>
  );
}
