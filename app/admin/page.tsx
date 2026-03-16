"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const userId = session?.user?.id;

        if (!userId) {
          router.replace("/login");
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (error || !profile) {
          router.replace("/login");
          return;
        }

        if (profile.role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        router.replace("/login");
      }
    };

    checkAdmin();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-300 flex items-center justify-center p-6">
        <div className="border border-black rounded-2xl bg-yellow-100 px-8 py-6 text-xl font-bold">
          Loading admin panel...
        </div>
      </div>
    );
  }

  return <div className="p-6">ADMIN PANEL</div>;
}