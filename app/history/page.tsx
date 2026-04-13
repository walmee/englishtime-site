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
type NoticeTone = "error" | "info";

export default function HistoryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryRow[]>([]);
  const [quizMap, setQuizMap] = useState<Record<number, QuizMeta>>({});
  const [attemptAnswersMap, setAttemptAnswersMap] = useState<Record<number, AttemptAnswerRow[]>>(
    {}
  );
  const [questionMap, setQuestionMap] = useState<Record<number, QuestionMeta>>({});
  const [openQuizId, setOpenQuizId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<NoticeTone>("info");

  const getNoticeStyles = (tone: NoticeTone) => {
    if (tone === "error") {
      return {
        wrapper: "bg-red-50 border-red-200 text-red-900",
        title: "Issue",
      };
    }

    return {
      wrapper: "bg-sky-50 border-sky-200 text-sky-900",
      title: "Info",
    };
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

  const averageScore = useMemo(() => {
    if (!items.length) return 0;
    const total = items.reduce((sum, item) => sum + Number(item.score || 0), 0);
    return Math.round(total / items.length);
  }, [items]);

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

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setNotice("");
      setNoticeTone("info");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const accessToken = session.access_token;

      try {
        const res = await fetch("/api/student/history", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const text = await res.text();
        const json = text ? JSON.parse(text) : {};

        if (!mounted) return;

        if (!res.ok) {
          setNotice(json?.error || "History could not be loaded.");
          setNoticeTone("error");
          setItems([]);
          setQuizMap({});
          setAttemptAnswersMap({});
          setQuestionMap({});
          setLoading(false);
          return;
        }

        const historyRows = Array.isArray(json?.history) ? (json.history as HistoryRow[]) : [];
        const quizzes = Array.isArray(json?.quizzes) ? (json.quizzes as QuizMeta[]) : [];
        const attemptAnswers = Array.isArray(json?.attemptAnswers)
          ? (json.attemptAnswers as AttemptAnswerRow[])
          : [];
        const questions = Array.isArray(json?.questions)
          ? (json.questions as QuestionMeta[])
          : [];

        setItems(historyRows);

        const quizMetaMap: Record<number, QuizMeta> = {};
        quizzes.forEach((item) => {
          quizMetaMap[item.id] = item;
        });
        setQuizMap(quizMetaMap);

        const groupedAnswers: Record<number, AttemptAnswerRow[]> = {};
        attemptAnswers.forEach((row) => {
          if (!groupedAnswers[row.quiz_id]) groupedAnswers[row.quiz_id] = [];
          groupedAnswers[row.quiz_id].push(row);
        });
        setAttemptAnswersMap(groupedAnswers);

        const qMap: Record<number, QuestionMeta> = {};
        questions.forEach((q) => {
          qMap[q.id] = q;
        });
        setQuestionMap(qMap);

        setLoading(false);
      } catch (e: any) {
        if (!mounted) return;

        setNotice(e?.message || "History could not be loaded.");
        setNoticeTone("error");
        setItems([]);
        setQuizMap({});
        setAttemptAnswersMap({});
        setQuestionMap({});
        setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [router]);

  const noticeStyles = getNoticeStyles(noticeTone);

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ backgroundColor: "#f5f5f5", color: "#111111" }}
    >
      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto overflow-x-hidden space-y-6">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold mb-2">History</h2>
          <p className="text-sm opacity-80 mb-6">
            Review your completed quizzes, scores, and mistakes.
          </p>

          {notice ? (
            <div className={`mb-4 border rounded-2xl p-4 ${noticeStyles.wrapper}`}>
              <p className="font-bold">{noticeStyles.title}</p>
              <p className="text-sm break-words">{notice}</p>
            </div>
          ) : null}

          {!loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-xs opacity-60">Total Quizzes</div>
                <div className="text-2xl font-bold mt-1">{totalQuizzes}</div>
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-xs opacity-60">Best Score</div>
                <div className="text-2xl font-bold mt-1">{bestScore}%</div>
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-xs opacity-60">Average Score</div>
                <div className="text-2xl font-bold mt-1">{averageScore}%</div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-xl font-bold">Quiz Attempts</h3>
              <p className="text-sm opacity-70 mt-1">
                Open each quiz to review incorrect answers.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSortMode("latest")}
                className="px-4 py-2 rounded-xl border font-bold transition"
                style={{
                  backgroundColor: sortMode === "latest" ? "#facc15" : "#ffffff",
                  color: "#111111",
                  borderColor: "#111111",
                }}
              >
                Latest
              </button>

              <button
                onClick={() => setSortMode("highest")}
                className="px-4 py-2 rounded-xl border font-bold transition"
                style={{
                  backgroundColor: sortMode === "highest" ? "#facc15" : "#ffffff",
                  color: "#111111",
                  borderColor: "#111111",
                }}
              >
                Highest
              </button>

              <button
                onClick={() => setSortMode("lowest")}
                className="px-4 py-2 rounded-xl border font-bold transition"
                style={{
                  backgroundColor: sortMode === "lowest" ? "#facc15" : "#ffffff",
                  color: "#111111",
                  borderColor: "#111111",
                }}
              >
                Lowest
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              Loading history...
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              No quiz history yet.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedItems.map((item, index) => {
                const wrongAnswers =
                  (attemptAnswersMap[item.quiz_id] || []).filter((a) => !a.is_correct) || [];
                const isOpen = openQuizId === item.quiz_id;
                const score = Number(item.score || 0);

                return (
                  <div
                    key={`${item.student_id}-${item.quiz_id}-${index}`}
                    className="rounded-2xl border p-5 shadow-sm"
                    style={{ backgroundColor: "#ffffff", borderColor: "#e5e5e5" }}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="text-xs opacity-60 mb-2">Quiz Attempt</div>
                        <p className="font-bold text-lg break-words">
                          {getQuizLabel(item.quiz_id)}
                        </p>
                        <p className="text-sm opacity-70 mt-2 break-words">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : "No date"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        <span
                          className="text-xs px-3 py-1 rounded-xl border shrink-0 font-bold"
                          style={getScoreBadgeStyle(score)}
                        >
                          {getScoreLabel(score)}
                        </span>

                        <span className="text-xs px-3 py-1 rounded-xl border bg-neutral-50 shrink-0">
                          Score: {score}%
                        </span>

                        <span className="text-xs px-3 py-1 rounded-xl border bg-neutral-50 shrink-0">
                          Wrong: {wrongAnswers.length}
                        </span>

                        <button
                          onClick={() => setOpenQuizId(isOpen ? null : item.quiz_id)}
                          className="px-4 py-2 rounded-xl border font-bold transition"
                          style={{
                            backgroundColor: isOpen ? "#facc15" : "#ffffff",
                            color: "#111111",
                            borderColor: "#111111",
                          }}
                        >
                          {isOpen ? "Hide Mistakes" : "View Mistakes"}
                        </button>
                      </div>
                    </div>

                    {isOpen ? (
                      <div className="mt-5 border-t pt-5 space-y-4" style={{ borderColor: "#e5e5e5" }}>
                        {wrongAnswers.length === 0 ? (
                          <div className="rounded-2xl border border-dashed p-5 text-sm bg-neutral-50">
                            Great job — no wrong answers were saved for this quiz.
                          </div>
                        ) : (
                          wrongAnswers.map((wrong, wrongIndex) => (
                            <div
                              key={`${wrong.quiz_id}-${wrong.question_id}-${wrongIndex}`}
                              className="rounded-2xl border p-5"
                              style={{ backgroundColor: "#fafafa", borderColor: "#e5e5e5" }}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                <p className="font-bold">Wrong Question {wrongIndex + 1}</p>
                                <span className="text-xs px-3 py-1 rounded-xl border bg-red-50 text-red-900 border-red-200">
                                  Incorrect
                                </span>
                              </div>

                              <p className="text-sm break-words mb-4 leading-6">
                                {questionMap[wrong.question_id]?.question_text ||
                                  "Question text not found."}
                              </p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-2xl border bg-red-50 border-red-200 p-4">
                                  <div className="text-xs opacity-70 mb-2">Your Answer</div>
                                  <div className="font-semibold break-words">
                                    {getOptionText(wrong.question_id, wrong.selected_option)}
                                  </div>
                                </div>

                                <div className="rounded-2xl border bg-emerald-50 border-emerald-200 p-4">
                                  <div className="text-xs opacity-70 mb-2">Correct Answer</div>
                                  <div className="font-semibold break-words">
                                    {getOptionText(wrong.question_id, wrong.correct_option)}
                                  </div>
                                </div>
                              </div>
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
        </div>

        {!loading && items.length > 0 ? (
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-2">Latest Result</h3>
            <p className="text-sm opacity-70 mb-4">
              Your most recent saved score is shown below.
            </p>

            <div className="rounded-2xl border bg-neutral-50 p-5">
              <div className="text-xs opacity-60">Latest Score</div>
              <div className="text-3xl font-extrabold mt-1">{latestScore}%</div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}