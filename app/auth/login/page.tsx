import { Suspense } from "react";
import AuthLayout from "@/components/auth-layout";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthLayout mode="login" />
    </Suspense>
  );
}