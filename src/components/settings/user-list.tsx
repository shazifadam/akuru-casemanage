"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shield, User, Trash2, Loader2, Pencil, Check, X } from "lucide-react";
import { updateUserRole, updateUserName, deleteUser } from "@/lib/actions/users";
import type { UserRole } from "@/types/database";

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function RoleBadge({ role }: { role: UserRole }) {
  return role === "admin" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
      <Shield className="h-2.5 w-2.5" /> Admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
      <User className="h-2.5 w-2.5" /> Enforcer
    </span>
  );
}

function UserRow({ user, currentUserId }: { user: UserRow; currentUserId: string }) {
  const [isPending, startTransition] = useTransition();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user.full_name ?? "");
  const router = useRouter();
  const isSelf = user.id === currentUserId;

  function handleRoleChange(newRole: UserRole) {
    startTransition(async () => {
      const result = await updateUserRole(user.id, newRole);
      if (result.success) {
        toast.success("Role updated");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleNameSave() {
    if (!nameValue.trim()) return;
    startTransition(async () => {
      const result = await updateUserName(user.id, nameValue);
      if (result.success) {
        toast.success("Name updated");
        setEditingName(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete user ${user.email}? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (result.success) {
        toast.success("User deleted");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      {/* Name / email */}
      <td className="px-4 py-3">
        {editingName ? (
          <div className="flex items-center gap-1.5">
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring w-36"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleNameSave(); if (e.key === "Escape") setEditingName(false); }}
            />
            <button onClick={handleNameSave} disabled={isPending} className="text-emerald-600 hover:text-emerald-700">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => { setEditingName(false); setNameValue(user.full_name ?? ""); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 group">
            <div>
              <p className="text-xs font-medium text-foreground">
                {user.full_name ?? <span className="text-muted-foreground italic">No name</span>}
                {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            {!isSelf && (
              <button
                onClick={() => setEditingName(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground ml-1"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        {isSelf ? (
          <RoleBadge role={user.role} />
        ) : (
          <select
            value={user.role}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            disabled={isPending}
            className="h-7 rounded border border-input bg-background px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="enforcer">Enforcer</option>
            <option value="admin">Admin</option>
          </select>
        )}
      </td>

      {/* Last sign-in */}
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {timeAgo(user.last_sign_in_at)}
      </td>

      {/* Joined */}
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(user.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        {!isSelf && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
            title="Delete user"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        )}
      </td>
    </tr>
  );
}

export function UserList({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold">Team Members</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{users.length} user{users.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["User", "Role", "Last Sign In", "Joined", ""].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <UserRow key={u.id} user={u} currentUserId={currentUserId} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
