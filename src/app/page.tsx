import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies"
import { verifySession } from "@/lib/services/auth-service"
import { getDatabaseFromEnv } from "@/lib/auth/get-database"

export default async function Home() {
  // Get cookies from Next.js server component
  const cookieStore = await cookies()
  
  // Check if user is authenticated
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
  const sessionToken = sessionCookie?.value
  
  if (sessionToken) {
    try {
      const db = getDatabaseFromEnv()
      const isValid = await verifySession(db, sessionToken)
      
      // If authenticated, redirect to MCQ page
      if (isValid) {
        redirect("/mcqs")
      }
    } catch (error) {
      // If error, continue to show login
      console.error("Error verifying session:", error)
    }
  }

  // If not authenticated, redirect to login
  redirect("/login")
}
