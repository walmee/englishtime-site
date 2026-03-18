"use client";

import { useEffect, useMemo, useState } from "react";
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

type AttemptAnswerRow = {
  quiz_id: number;
  question_id: number;
  selected_option: string | null;
  correct_option: string;
  is_correct: boolean;
};

type QuestionMeta = {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
};

type SortMode = "latest" | "highest" | "lowest";

export default function HistoryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryRow[]>([]);
  const [quizMap, setQuizMap] = useState<Record<number, QuizMeta>>({});
  const [attemptAnswersMap, setAttemptAnswersMap] = useState<Record<number, AttemptAnswerRow[]>>({});
  const [questionMap, setQuestionMap] = useState<Record<number, QuestionMeta>>({});
  const [openQuizId, setOpenQuizId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("latest");
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

  const loadAttemptAnswers = async (studentId: string, rows: HistoryRow[]) => {
    const quizIds = [...new Set(rows.map((r) => Number(r.quiz_id)).filter(Boolean))];

    if (quizIds.length === 0) {
      setAttemptAnswersMap({});
      setQuestionMap({});
      return;
    }

    const { data: answersData, error: answersError } = await supabase
      .from("quiz_attempt_answers")
      .select("quiz_id, question_id, selected_option, correct_option, is_correct")
      .eq("student_id", studentId)
      .in("quiz_id", quizIds);

    if (answersError || !Array.isArray(answersData)) {
      setAttemptAnswersMap({});
      setQuestionMap({});
      return;
    }

    const grouped: Record<number, AttemptAnswerRow[]> = {};
    const questionIds: number[] = [];

    for (const row of answersData as AttemptAnswerRow[]) {
      if (!grouped[row.quiz_id]) grouped[row.quiz_id] = [];
      grouped[row.quiz_id].push(row);
      questionIds.push(Number(row.question_id));
    }

    setAttemptAnswersMap(grouped);

    const uniqueQuestionIds = [...new Set(questionIds.filter(Boolean))];
    if (uniqueQuestionIds.length === 0) {
      setQuestionMap({});
      return;
    }

    const { data: questionData, error: questionError } = await supabase
      .from("questions")
      .select("id, question_text, option_a, option_b, option_c, option_d")
      .in("id", uniqueQuestionIds);

    if (questionError || !Array.isArray(questionData)) {
      setQuestionMap({});
      return;
    }

    const qMap: Record<number, QuestionMeta> = {};
    for (const q of questionData as QuestionMeta[]) {
      qMap[q.id] = q;
    }
    setQuestionMap(qMap);
  };

  const getQuizLabel = (quizId: number) => {
    const quiz = quizMap[quizId];
    if (!quiz) return "Quiz";
    if (quiz.unit && quiz.title) return `${quiz.unit} • ${quiz.title}`;
    return quiz.title || quiz.unit || "Quiz";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    return "Needs Practice";
  };

  const getScoreBadgeStyle = (score: number) => {
    if (score >= 90) {
      return { backgroundColor: "#dcfce7", color: "#166534" };
    }
    if (score >= 75) {
      return { backgroundColor: "#fef3c7", color: "#92400e" };
    }
    return { backgroundColor: "#fee2e2", color: "#991b1b" };
  };

  const getOptionText = (questionId: number, option: string | null) => {
    if (!option) return "-";

    const question = questionMap[questionId];
    if (!question) return option;

    const normalized = String(option).toUpperCase();

    if (normalized === "A") return question.option_a || "A";
    if (normalized === "B") return question.option_b || "B";
    if (normalized === "C") return question.option_c || "C";
    if (normalized === "D") return question.option_d || "D";

    return option;
  };

  const sortedItems = useMemo(() => {
    const list = [...items];

    if (sortMode === "highest") {
      list.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    } else if (sortMode === "lowest") {
      list.sort((a, b) => Number(a.score || 0) - Number(b.score || 0));
    } else {
      list.sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });
    }

    return list;
  }, [items, sortMode]);

  const totalQuizzes = items.length;

  const bestScore = useMemo(() => {
    if (!items.length) return 0;
    return Math.max(...items.map((item) => Number(item.score || 0)));
  }, [items]);

  const latestScore = useMemo(() => {
    if (!items.length) return 0;
    const latest = [...items].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })[0];
    return Number(latest?.score || 0);
  }, [items]);

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

      const studentId = session.user.id;

      const { data, error } = await supabase
        .from("leaderboard")
        .select("student_id, quiz_id, score, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setItems([]);
        setQuizMap({});
        setAttemptAnswersMap({});
        setQuestionMap({});
        setLoading(false);
        return;
      }

      const rows = Array.isArray(data) ? (data as HistoryRow[]) : [];
      setItems(rows);

      await Promise.all([
        loadQuizMeta(rows),
        loadAttemptAnswers(studentId, rows),
      ]);

      if (!mounted) return;
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
      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto overflow-x-hidden space-y-6">
        <div
          className="border border-black rounded-2xl p-6"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <h2 className="text-2xl font-bold mb-2">History</h2>
          <p className="mb-6">Review your completed quizzes and mistakes.</p>

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
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div
                  className="border border-black rounded-xl p-4"
                  style={{ backgroundColor: "var(--bg-soft)" }}
                >
                  <p className="text-sm opacity-80">Total Quizzes</p>
                  <p className="text-3xl font-bold">{totalQuizzes}</p>
                </div>

                <div
                  className="border border-black rounded-xl p-4"
                  style={{ backgroundColor: "var(--bg-soft)" }}
                >
                  <p className="text-sm opacity-80">Best Score</p>
                  <p className="text-3xl font-bold">{bestScore}%</p>
                </div>

                <div
                  className="border border-black rounded-xl p-4"
                  style={{ backgroundColor: "var(--bg-soft)" }}
                >
                  <p className="text-sm opacity-80">Latest Score</p>
                  <p className="text-3xl font-bold">{latestScore}%</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setSortMode("latest")}
                  className="px-4 py-2 rounded-lg border border-black font-bold transition"
                  style={{
                    backgroundColor:
                      sortMode === "latest" ? "var(--bg-button)" : "var(--bg-soft)",
                    color: "var(--text-main)",
                  }}
                >
                  Latest
                </button>

                <button
                  onClick={() => setSortMode("highest")}
                  className="px-4 py-2 rounded-lg border border-black font-bold transition"
                  style={{
                    backgroundColor:
                      sortMode === "highest" ? "var(--bg-button)" : "var(--bg-soft)",
                    color: "var(--text-main)",
                  }}
                >
                  Highest
                </button>

                <button
                  onClick={() => setSortMode("lowest")}
                  className="px-4 py-2 rounded-lg border border-black font-bold transition"
                  style={{
                    backgroundColor:
                      sortMode === "lowest" ? "var(--bg-button)" : "var(--bg-soft)",
                    color: "var(--text-main)",
                  }}
                >
                  Lowest
                </button>
              </div>

              {sortedItems.length === 0 ? (
                <div className="border border-dashed border-black rounded-lg p-6 text-center">
                  No quiz history yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedItems.map((item) => {
                    const wrongAnswers =
                      (attemptAnswersMap[item.quiz_id] || []).filter((a) => !a.is_correct) || [];
                    const isOpen = openQuizId === item.quiz_id;

                    return (
                      <div
                        key={`${item.student_id}-${item.quiz_id}`}
                        className="border border-black rounded-xl p-4"
                        style={{ backgroundColor: "var(--bg-soft)" }}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold text-lg break-words">
                              {getQuizLabel(item.quiz_id)}
                            </p>
                            <p className="text-sm mt-1">Score: {item.score}%</p>
                            <p className="text-xs break-words mt-1">
                              {item.created_at
                                ? new Date(item.created_at).toLocaleString()
                                : "No date"}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 items-center">
                            <span
                              className="text-xs px-3 py-1 rounded-md border border-black shrink-0 font-bold"
                              style={getScoreBadgeStyle(Number(item.score || 0))}
                            >
                              {getScoreLabel(Number(item.score || 0))}
                            </span>

                            <span
                              className="text-xs px-3 py-1 rounded-md border border-black shrink-0"
                              style={{ backgroundColor: "var(--bg-button)" }}
                            >
                              Completed
                            </span>

                            <button
                              onClick={() =>
                                setOpenQuizId(isOpen ? null : item.quiz_id)
                              }
                              className="text-xs px-3 py-1 rounded-md border border-black shrink-0 font-bold transition"
                              style={{
                                backgroundColor: isOpen
                                  ? "var(--bg-button)"
                                  : "var(--bg-card)",
                                color: "var(--text-main)",
                              }}
                            >
                              {isOpen ? "Hide Mistakes" : "View Mistakes"}
                            </button>
                          </div>
                        </div>

                        {isOpen ? (
                          <div className="mt-4 border-t border-black pt-4 space-y-3">
                            {wrongAnswers.length === 0 ? (
                              <div className="border border-dashed border-black rounded-lg p-4 text-sm">
                                Great job — no wrong answers were saved for this quiz.
                              </div>
                            ) : (
                              wrongAnswers.map((wrong, index) => (
                                <div
                                  key={`${wrong.quiz_id}-${wrong.question_id}`}
                                  className="border border-black rounded-lg p-4"
                                  style={{ backgroundColor: "var(--bg-card)" }}
                                >
                                  <p className="font-bold mb-2">
                                    Wrong Question {index + 1}
                                  </p>
                                  <p className="text-sm break-words mb-3">
                                    {questionMap[wrong.question_id]?.question_text ||
                                      "Question text not found."}
                                  </p>
                                  <p className="text-sm break-words">
                                    <b>Your answer:</b> {getOptionText(wrong.question_id, wrong.selected_option)}
                                  </p>
                                  <p className="text-sm break-words">
                                    <b>Correct answer:</b> {getOptionText(wrong.question_id, wrong.correct_option)}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}