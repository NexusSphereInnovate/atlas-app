import { Suspense } from "react";
import AuthLayout from "@/components/auth-layout";

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <AuthLayout mode="signup" />
    </Suspense>
  );
}