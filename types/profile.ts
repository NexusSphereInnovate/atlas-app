import type { UserRole } from "./database";

export interface UserProfile {
  id: string;
  org_id: string | null;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  assigned_agent_id: string | null;
  invited_by: string | null;
  referral_code: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  created_at: string;
  updated_at: string;
}

export function getFullName(profile: Pick<UserProfile, "first_name" | "last_name">): string {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "—";
}

export function getInitials(profile: Pick<UserProfile, "first_name" | "last_name">): string {
  const first = profile.first_name?.[0] ?? "";
  const last = profile.last_name?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}
