"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type ProgressRow = {
  student_id: string;
  quiz_id: number;
  score: number;
  created_at?: string | null;
};

export default function ProgressPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProgressRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("leaderboard")
        .select("student_id, quiz_id, score, created_at")
        .eq("student_id", session.user.id)
        .limit(50);

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setItems([]);
        setLoading(false);
        return;
      }

      setItems(Array.isArray(data) ? (data as ProgressRow[]) : []);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [router]);

  const avg = useMemo(() => {
    if (!items.length) return 0;
    const total = items.reduce((sum, item) => sum + Number(item.score || 0), 0);
    return Math.round(total / items.length);
  }, [items]);

  const highest = useMemo(() => {
    if (!items.length) return 0;
    return Math.max(...items.map((item) => Number(item.score || 0)));
  }, [items]);

  const lowest = useMemo(() => {
    if (!items.length) return 0;
    return Math.min(...items.map((item) => Number(item.score || 0)));
  }, [items]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-yellow-300 text-black">
      
      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto overflow-x-hidden space-y-6">
        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-2">Progress</h2>
          <p className="mb-6">Your learning progress summary.</p>

          {error ? (
            <div className="mb-4 bg-red-100 border border-black rounded-xl p-4">
              <p className="font-bold">Error</p>
              <p className="text-sm break-words">{error}</p>
            </div>
          ) : null}

          {loading ? (
            <div className="border border-dashed border-black rounded-lg p-6 text-center">
              Loading progress...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-yellow-50 border border-black rounded-xl p-4">
                  <p className="text-sm opacity-80">Average Score</p>
                  <p className="text-3xl font-bold">{avg}%</p>
                </div>

                <div className="bg-yellow-50 border border-black rounded-xl p-4">
                  <p className="text-sm opacity-80">Highest Score</p>
                  <p className="text-3xl font-bold">{highest}%</p>
                </div>

                <div className="bg-yellow-50 border border-black rounded-xl p-4">
                  <p className="text-sm opacity-80">Lowest Score</p>
                  <p className="text-3xl font-bold">{lowest}%</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {items.length === 0 ? (
                  <div className="border border-dashed border-black rounded-lg p-6 text-center">
                    No progress data yet.
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={`${item.student_id}-${item.quiz_id}`}
                      className="border border-black rounded-lg bg-yellow-50 p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold">Quiz #{item.quiz_id}</p>
                        <p className="text-sm">Score: {item.score}%</p>
                        <p className="text-xs break-words">
                          {item.created_at ? new Date(item.created_at).toLocaleString() : "No date"}
                        </p>
                      </div>

                      <span className="text-xs px-2 py-1 rounded-md border border-black bg-yellow-200 shrink-0">
                        Progress
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}