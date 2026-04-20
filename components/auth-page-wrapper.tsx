"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

interface AuthPageWrapperProps {
  children: React.ReactNode;
}

export default function AuthPageWrapper({ children }: AuthPageWrapperProps) {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1117",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        onClick={() => router.push("/auth/login")}
        style={{ cursor: "pointer", marginBottom: 48, display: "flex", alignItems: "center", gap: 12 }}
      >
        <Image src="/logo.svg" alt="Atlas Incorporate" width={42} height={39} style={{ display: "block" }} />
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 600, letterSpacing: "-0.3px" }}>
          Atlas <span style={{ fontWeight: 300, opacity: 0.5 }}>Incorporate</span>
        </span>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 18,
          padding: "40px 36px",
        }}
      >
        {children}
      </div>

      <div style={{ marginTop: 32, color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
        © 2026 Atlas Incorporate
      </div>
    </div>
  );
}