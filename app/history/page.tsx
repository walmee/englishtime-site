"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type HistoryRow = {
  student_id: string;
  quiz_id: number;
  score: number;
  created_at?: string | null;
};

type QuizMeta = {
  id: number;
  title: string;
  unit: string | null;
};

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryRow[]>([]);
  const [quizMap, setQuizMap] = useState<Record<number, QuizMeta>>({});
  const [error, setError] = useState("");

  const loadQuizMeta = async (rows: HistoryRow[]) => {
    const quizIds = [...new Set(rows.map((r) => Number(r.quiz_id)).filter(Boolean))];

    if (quizIds.length === 0) {
      setQuizMap({});
      return;
    }

    const { data, error } = await supabase
      .from("quizzes")
      .select("id, title, unit")
      .in("id", quizIds);

    if (error || !Array.isArray(data)) {
      setQuizMap({});
      return;
    }

    const map: Record<number, QuizMeta> = {};
    for (const item of data as QuizMeta[]) {
      map[item.id] = item;
    }
    setQuizMap(map);
  };

  const getQuizLabel = (quizId: number) => {
    const quiz = quizMap[quizId];
    if (!quiz) return "Quiz";
    if (quiz.unit && quiz.title) return `${quiz.unit} • ${quiz.title}`;
    return quiz.title || quiz.unit || "Quiz";
  };

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
        .order("created_at", { ascending: false })
        .limit(50);

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setItems([]);
        setQuizMap({});
        setLoading(false);
        return;
      }

      const rows = Array.isArray(data) ? (data as HistoryRow[]) : [];
      setItems(rows);
      await loadQuizMeta(rows);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden text-black"
      style={{ backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
    >
      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto overflow-x-hidden">
        <div
          className="border border-black rounded-2xl p-6"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
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
                  className="border border-black rounded-lg p-4 flex items-center justify-between gap-3"
                  style={{ backgroundColor: "var(--bg-soft)" }}
                >
                  <div className="min-w-0">
                    <p className="font-semibold break-words">{getQuizLabel(item.quiz_id)}</p>
                    <p className="text-sm">Score: {item.score}%</p>
                    <p className="text-xs break-words">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "No date"}
                    </p>
                  </div>

                  <span
                    className="text-xs px-2 py-1 rounded-md border border-black shrink-0"
                    style={{ backgroundColor: "var(--bg-button)" }}
                  >
                    Completed
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