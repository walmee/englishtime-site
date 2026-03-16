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
        (async () => {
            const { data: auth } = await supabase.auth.getUser();
            const userId = auth.user?.id;

            if (!userId) {
                router.push("/login");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", userId)
                .single();

            if (profile?.role !== "admin") {
                router.push("/dashboard"); // öğrenci sayfan neyse
                return;
            }

            setLoading(false);
        })();
    }, [router]);

    if (loading) return <div className="p-6">Loading...</div>;

    return <div className="p-6">ADMIN PANEL</div>;
}
