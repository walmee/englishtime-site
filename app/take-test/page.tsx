"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

type QuizRow = {
  id: number;
  title: string;
  unit: string | null;
};

type QuestionRow = {
  id: number;
  quiz_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  points: number;
};

type AnswerMap = Record<number, "A" | "B" | "C" | "D">;

export default function TakeTestPage() {
  const [msg, setMsg] = useState("");
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [quizId, setQuizId] = useState<number | null>(null);

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});

  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);

  const [studentId, setStudentId] = useState("");

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

  const chosenPoints = useMemo(() => {
    let sum = 0;
    for (const q of questions) {
      const picked = answers[q.id];
      if (picked && picked === q.correct_option) sum += Number(q.points) || 0;
    }
    return sum;
  }, [questions, answers]);

  const answeredCount = useMemo(() => {
    return Object.keys(answers).length;
  }, [answers]);

  const loadQuizzes = async () => {
    setMsg("");
    setLoadingQuizzes(true);

    const { data, error } = await supabase
      .from("quizzes")
      .select("id, title, unit")
      .order("id", { ascending: false });

    if (error) {
      setMsg(error.message);
      setQuizzes([]);
      setLoadingQuizzes(false);
      return;
    }

    const list = Array.isArray(data) ? (data as QuizRow[]) : [];
    setQuizzes(list);

    if (!quizId && list.length > 0) {
      setQuizId(list[0].id);
    }

    setLoadingQuizzes(false);
  };

  const loadQuestions = async (qid: number) => {
    setMsg("");
    setLoadingQuestions(true);
    setFinished(false);
    setAnswers({});

    const { data, error } = await supabase
      .from("questions")
      .select(
        "id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, points"
      )
      .eq("quiz_id", qid)
      .order("id", { ascending: true });

    if (error) {
      setMsg(error.message);
      setQuestions([]);
      setLoadingQuestions(false);
      return;
    }

    setQuestions(Array.isArray(data) ? (data as QuestionRow[]) : []);
    setLoadingQuestions(false);
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  useEffect(() => {
    if (quizId) {
      loadQuestions(quizId);
    }
  }, [quizId]);

  const pick = (questionId: number, option: "A" | "B" | "C" | "D") => {
    if (finished) return;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const submitTest = async () => {
    setMsg("");

    if (!quizId) {
      setMsg("Please select a quiz.");
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

      const score = chosenPoints;

      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: studentId,
          quiz_id: Number(quizId),
          score: Number(score),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMsg(json?.error || "Leaderboard kaydı başarısız.");
        return;
      }

      setMsg(json?.message || "İşlem tamamlandı.");
    } catch (e: any) {
      setMsg(e?.message || "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForRetry = () => {
    setFinished(false);
    setAnswers({});
    setMsg("");
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-yellow-300 text-black">
      <header className="border-b border-black bg-yellow-200 w-full overflow-x-hidden">
        <div className="w-full px-3 py-4 md:max-w-6xl md:mx-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h1 className="text-xl font-bold">English Time</h1>

            <nav className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/take-test"
                className="px-4 py-2 rounded-lg border border-black bg-yellow-500 font-bold"
              >
                Take Test
              </Link>
              <Link
                href="/history"
                className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
              >
                History
              </Link>
              <Link
                href="/progress"
                className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
              >
                Progress
              </Link>
              <Link
                href="/leaderboard"
                className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
              >
                Leaderboard
              </Link>
              <Link
                href="/worksheets"
                className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
              >
                Worksheets
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto overflow-x-hidden space-y-6">
        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-2">Take a Test</h2>
          <p className="text-sm opacity-90">
            Choose a quiz, answer the questions, then submit to see your result.
          </p>

          {msg ? (
            <div className="mt-4 bg-red-100 border border-black rounded-xl p-4">
              <p className="font-bold">Notice</p>
              <p className="text-sm break-words">{msg}</p>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">Select quiz</label>
              <select
                value={quizId ?? ""}
                onChange={(e) => setQuizId(Number(e.target.value))}
                disabled={loadingQuizzes || submitting}
                className="w-full p-3 rounded-lg border border-black bg-yellow-50"
              >
                {loadingQuizzes ? (
                  <option>Loading quizzes...</option>
                ) : (
                  quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      #{q.id} • {q.unit ?? "-"} • {q.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="bg-yellow-50 border border-black rounded-xl p-4">
              <div className="text-xs opacity-80">Progress</div>
              <div className="font-bold">
                {answeredCount}/{questions.length} answered
              </div>
              <div className="text-xs opacity-80 mt-1">Total points: {totalPoints}</div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-xl font-bold">Questions</h3>

            <div className="flex flex-wrap gap-2">
              {!finished ? (
                <button
                  onClick={submitTest}
                  disabled={submitting || loadingQuestions || questions.length === 0}
                  className="px-4 py-2 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit Test"}
                </button>
              ) : (
                <button
                  onClick={resetForRetry}
                  className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition font-bold"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>

          {loadingQuestions ? (
            <div className="border border-dashed border-black rounded-lg p-8 text-center">
              Loading questions...
            </div>
          ) : questions.length === 0 ? (
            <div className="border border-dashed border-black rounded-lg p-8 text-center">
              No questions found for this quiz.
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const picked = answers[q.id];
                const isCorrect = picked && picked === q.correct_option;

                return (
                  <div key={q.id} className="bg-yellow-50 border border-black rounded-xl p-4">
                    <div className="font-bold">
                      Q{idx + 1}. ({q.points} pts)
                    </div>
                    <div className="mt-1 break-words">{q.question_text}</div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(
                        [
                          ["A", q.option_a],
                          ["B", q.option_b],
                          ["C", q.option_c],
                          ["D", q.option_d],
                        ] as const
                      ).map(([opt, text]) => {
                        const selected = picked === opt;

                        return (
                          <button
                            key={opt}
                            onClick={() => pick(q.id, opt)}
                            disabled={finished}
                            className={[
                              "text-left px-3 py-3 rounded-lg border border-black transition break-words",
                              selected ? "bg-yellow-300" : "bg-yellow-100 hover:bg-yellow-200",
                              finished ? "opacity-80 cursor-default" : "",
                            ].join(" ")}
                          >
                            <b>{opt})</b> {text}
                          </button>
                        );
                      })}
                    </div>

                    {finished ? (
                      <div className="mt-3 text-sm font-bold break-words">
                        Your answer: {picked ?? "-"} • Correct: {q.correct_option} •{" "}
                        {picked ? (isCorrect ? "✅ Correct" : "❌ Wrong") : "❌ Not answered"}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {finished ? (
          <div className="bg-yellow-100 border border-black rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-2">Result</h3>
            <p className="text-sm mb-4">
              Score is saved to leaderboard after you submit this quiz.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-yellow-50 border border-black rounded-xl p-4">
                <div className="text-xs opacity-80">Points</div>
                <div className="text-2xl font-extrabold">{chosenPoints}</div>
              </div>
              <div className="bg-yellow-50 border border-black rounded-xl p-4">
                <div className="text-xs opacity-80">Total</div>
                <div className="text-2xl font-extrabold">{totalPoints}</div>
              </div>
              <div className="bg-yellow-50 border border-black rounded-xl p-4">
                <div className="text-xs opacity-80">Answered</div>
                <div className="text-2xl font-extrabold">
                  {answeredCount}/{questions.length}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/leaderboard"
                className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition font-bold"
              >
                View Leaderboard →
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 transition"
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