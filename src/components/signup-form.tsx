"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
const signupSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be 50 characters or less"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be 50 characters or less"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or less")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)/,
      "Password must contain at least one letter and one number"
    ),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type SignupFormData = z.infer<typeof signupSchema>

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          username: data.username,
          email: data.email,
          password: data.password,
        }),
      })

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      let result: { error?: string; user?: unknown } = {};
      
      if (contentType && contentType.includes('application/json')) {
        try {
          result = await response.json() as { error?: string; user?: unknown };
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError);
          setError("Server returned invalid response. Please try again.");
          setIsSubmitting(false);
          return;
        }
      } else {
        // If not JSON, it's likely an HTML error page
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        setError("Server error occurred. Please check the console for details.");
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        // Handle API errors
        if (response.status === 409) {
          setError(result.error || "Username or email already exists")
        } else if (response.status === 400) {
          setError(result.error || "Validation failed. Please check your input.")
        } else {
          setError(result.error || "Failed to create account. Please try again.")
        }
        setIsSubmitting(false)
        return
      }

      // Success - redirect to home or MCQ page
      router.push("/mcqs")
      router.refresh()
    } catch (err) {
      console.error("Signup error:", err)
      setError("An unexpected error occurred. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
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
              <FieldLabel htmlFor="firstName">First Name</FieldLabel>
              <Input
                id="firstName"
                type="text"
                autoComplete="given-name"
                placeholder="John"
                {...register("firstName")}
                data-invalid={!!errors.firstName}
              />
              <FieldError errors={errors.firstName ? [errors.firstName] : []} />
            </Field>
            <Field>
              <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
              <Input
                id="lastName"
                type="text"
                autoComplete="family-name"
                placeholder="Doe"
                {...register("lastName")}
                data-invalid={!!errors.lastName}
              />
              <FieldError errors={errors.lastName ? [errors.lastName] : []} />
            </Field>
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="johndoe"
                {...register("username")}
                data-invalid={!!errors.username}
              />
              <FieldError errors={errors.username ? [errors.username] : []} />
              <FieldDescription>
                Username can only contain letters, numbers, and underscores.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="m@example.com"
                {...register("email")}
                data-invalid={!!errors.email}
              />
              <FieldError errors={errors.email ? [errors.email] : []} />
              <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
                data-invalid={!!errors.password}
              />
              <FieldError errors={errors.password ? [errors.password] : []} />
              <FieldDescription>
                Must be at least 8 characters long and contain at least one letter and one number.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirmPassword">
                Confirm Password
              </FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
                data-invalid={!!errors.confirmPassword}
              />
              <FieldError errors={errors.confirmPassword ? [errors.confirmPassword] : []} />
              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
                <Button variant="outline" type="button" disabled>
                  Sign up with Google
                </Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account? <Link href="/login" className="underline underline-offset-4 hover:text-primary">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
