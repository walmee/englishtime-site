"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type HistoryRow = {
  student_id: string;
  quiz_id: number;
  score: number;
  created_at?: string | null;
};

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryRow[]>([]);
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

      setItems(Array.isArray(data) ? (data as HistoryRow[]) : []);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-yellow-300 text-black">
      <header className="border-b border-black bg-yellow-200 w-full overflow-x-hidden">
        <div className="w-full px-3 py-4 md:max-w-6xl md:mx-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h1 className="text-xl font-bold">English Time</h1>

            <nav className="flex flex-wrap gap-2">
              <Link className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition" href="/dashboard">
                Dashboard
              </Link>
              <Link className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition" href="/take-test">
                Take Test
              </Link>
              <Link className="px-4 py-2 rounded-lg border border-black bg-yellow-500 font-bold" href="/history">
                History
              </Link>
              <Link className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition" href="/progress">
                Progress
              </Link>
              <Link className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition" href="/leaderboard">
                Leaderboard
              </Link>
              <Link className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition" href="/worksheets">
                Worksheets
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto overflow-x-hidden">
        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-2">History</h2>
          <p className="mb-6">Your quiz history.</p>

          {error ? (
            <div className="mb-4 bg-red-100 border border-black rounded-xl p-4">
              <p className="font-bold">Error</p>
              <p className="text-sm break-words">{error}</p>
            </div>
          ) : null}

          {loading ? (
            <div className="border border-dashed border-black rounded-lg p-6 text-center">
              Loading history...
            </div>
          ) : items.length === 0 ? (
            <div className="border border-dashed border-black rounded-lg p-6 text-center">
              No quiz history yet.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
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
                    Done
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}