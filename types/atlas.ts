export type UserRole = "admin" | "agent" | "client";

export type UserProfile = {
  user_id: string;
  org_id: string;
  role: UserRole;
  first_name?: string | null;
  last_name?: string | null;
};