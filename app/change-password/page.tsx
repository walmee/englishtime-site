"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ Login guard + email'i al
  useEffect(() => {
    const sid = (localStorage.getItem("student_id") || "").trim();
    if (!sid) {
      router.push("/login");
      return;
    }

    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        router.push("/login");
        return;
      }
      setEmail(user.email ?? "");
      setLoading(false);
    })();
  }, [router]);

  const onChangePassword = async () => {
    setMsg("");

    if (!email) {
      setMsg("Session not found. Please login again.");
      return;
    }
    if (!currentPassword || !newPassword) {
      setMsg("Please fill current password and new password.");
      return;
    }
    if (newPassword.length < 6) {
      setMsg("New password must be at least 6 characters.");
      return;
    }

    setSaving(true);

    try {
      // ✅ 1) Önce mevcut şifre doğru mu kontrol et (re-login)
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signErr) {
        setMsg("Current password is wrong.");
        return;
      }

      // ✅ 2) Şifreyi güncelle
      const { error: updErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updErr) {
        setMsg(updErr.message);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setMsg("✅ Password updated successfully!");
    } catch (e: any) {
      setMsg(e?.message || "Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-300 text-black flex items-center justify-center p-6">
        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      {/* TOP NAVBAR */}
     

      <main className="max-w-md mx-auto px-6 py-10">
        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-2">Change Password</h2>
          <p className="text-sm opacity-90 mb-4">
            Logged in as: <b>{email || "-"}</b>
          </p>

          {msg ? (
            <div className="mb-4 bg-yellow-50 border border-black rounded-xl p-3">
              <p className="text-sm font-bold">{msg}</p>
            </div>
          ) : null}

          <label className="block text-sm font-bold mb-1">Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full p-3 rounded-lg border border-black bg-yellow-50 mb-4"
            placeholder="Current password"
          />

          <label className="block text-sm font-bold mb-1">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full p-3 rounded-lg border border-black bg-yellow-50 mb-4"
            placeholder="New password (min 6 chars)"
          />

          <button
            onClick={onChangePassword}
            disabled={saving}
            className="w-full py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 disabled:opacity-60"
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </div>
      </main>
    </div>
  );
}