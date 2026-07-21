"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ─── Schemas ─────────────────────────────────────────────────────────────────
const ProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
});

const PasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Minimum 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileErrors = Partial<Record<"name" | "email" | "root", string>>;
type PasswordErrors = Partial<Record<"currentPassword" | "newPassword" | "confirmPassword" | "root", string>>;

// ─── Profile Form ─────────────────────────────────────────────────────────────
function ProfileForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setName(d.data.name); setEmail(d.data.email); }
      })
      .finally(() => setInitializing(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = ProfileSchema.safeParse({ name, email });
    if (!result.success) {
      const fieldErrors: ProfileErrors = {};
      result.error.issues.forEach((issue) => { fieldErrors[issue.path[0] as keyof ProfileErrors] = issue.message; });
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (data.success) toast.success("Profile updated");
      else setErrors({ root: data.message });
    } catch { setErrors({ root: "Network error" }); }
    finally { setLoading(false); }
  };

  if (initializing) return <div className="space-y-3"><div className="h-8 w-full animate-pulse rounded-lg bg-muted" /><div className="h-8 w-full animate-pulse rounded-lg bg-muted" /></div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.root && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.root}</div>}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="profile-name">Name</label>
        <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} aria-invalid={!!errors.name} />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="profile-email">Email</label>
        <Input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} aria-invalid={!!errors.email} />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? <><Loader2 className="animate-spin" /> Saving...</> : "Save Changes"}
      </Button>
    </form>
  );
}

// ─── Password Form ────────────────────────────────────────────────────────────
function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = PasswordSchema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!result.success) {
      const fieldErrors: PasswordErrors = {};
      result.error.issues.forEach((issue) => { fieldErrors[issue.path[0] as keyof PasswordErrors] = issue.message; });
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Password updated");
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      } else setErrors({ root: data.message });
    } catch { setErrors({ root: "Network error" }); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.root && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.root}</div>}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="current-pw">Current Password</label>
        <Input id="current-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={loading} aria-invalid={!!errors.currentPassword} />
        {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword}</p>}
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="new-pw">New Password</label>
        <Input id="new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading} aria-invalid={!!errors.newPassword} />
        {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword}</p>}
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="confirm-pw">Confirm New Password</label>
        <Input id="confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} aria-invalid={!!errors.confirmPassword} />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? <><Loader2 className="animate-spin" /> Updating...</> : "Update Password"}
      </Button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your admin name and email address</CardDescription>
          </CardHeader>
          <CardContent><ProfileForm /></CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Keep your account secure with a strong password</CardDescription>
          </CardHeader>
          <CardContent><PasswordForm /></CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SMS Settings</CardTitle>
            <CardDescription>SMS provider configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div><p className="font-medium">Provider</p><p className="text-muted-foreground">AfroMessage</p></div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>
              </div>
              <p className="text-xs text-muted-foreground">SMS provider credentials are configured via environment variables (AFROMESSAGE_TOKEN, AFROMESSAGE_IDENTIFIER, AFROMESSAGE_SENDER).</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
