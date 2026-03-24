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

type GroupedQuizMap = Record<string, Record<string, QuizRow[]>>;

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

  const selectedQuiz = useMemo(() => {
    return quizzes.find((q) => q.id === quizId) || null;
  }, [quizzes, quizId]);

  const getQuizLabel = (quiz: QuizRow) => {
    if (quiz.unit && quiz.title) return `${quiz.unit} • ${quiz.title}`;
    return quiz.title || quiz.unit || "Quiz";
  };

  const getTopicAndTest = (quiz: QuizRow) => {
    const parts = quiz.title.split(" - ");
    const topic = parts[1] || "General";
    const testName = parts[2] || quiz.title;
    return { topic, testName };
  };

  const groupedQuizzes = useMemo<GroupedQuizMap>(() => {
    const grouped: GroupedQuizMap = {};

    quizzes.forEach((q) => {
      const unitKey = q.unit || "No Unit";
      const { topic } = getTopicAndTest(q);

      if (!grouped[unitKey]) grouped[unitKey] = {};
      if (!grouped[unitKey][topic]) grouped[unitKey][topic] = [];

      grouped[unitKey][topic].push(q);
    });

    return grouped;
  }, [quizzes]);

  const loadQuizzes = async () => {
    setMsg("");
    setLoadingQuizzes(true);

    if (!studentId) {
      setLoadingQuizzes(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("level, class_name")
      .eq("id", studentId)
      .single();

    if (profileError || !profile) {
      setMsg("Profile information could not be loaded.");
      setQuizzes([]);
      setLoadingQuizzes(false);
      return;
    }

    const level = profile.level ? String(profile.level).trim() : "all";

    let className = profile.class_name ? String(profile.class_name).trim() : "all";

    const { data: classStudent } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", studentId)
      .maybeSingle();

    if (classStudent?.class_id) {
      const { data: classRow } = await supabase
        .from("classes")
        .select("class_name")
        .eq("id", classStudent.class_id)
        .maybeSingle();

      if (classRow?.class_name) {
        className = String(classRow.class_name).trim();
      }
    }

    const { data, error } = await supabase
      .from("quizzes")
      .select("id, title, unit")
      .or(
        `and(level.eq."${level}",class_name.eq."${className}"),and(level.eq."${level}",class_name.eq."all"),and(level.eq."all",class_name.eq."all")`
      )
      .order("id", { ascending: false });

    if (error) {
      setMsg(error.message);
      setQuizzes([]);
      setLoadingQuizzes(false);
      return;
    }

    const list = Array.isArray(data) ? (data as QuizRow[]) : [];
    setQuizzes(list);

    if (list.length > 0) {
      setQuizId(list[0].id);
    } else {
      setQuizId(null);
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
    if (studentId) {
      loadQuizzes();
    }
  }, [studentId]);

  useEffect(() => {
    if (quizId) {
      loadQuestions(quizId);
    } else {
      setQuestions([]);
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
      const submittedAnswers = questions.map((q) => ({
        question_id: q.id,
        selected_option: answers[q.id] ?? null,
        correct_option: q.correct_option,
      }));

      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: studentId,
          quiz_id: Number(quizId),
          score: Number(score),
          answers: submittedAnswers,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMsg(json?.error || "Leaderboard save failed.");
        return;
      }

      setMsg(json?.message || "Completed successfully.");
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
    <div
      className="min-h-screen w-full overflow-x-hidden text-black"
      style={{ backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
    >
      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto overflow-x-hidden space-y-6">
        <div
          className="border border-black rounded-2xl p-6"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
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

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-3">Select quiz</label>

              {loadingQuizzes ? (
                <div
                  className="w-full p-4 rounded-lg border border-black"
                  style={{ backgroundColor: "var(--bg-soft)" }}
                >
                  Loading quizzes...
                </div>
              ) : quizzes.length === 0 ? (
                <div
                  className="w-full p-4 rounded-lg border border-black"
                  style={{ backgroundColor: "var(--bg-soft)" }}
                >
                  No quizzes available
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedQuizzes).map(([unitKey, topics]) => (
                    <div
                      key={unitKey}
                      className="border border-black rounded-xl p-4"
                      style={{ backgroundColor: "var(--bg-soft)" }}
                    >
                      <h3 className="text-lg font-extrabold mb-3">{unitKey}</h3>

                      <div className="space-y-3">
                        {Object.entries(topics).map(([topicKey, tests]) => (
                          <div key={topicKey}>
                            <h4 className="font-bold mb-2">{topicKey}</h4>

                            <div className="space-y-2 pl-2">
                              {tests.map((q) => {
                                const { testName } = getTopicAndTest(q);
                                const isSelected = quizId === q.id;

                                return (
                                  <button
                                    key={q.id}
                                    onClick={() => setQuizId(q.id)}
                                    disabled={submitting}
                                    className="block w-full text-left px-4 py-3 rounded-lg border border-black transition font-semibold"
                                    style={{
                                      backgroundColor: isSelected
                                        ? "var(--bg-button)"
                                        : "var(--bg-card)",
                                      color: "var(--text-main)",
                                    }}
                                  >
                                    {testName}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="border border-black rounded-xl p-4"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              <div className="text-xs opacity-80">Progress</div>
              <div className="font-bold">
                {answeredCount}/{questions.length} answered
              </div>
              <div className="text-xs opacity-80 mt-1">Total points: {totalPoints}</div>
            </div>
          </div>
        </div>

        <div
          className="border border-black rounded-2xl p-6"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xl font-bold">Questions</h3>
              {selectedQuiz ? (
                <p className="text-sm opacity-80 mt-1 break-words">
                  {getQuizLabel(selectedQuiz)}
                </p>
              ) : null}
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
            <>
              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const picked = answers[q.id];
                  const isCorrect = picked && picked === q.correct_option;

                  return (
                    <div
                      key={q.id}
                      className="border border-black rounded-xl p-4"
                      style={{ backgroundColor: "var(--bg-soft)" }}
                    >
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
                                finished ? "opacity-80 cursor-default" : "",
                              ].join(" ")}
                              style={{
                                backgroundColor: selected ? "var(--bg-button)" : "var(--bg-card)",
                                color: "var(--text-main)",
                              }}
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

              <div className="mt-6 flex justify-center">
                {!finished ? (
                  <button
                    onClick={submitTest}
                    disabled={submitting || loadingQuestions || questions.length === 0}
                    className="px-6 py-3 rounded-xl border border-black font-bold transition disabled:opacity-60"
                    style={{ backgroundColor: "var(--bg-button)", color: "var(--text-main)" }}
                  >
                    {submitting ? "Submitting..." : "Submit Test"}
                  </button>
                ) : (
                  <button
                    onClick={resetForRetry}
                    className="px-6 py-3 rounded-xl border border-black transition font-bold"
                    style={{ backgroundColor: "var(--bg-button)", color: "var(--text-main)" }}
                  >
                    Try Again
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {finished ? (
          <div
            className="border border-black rounded-2xl p-6"
            style={{ backgroundColor: "var(--bg-card)" }}
          >
            <h3 className="text-xl font-bold mb-2">Result</h3>
            {selectedQuiz ? (
              <p className="text-sm mb-2 break-words">{getQuizLabel(selectedQuiz)}</p>
            ) : null}
            <p className="text-sm mb-4">
              Score is saved to leaderboard after you submit this quiz.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className="border border-black rounded-xl p-4"
                style={{ backgroundColor: "var(--bg-soft)" }}
              >
                <div className="text-xs opacity-80">Points</div>
                <div className="text-2xl font-extrabold">{chosenPoints}</div>
              </div>
              <div
                className="border border-black rounded-xl p-4"
                style={{ backgroundColor: "var(--bg-soft)" }}
              >
                <div className="text-xs opacity-80">Total</div>
                <div className="text-2xl font-extrabold">{totalPoints}</div>
              </div>
              <div
                className="border border-black rounded-xl p-4"
                style={{ backgroundColor: "var(--bg-soft)" }}
              >
                <div className="text-xs opacity-80">Answered</div>
                <div className="text-2xl font-extrabold">
                  {answeredCount}/{questions.length}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/leaderboard"
                className="px-4 py-2 rounded-lg border border-black transition font-bold"
                style={{ backgroundColor: "var(--bg-button)", color: "var(--text-main)" }}
              >
                View Leaderboard →
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg border border-black transition font-bold"
                style={{ backgroundColor: "var(--bg-soft)", color: "var(--text-main)" }}
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