"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from "next/link"

// Validation schema matching our API
const loginSchema = z.object({
  usernameOrEmail: z
    .string()
    .min(1, "Username or email is required"),
  password: z
    .string()
    .min(1, "Password is required"),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usernameOrEmail: data.usernameOrEmail,
          password: data.password,
        }),
      })

      const result = await response.json() as { error?: string; user?: unknown }

      if (!response.ok) {
        // Handle API errors
        if (response.status === 401) {
          setError("Invalid credentials. Please check your username/email and password.")
        } else if (response.status === 400) {
          setError(result.error || "Validation failed. Please check your input.")
        } else {
          setError(result.error || "Failed to login. Please try again.")
        }
        setIsSubmitting(false)
        return
      }

      // Success - redirect to redirect param or default to /mcqs
      const redirectTo = searchParams.get("redirect") || "/mcqs"
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      console.error("Login error:", err)
      setError("An unexpected error occurred. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <Card className={cn(className)} {...props}>
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your username or email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            {error && (
              <Field>
                <FieldError>{error}</FieldError>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="usernameOrEmail">Username or Email</FieldLabel>
              <Input
                id="usernameOrEmail"
                type="text"
                autoComplete="username"
                placeholder="johndoe or m@example.com"
                {...register("usernameOrEmail")}
                data-invalid={!!errors.usernameOrEmail}
              />
              <FieldError errors={errors.usernameOrEmail ? [errors.usernameOrEmail] : []} />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
                data-invalid={!!errors.password}
              />
              <FieldError errors={errors.password ? [errors.password] : []} />
            </Field>
            <Field>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Logging in..." : "Login"}
              </Button>
              <FieldDescription className="text-center">
                Don&apos;t have an account? <Link href="/signup" className="underline underline-offset-4 hover:text-primary">Sign up</Link>
              </FieldDescription>
              <FieldDescription className="text-center">
                <Link href="#" className="underline underline-offset-4 hover:text-primary">
                  Forgot your password?
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
