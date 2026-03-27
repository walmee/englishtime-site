"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type QuestionRow = {
  id: number;
  quiz_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  points: number;
};

type QuizRow = {
  id: number;
  title: string;
  unit: string | null;
};

type RankingRow = {
  student_id: string;
  username: string;
  score: number;
};

type ReviewAnswerRow = {
  question_id: number;
  selected_option: "A" | "B" | "C" | "D" | null;
  correct_option: "A" | "B" | "C" | "D";
  is_correct: boolean;
};

type AnswerMap = Record<number, "A" | "B" | "C" | "D">;

export default function QuizSolvePage() {
  const params = useParams();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const quizId = Number(rawId);

  const [msg, setMsg] = useState("");
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [quizInfo, setQuizInfo] = useState<QuizRow | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [reviewAnswers, setReviewAnswers] = useState<Record<number, ReviewAnswerRow>>({});
  const [quizRanking, setQuizRanking] = useState<RankingRow[]>([]);
  const [serverScore, setServerScore] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        setStudentId(user.id);
      }
    };

    loadUser();
  }, []);

  const totalPoints = useMemo(() => {
    return questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  }, [questions]);

  const answeredCount = useMemo(() => {
    return Object.keys(answers).length;
  }, [answers]);

  const userRank = useMemo(() => {
    if (!studentId || quizRanking.length === 0) return null;
    const index = quizRanking.findIndex((row) => row.student_id === studentId);
    return index >= 0 ? index + 1 : null;
  }, [quizRanking, studentId]);

  const getQuizLabel = (quiz: QuizRow | null) => {
    if (!quiz) return "";
    if (quiz.unit && quiz.title) return `${quiz.unit} • ${quiz.title}`;
    return quiz.title || quiz.unit || "Quiz";
  };

  const loadQuizPageData = async () => {
    if (!quizId) {
      setMsg("Invalid quiz.");
      setQuizInfo(null);
      setQuestions([]);
      return;
    }

    try {
      const res = await fetch(`/api/quiz/${encodeURIComponent(String(quizId))}`);
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setMsg(json?.error || "Quiz could not be loaded.");
        setQuizInfo(null);
        setQuestions([]);
        return;
      }

      setQuizInfo(json?.quiz || null);
      setQuestions(Array.isArray(json?.questions) ? json.questions : []);
    } catch (e: any) {
      setMsg(e?.message || "Quiz could not be loaded.");
      setQuizInfo(null);
      setQuestions([]);
    }
  };

  const loadRanking = async () => {
    setLoadingRanking(true);

    try {
      const res = await fetch(
        `/api/quiz-ranking?quiz_id=${encodeURIComponent(String(quizId))}`
      );
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setQuizRanking([]);
        return;
      }

      setQuizRanking(Array.isArray(json?.ranking) ? json.ranking : []);
    } catch {
      setQuizRanking([]);
    } finally {
      setLoadingRanking(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoadingPage(true);
      setMsg("");
      setFinished(false);
      setAnswers({});
      setReviewAnswers({});
      setQuizRanking([]);
      setServerScore(null);

      await loadQuizPageData();

      setLoadingPage(false);
    };

    if (quizId) {
      init();
    } else {
      setLoadingPage(false);
      setMsg("Invalid quiz.");
    }
  }, [quizId]);

  const pick = (questionId: number, option: "A" | "B" | "C" | "D") => {
    if (finished) return;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const submitTest = async () => {
    setMsg("");

    if (!quizId) {
      setMsg("Invalid quiz.");
      return;
    }

    if (questions.length === 0) {
      setMsg("This quiz has no questions yet.");
      return;
    }

    if (!studentId) {
      setMsg("Student ID not found. Please login again.");
      return;
    }

    setSubmitting(true);

    try {
      setFinished(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        setMsg("Session not found. Please login again.");
        setFinished(false);
        return;
      }

      const submittedAnswers = questions.map((q) => ({
        question_id: q.id,
        selected_option: answers[q.id] ?? null,
      }));

      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          quiz_id: Number(quizId),
          answers: submittedAnswers,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMsg(json?.error || "Submit failed.");
        setFinished(false);
        return;
      }

      const incomingAnswers: ReviewAnswerRow[] = Array.isArray(json?.answers) ? json.answers : [];
      const reviewMap: Record<number, ReviewAnswerRow> = {};

      incomingAnswers.forEach((item) => {
        reviewMap[item.question_id] = item;
      });

      setReviewAnswers(reviewMap);
      setServerScore(typeof json?.score === "number" ? json.score : 0);
      setMsg(json?.message || "Completed successfully.");

      await loadRanking();
    } catch (e: any) {
      setMsg(e?.message || "Unexpected error");
      setFinished(false);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForRetry = () => {
    setFinished(false);
    setAnswers({});
    setReviewAnswers({});
    setServerScore(null);
    setQuizRanking([]);
    setMsg("");
  };

  if (loadingPage) {
    return (
      <div
        className="min-h-screen w-full"
        style={{ backgroundColor: "#f5f5f5", color: "#111111" }}
      >
        <main className="w-full px-3 py-6 md:max-w-5xl md:mx-auto">
          <div className="rounded-3xl border p-10 text-center bg-white shadow-sm">
            Loading test...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ backgroundColor: "#f5f5f5", color: "#111111" }}
    >
      <main className="w-full px-3 py-6 md:max-w-5xl md:mx-auto overflow-x-hidden space-y-6">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold mb-2">Take a Test</h2>
              <p className="text-sm opacity-80 break-words">{getQuizLabel(quizInfo)}</p>
            </div>

            <Link
              href="/take-test"
              className="px-4 py-2 rounded-xl border font-bold hover:bg-neutral-100 transition"
            >
              ← Back to tests
            </Link>
          </div>

          {msg && !quizInfo && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="font-bold">Notice</p>
              <p className="text-sm break-words">{msg}</p>
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border bg-neutral-50 p-4">
              <div className="text-xs opacity-60">Questions</div>
              <div className="text-2xl font-extrabold mt-1">{questions.length}</div>
            </div>

            <div className="rounded-2xl border bg-neutral-50 p-4">
              <div className="text-xs opacity-60">Answered</div>
              <div className="text-2xl font-extrabold mt-1">
                {answeredCount}/{questions.length}
              </div>
            </div>

            <div className="rounded-2xl border bg-neutral-50 p-4">
              <div className="text-xs opacity-60">Total points</div>
              <div className="text-2xl font-extrabold mt-1">{totalPoints}</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xl font-bold">Questions</h3>
              <p className="text-sm opacity-70 mt-1">{getQuizLabel(quizInfo)}</p>
            </div>
          </div>

          {msg && quizInfo && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="font-bold">Notice</p>
              <p className="text-sm break-words">{msg}</p>
            </div>
          )}

          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              No questions found for this quiz.
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {questions.map((q, idx) => {
                  const picked = answers[q.id];
                  const review = reviewAnswers[q.id];
                  const isCorrect = review?.is_correct ?? false;

                  return (
                    <div
                      key={q.id}
                      className="rounded-2xl p-5 border shadow-sm"
                      style={{ backgroundColor: "#ffffff", borderColor: "#e5e5e5" }}
                    >
                      <div className="font-bold text-lg">
                        Q{idx + 1} <span className="text-sm opacity-60">({q.points} pts)</span>
                      </div>

                      <div className="mt-2 text-base break-words">{q.question_text}</div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(
                          [
                            ["A", q.option_a],
                            ["B", q.option_b],
                            ["C", q.option_c],
                            ["D", q.option_d],
                          ] as const
                        ).map(([opt, text]) => {
                          const selected = picked === opt;
                          const correct = review?.correct_option === opt;

                          let bg = "#f9fafb";
                          let borderColor = "#d4d4d4";

                          if (finished) {
                            if (correct) {
                              bg = "#d1fae5";
                              borderColor = "#86efac";
                            } else if (selected) {
                              bg = "#fee2e2";
                              borderColor = "#fca5a5";
                            }
                          } else if (selected) {
                            bg = "#fde68a";
                            borderColor = "#facc15";
                          }

                          return (
                            <button
                              key={opt}
                              onClick={() => pick(q.id, opt)}
                              disabled={finished}
                              className="text-left px-4 py-3 rounded-xl border transition break-words"
                              style={{
                                backgroundColor: bg,
                                borderColor,
                              }}
                            >
                              <b>{opt})</b> {text}
                            </button>
                          );
                        })}
                      </div>

                      {finished ? (
                        <div className="mt-3 text-sm font-medium break-words">
                          Your answer: {review?.selected_option ?? "-"} • Correct:{" "}
                          {review?.correct_option ?? "-"} •{" "}
                          {review?.selected_option
                            ? isCorrect
                              ? "✅ Correct"
                              : "❌ Wrong"
                            : "❌ Not answered"}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-center">
                {!finished ? (
                  <button
                    onClick={submitTest}
                    disabled={submitting || questions.length === 0}
                    className="px-6 py-3 rounded-2xl border font-bold transition disabled:opacity-60"
                    style={{ backgroundColor: "#facc15", color: "#111111", borderColor: "#111111" }}
                  >
                    {submitting ? "Submitting..." : "Submit Test"}
                  </button>
                ) : (
                  <button
                    onClick={resetForRetry}
                    className="px-6 py-3 rounded-2xl border font-bold transition"
                    style={{ backgroundColor: "#facc15", color: "#111111", borderColor: "#111111" }}
                  >
                    Try Again
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {finished ? (
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-2">Result</h3>
            <p className="text-sm mb-2 break-words">{getQuizLabel(quizInfo)}</p>
            <p className="text-sm mb-4 opacity-80">
              Score is calculated on the server and saved to leaderboard after you submit this quiz.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {[
                { label: "Score", value: serverScore ?? 0 },
                { label: "Total", value: totalPoints },
                { label: "Answered", value: `${answeredCount}/${questions.length}` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-5 rounded-2xl shadow-sm border"
                  style={{ backgroundColor: "#ffffff", borderColor: "#e5e5e5" }}
                >
                  <div className="text-xs opacity-60">{item.label}</div>
                  <div className="text-2xl font-bold mt-1">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border bg-neutral-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-xl font-bold">This Quiz Ranking</h4>
                  <p className="text-sm opacity-70">
                    See how students ranked in this test.
                  </p>
                </div>

                {userRank ? (
                  <div className="px-3 py-2 rounded-xl border font-bold bg-white">
                    Your Rank: #{userRank}
                  </div>
                ) : null}
              </div>

              {loadingRanking ? (
                <div className="rounded-2xl border border-dashed p-6 text-center">
                  Loading ranking...
                </div>
              ) : quizRanking.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center">
                  No ranking found for this quiz yet.
                </div>
              ) : (
                <div className="space-y-3 mt-4">
                  {quizRanking.map((row, index) => {
                    const isCurrentUser = row.student_id === studentId;

                    return (
                      <div
                        key={row.student_id}
                        className="flex items-center justify-between p-4 rounded-xl border shadow-sm"
                        style={{
                          backgroundColor: isCurrentUser ? "#fde68a" : "#ffffff",
                          borderColor: "#e5e5e5",
                        }}
                      >
                        <div className="font-medium break-words">
                          #{index + 1} • {row.username}
                          {isCurrentUser ? " (You)" : ""}
                        </div>

                        <div className="font-bold shrink-0">{row.score} pts</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/leaderboard"
                className="px-4 py-2 rounded-xl border font-bold hover:bg-neutral-100 transition"
              >
                View Leaderboard →
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl border font-bold hover:bg-neutral-100 transition"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}