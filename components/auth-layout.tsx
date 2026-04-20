"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import LoginForm from "@/components/login-form";
import SignUpForm from "@/components/sign-up-form";

type Mode = "login" | "signup";

const IMAGES = {
  login: {
    bg: `linear-gradient(180deg, #0a0a0a 0%, #111 30%, #1a1a1a 60%, #0d0d0d 100%)`,
    quote: {
      text: "Atlas simplifie chaque étape de la creation d entreprise. Un outil fiable, rapide et professionnel.",
      author: "Marc Duval",
      role: "Directeur, Groupe Financier LDM",
    },
  },
  signup: {
    bg: `linear-gradient(180deg, #0c0e14 0%, #151a28 30%, #1a2035 60%, #0f1118 100%)`,
    quote: {
      text: "En moins de 48 heures, notre entreprise etait immatriculee. L experience est vraiment exceptionnelle.",
      author: "Sarah Chen",
      role: "Fondatrice, TechStart SAS",
    },
  },
};

function Logo({ size = 38 }: { size?: number }) {
  return <Image src="/logo.svg" alt="Atlas Incorporate" width={size} height={size * 0.93} style={{ display: "block" }} unoptimized />;
}

function GeometricDecor({ variant }: { variant: "login" | "signup" }) {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.18, pointerEvents: "none" }}
      viewBox="0 0 600 800"
      preserveAspectRatio="xMidYMid slice"
    >
      {variant === "login" ? (
        <>
          <line x1="300" y1="100" x2="100" y2="550" stroke="#fff" strokeWidth="0.8" />
          <line x1="300" y1="100" x2="500" y2="550" stroke="#fff" strokeWidth="0.8" />
          <line x1="100" y1="550" x2="500" y2="550" stroke="#fff" strokeWidth="0.6" />
          <line x1="300" y1="100" x2="200" y2="380" stroke="#fff" strokeWidth="0.5" />
          <line x1="300" y1="100" x2="400" y2="380" stroke="#fff" strokeWidth="0.5" />
          <line x1="200" y1="380" x2="400" y2="380" stroke="#fff" strokeWidth="0.4" />
          <line x1="200" y1="380" x2="150" y2="550" stroke="#fff" strokeWidth="0.4" />
          <line x1="400" y1="380" x2="450" y2="550" stroke="#fff" strokeWidth="0.4" />
          <line x1="250" y1="240" x2="350" y2="240" stroke="#fff" strokeWidth="0.3" />
          <line x1="250" y1="240" x2="200" y2="380" stroke="#fff" strokeWidth="0.3" />
          <line x1="350" y1="240" x2="400" y2="380" stroke="#fff" strokeWidth="0.3" />
          <line x1="150" y1="300" x2="300" y2="150" stroke="#fff" strokeWidth="0.3" opacity="0.6" />
          <line x1="450" y1="300" x2="300" y2="150" stroke="#fff" strokeWidth="0.3" opacity="0.6" />
          <line x1="150" y1="300" x2="450" y2="300" stroke="#fff" strokeWidth="0.25" opacity="0.4" />
          <line x1="120" y1="420" x2="480" y2="420" stroke="#fff" strokeWidth="0.2" opacity="0.3" />
          <circle cx="300" cy="100" r="2.5" fill="#fff" opacity="0.9" />
          <circle cx="200" cy="380" r="1.8" fill="#fff" opacity="0.7" />
          <circle cx="400" cy="380" r="1.8" fill="#fff" opacity="0.7" />
          <circle cx="250" cy="240" r="1.5" fill="#fff" opacity="0.6" />
          <circle cx="350" cy="240" r="1.5" fill="#fff" opacity="0.6" />
          <circle cx="100" cy="550" r="1.5" fill="#fff" opacity="0.5" />
          <circle cx="500" cy="550" r="1.5" fill="#fff" opacity="0.5" />
        </>
      ) : (
        <>
          <line x1="300" y1="180" x2="180" y2="300" stroke="#fff" strokeWidth="0.8" />
          <line x1="300" y1="180" x2="420" y2="300" stroke="#fff" strokeWidth="0.8" />
          <line x1="180" y1="300" x2="180" y2="520" stroke="#fff" strokeWidth="0.7" />
          <line x1="420" y1="300" x2="420" y2="520" stroke="#fff" strokeWidth="0.7" />
          <line x1="180" y1="520" x2="300" y2="640" stroke="#fff" strokeWidth="0.7" />
          <line x1="420" y1="520" x2="300" y2="640" stroke="#fff" strokeWidth="0.7" />
          <line x1="300" y1="180" x2="300" y2="400" stroke="#fff" strokeWidth="0.5" />
          <line x1="180" y1="300" x2="420" y2="300" stroke="#fff" strokeWidth="0.4" opacity="0.5" />
          <line x1="180" y1="520" x2="420" y2="520" stroke="#fff" strokeWidth="0.5" />
          <line x1="240" y1="240" x2="360" y2="240" stroke="#fff" strokeWidth="0.3" opacity="0.5" />
          <line x1="240" y1="240" x2="240" y2="460" stroke="#fff" strokeWidth="0.3" opacity="0.5" />
          <line x1="360" y1="240" x2="360" y2="460" stroke="#fff" strokeWidth="0.3" opacity="0.5" />
          <line x1="240" y1="460" x2="360" y2="460" stroke="#fff" strokeWidth="0.3" opacity="0.5" />
          <circle cx="300" cy="180" r="2.5" fill="#fff" opacity="0.9" />
          <circle cx="180" cy="300" r="2" fill="#fff" opacity="0.7" />
          <circle cx="420" cy="300" r="2" fill="#fff" opacity="0.7" />
          <circle cx="180" cy="520" r="1.8" fill="#fff" opacity="0.6" />
          <circle cx="420" cy="520" r="1.8" fill="#fff" opacity="0.6" />
          <circle cx="300" cy="640" r="2" fill="#fff" opacity="0.7" />
        </>
      )}
    </svg>
  );
}

function ImagePanel({ mode }: { mode: Mode }) {
  const data = IMAGES[mode];
  return (
    <div
      style={{
        position: "relative",
        flex: "0 0 50%",
        minHeight: "100vh",
        background: data.bg,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <GeometricDecor variant={mode} />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "45%",
          background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.75) 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 32,
          left: 36,
          display: "flex",
          alignItems: "center",
          gap: 12,
          zIndex: 2,
        }}
      >
        <Logo size={40} />
        <span style={{ color: "#fff", fontSize: 17, fontWeight: 600, letterSpacing: "-0.3px" }}>
          Atlas <span style={{ fontWeight: 300, opacity: 0.5 }}>Incorporate</span>
        </span>
      </div>

      <div style={{ position: "relative", zIndex: 2, padding: "0 40px 44px" }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: "#fff", lineHeight: 1.5, maxWidth: 420, letterSpacing: "-0.2px" }}>
          &ldquo;{data.quote.text}&rdquo;
        </div>
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {data.quote.author[0]}
            {data.quote.author.split(" ")[1]?.[0]}
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{data.quote.author}</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 1 }}>{data.quote.role}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormPanel({ mode, hasValidToken }: { mode: Mode; hasValidToken: boolean }) {
  const router = useRouter();
  return (
    <div
      style={{
        flex: "0 0 50%",
        minHeight: "100vh",
        background: "#0f1117",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: "40px 24px",
      }}
    >
      <div style={{ position: "absolute", top: 32, right: 36 }}>
        <button
          onClick={() => router.push(mode === "login" ? "/auth/sign-up" : "/auth/login")}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.5)",
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
        >
          {mode === "login" ? "Sign Up" : "Login"}
        </button>
      </div>

      <div style={{ width: "100%", maxWidth: 380 }}>
        {mode === "signup" && !hasValidToken ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                fontSize: 28,
              }}
            >
              🔒
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>
              Invitation uniquement
            </h1>
            <p style={{ margin: "12px 0 0", fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
              Les inscriptions sont réservées aux personnes invitées. Contactez votre agent ou administrateur pour recevoir un lien d&apos;invitation.
            </p>
            <button
              onClick={() => router.push("/auth/login")}
              style={{
                marginTop: 32,
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "11px 28px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#2563eb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#3b82f6")}
            >
              Retour à la connexion
            </button>
          </div>
        ) : (
          <>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", textAlign: "center" }}>
              {mode === "login" ? "Bienvenue" : "Créer un compte"}
            </h1>
            <p style={{ margin: "10px 0 32px", fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.5 }}>
              {mode === "login" ? "Connectez-vous à votre espace Atlas" : "Créez votre compte avec le lien d&apos;invitation reçu"}
            </p>
            {mode === "login" ? <LoginForm /> : <SignUpForm />}
            <div style={{ marginTop: 28, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.7 }}>
                {mode === "login" ? (
                  <>Pas de compte ? <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>Contactez votre administrateur</span></>
                ) : (
                  <>
                    En vous inscrivant, vous acceptez nos{" "}
                    <a href="#" style={{ color: "rgba(255,255,255,0.45)", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.2)" }}>Conditions</a>
                    {" "}et notre{" "}
                    <a href="#" style={{ color: "rgba(255,255,255,0.45)", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.2)" }}>Politique de confidentialité</a>.
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthLayout({ mode }: { mode: Mode }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const hasValidToken = mode === "signup" && token !== null && token.length > 0;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "24px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Logo size={32} />
          <button
            onClick={() => {}}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            {mode === "login" ? "Sign Up" : "Login"}
          </button>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px 60px" }}>
          <div style={{ width: "100%", maxWidth: 360 }}>
            <FormPanel mode={mode} hasValidToken={hasValidToken} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", overflow: "hidden" }}>
      {mode === "login" ? (
        <>
          <ImagePanel mode="login" />
          <FormPanel mode="login" hasValidToken={hasValidToken} />
        </>
      ) : (
        <>
          <FormPanel mode="signup" hasValidToken={hasValidToken} />
          <ImagePanel mode="signup" />
        </>
      )}
    </div>
  );
}