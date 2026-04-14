export type UserRole = "admin" | "enforcer";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
}
