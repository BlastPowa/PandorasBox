import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 w-full max-w-md rounded-[var(--radius-lg)]" />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
