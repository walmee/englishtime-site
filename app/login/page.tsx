"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [msg, setMsg] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const onLogin = async () => {
        setMsg("");
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setMsg(error.message);
                return;
            }

            const user = data.user;
            if (!user) {
                setMsg("Login failed. Please try again.");
                return;
            }

            // ✅ student_id: e-mail prefix 
            const prefix = email.split("@")[0].toLowerCase().trim();
            localStorage.setItem("student_id", prefix);

            // ✅ role çek (profiles tablosu: id uuid, role text)
            const { data: profile, error: profileErr } = await supabase
                .from("profiles")
                .select("role, username")
                .eq("id", user.id)
                .single();

            if (profileErr) {
                // Profil yoksa student say
                router.replace("/dashboard"); // senin öğrenci anasayfan hangisiyse
                return;
            }

            const role = (profile?.role || "student").toLowerCase();

            if (role === "admin") {
                router.replace("/admin");
            } else {
                router.replace("/dashboard"); // veya "/student"
            }
        } catch (e: any) {
            setMsg(e?.message || "Unexpected error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-yellow-300 text-black flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-yellow-100 border border-black rounded-2xl p-6">
                <h1 className="text-3xl font-extrabold mb-2">Login</h1>
                <p className="text-sm mb-6">
                    Sign in with your class account (example: <b>name@english.time</b>)
                </p>

                <label className="block text-sm font-semibold mb-1">Email</label>
                <input
                    className="w-full p-3 rounded-lg border border-black bg-yellow-50 mb-4"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. name@english.time"
                    autoComplete="username"
                />

                <label className="block text-sm font-semibold mb-1">Password</label>
                <input
                    className="w-full p-3 rounded-lg border border-black bg-yellow-50 mb-4"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    type="password"
                    autoComplete="current-password"
                />

                <button
                    onClick={onLogin}
                    disabled={loading}
                    className="w-full py-3 rounded-lg bg-black text-yellow-300 font-bold border border-black hover:bg-gray-900 disabled:opacity-60"
                >
                    {loading ? "Signing in..." : "Sign in →"}
                </button>

                {msg ? (
                    <p className="mt-4 text-sm font-semibold text-red-700">{msg}</p>
                ) : null}

                <p className="mt-4 text-xs opacity-80">
                    Tip: Admin user must have <b>profiles.role = admin</b>
                </p>
            </div>
        </div>
    );
}
