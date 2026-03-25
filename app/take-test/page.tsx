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

type ResultRow = {
  quiz_id: number;
};

type LeaderboardRow = {
  student_id: string;
  quiz_id: number;
  score: number;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
};

type RankingRow = {
  student_id: string;
  username: string;
  score: number;
};

type AnswerMap = Record<number, "A" | "B" | "C" | "D">;
type GroupedQuizMap = Record<string, Record<string, QuizRow[]>>;

export default function TakeTestPage() {
  const [msg, setMsg] = useState("");
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingRanking, setLoadingRanking] = useState(false);

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [quizId, setQuizId] = useState<number | null>(null);

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});

  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [completedQuizIds, setCompletedQuizIds] = useState<number[]>([]);
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({});
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({});
  const [quizRanking, setQuizRanking] = useState<RankingRow[]>([]);

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

  const userRank = useMemo(() => {
    if (!studentId || quizRanking.length === 0) return null;
    const index = quizRanking.findIndex((row) => row.student_id === studentId);
    return index >= 0 ? index + 1 : null;
  }, [quizRanking, studentId]);

  const loadCompletedQuizzes = async (sid: string) => {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("quiz_id")
      .eq("student_id", sid);

    if (error) {
      setCompletedQuizIds([]);
      return;
    }

    const ids = Array.isArray(data)
      ? (data as ResultRow[]).map((row) => Number(row.quiz_id)).filter(Boolean)
      : [];

    setCompletedQuizIds(ids);
  };

  const loadQuizRanking = async (qid: number) => {
    setLoadingRanking(true);

    const { data, error } = await supabase
      .from("leaderboard")
      .select("student_id, quiz_id, score, created_at")
      .eq("quiz_id", qid)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      setQuizRanking([]);
      setLoadingRanking(false);
      return;
    }

    const rows = Array.isArray(data) ? (data as LeaderboardRow[]) : [];

    const firstByStudent = new Map<string, LeaderboardRow>();
    rows.forEach((row) => {
      if (!firstByStudent.has(row.student_id)) {
        firstByStudent.set(row.student_id, row);
      }
    });

    const dedupedRows = Array.from(firstByStudent.values());

    const studentIds = dedupedRows.map((row) => row.student_id);

    if (studentIds.length === 0) {
      setQuizRanking([]);
      setLoadingRanking(false);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", studentIds);

    const profileMap: Record<string, string> = {};
    ((profileData || []) as ProfileRow[]).forEach((profile) => {
      profileMap[profile.id] = profile.username || "Student";
    });

    const ranking = dedupedRows
      .map((row) => ({
        student_id: row.student_id,
        username: profileMap[row.student_id] || "Student",
        score: Number(row.score) || 0,
      }))
      .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));

    setQuizRanking(ranking);
    setLoadingRanking(false);
  };

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

    const initialOpenUnits: Record<string, boolean> = {};
    const initialOpenTopics: Record<string, boolean> = {};

    list.forEach((q, index) => {
      const unitKey = q.unit || "No Unit";
      const { topic } = getTopicAndTest(q);
      const topicKey = `${unitKey}__${topic}`;

      if (index === 0) {
        initialOpenUnits[unitKey] = true;
        initialOpenTopics[topicKey] = true;
      } else {
        if (initialOpenUnits[unitKey] === undefined) initialOpenUnits[unitKey] = false;
        if (initialOpenTopics[topicKey] === undefined) initialOpenTopics[topicKey] = false;
      }
    });

    setOpenUnits(initialOpenUnits);
    setOpenTopics(initialOpenTopics);

    await loadCompletedQuizzes(studentId);
    setLoadingQuizzes(false);
  };

  const loadQuestions = async (qid: number) => {
    setMsg("");
    setLoadingQuestions(true);
    setFinished(false);
    setAnswers({});
    setQuizRanking([]);

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
      setQuizRanking([]);
    }
  }, [quizId]);

  const toggleUnit = (unitKey: string) => {
    setOpenUnits((prev) => ({ ...prev, [unitKey]: !prev[unitKey] }));
  };

  const toggleTopic = (topicKey: string) => {
    setOpenTopics((prev) => ({ ...prev, [topicKey]: !prev[topicKey] }));
  };

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
      await loadCompletedQuizzes(studentId);
      await loadQuizRanking(Number(quizId));
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

  const selectedQuizDetails = selectedQuiz ? getTopicAndTest(selectedQuiz) : null;
  const selectedQuizCompleted = selectedQuiz ? completedQuizIds.includes(selectedQuiz.id) : false;
  const totalQuizCount = quizzes.length;

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
            Choose your unit, topic, and test. Completed tests are marked, but you can still retake them.
          </p>

          {msg ? (
            <div className="mt-4 bg-red-100 border border-black rounded-xl p-4">
              <p className="font-bold">Notice</p>
              <p className="text-sm break-words">{msg}</p>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-4 items-start">
            <div>
              <label className="block text-sm font-bold mb-3">Available tests</label>

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
                  {Object.entries(groupedQuizzes).map(([unitKey, topics]) => {
                    const isUnitOpen = !!openUnits[unitKey];
                    const unitTestCount = Object.values(topics).reduce(
                      (sum, arr) => sum + arr.length,
                      0
                    );

                    return (
                      <div
                        key={unitKey}
                        className="border border-black rounded-xl overflow-hidden"
                        style={{ backgroundColor: "var(--bg-soft)" }}
                      >
                        <button
                          onClick={() => toggleUnit(unitKey)}
                          className="w-full flex items-center justify-between px-4 py-4 text-left font-extrabold border-b border-black"
                          style={{ backgroundColor: "var(--bg-card)" }}
                        >
                          <span>
                            {unitKey}{" "}
                            <span className="text-xs opacity-70">
                              ({unitTestCount} test{unitTestCount > 1 ? "s" : ""})
                            </span>
                          </span>
                          <span>{isUnitOpen ? "−" : "+"}</span>
                        </button>

                        {isUnitOpen ? (
                          <div className="p-4 space-y-3">
                            {Object.entries(topics).map(([topicKeyRaw, tests]) => {
                              const topicKey = `${unitKey}__${topicKeyRaw}`;
                              const isTopicOpen = !!openTopics[topicKey];

                              return (
                                <div
                                  key={topicKey}
                                  className="border border-black rounded-lg overflow-hidden"
                                  style={{ backgroundColor: "var(--bg-card)" }}
                                >
                                  <button
                                    onClick={() => toggleTopic(topicKey)}
                                    className="w-full flex items-center justify-between px-4 py-3 text-left font-bold border-b border-black"
                                    style={{ backgroundColor: "var(--bg-soft)" }}
                                  >
                                    <span>
                                      {topicKeyRaw}{" "}
                                      <span className="text-xs opacity-70">
                                        ({tests.length} test{tests.length > 1 ? "s" : ""})
                                      </span>
                                    </span>
                                    <span>{isTopicOpen ? "−" : "+"}</span>
                                  </button>

                                  {isTopicOpen ? (
                                    <div className="p-3 space-y-2">
                                      {tests.map((q) => {
                                        const { testName } = getTopicAndTest(q);
                                        const isSelected = quizId === q.id;
                                        const isCompleted = completedQuizIds.includes(q.id);

                                        return (
                                          <button
                                            key={q.id}
                                            onClick={() => setQuizId(q.id)}
                                            disabled={submitting}
                                            className="block w-full text-left px-4 py-3 rounded-lg border border-black transition"
                                            style={{
                                              backgroundColor: isSelected
                                                ? "var(--bg-button)"
                                                : "var(--bg-card)",
                                              color: "var(--text-main)",
                                            }}
                                          >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <span className="font-semibold">{testName}</span>

                                              {isCompleted ? (
                                                <span
                                                  className="text-xs px-2 py-1 rounded-md border border-black"
                                                  style={{ backgroundColor: "var(--bg-soft)" }}
                                                >
                                                  Completed
                                                </span>
                                              ) : null}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div
                className="border border-black rounded-xl p-4"
                style={{ backgroundColor: "var(--bg-soft)" }}
              >
                <div className="text-xs opacity-80">Quiz browser</div>
                <div className="font-bold mt-1">{totalQuizCount} tests available</div>
                <div className="text-xs opacity-80 mt-2">
                  Completed tests are locked on the leaderboard, but you can still practice them again.
                </div>
              </div>

              <div
                className="border border-black rounded-xl p-4"
                style={{ backgroundColor: "var(--bg-soft)" }}
              >
                <div className="text-xs opacity-80">Selected test</div>

                {selectedQuiz ? (
                  <>
                    <div className="font-bold mt-1">{selectedQuiz.unit || "No Unit"}</div>
                    <div className="text-sm mt-2">
                      Topic: <b>{selectedQuizDetails?.topic || "-"}</b>
                    </div>
                    <div className="text-sm mt-1">
                      Test: <b>{selectedQuizDetails?.testName || "-"}</b>
                    </div>
                    <div className="text-sm mt-1">
                      Status:{" "}
                      <b>{selectedQuizCompleted ? "Completed before" : "New test"}</b>
                    </div>
                    <div className="text-sm mt-1">
                      Questions: <b>{questions.length}</b>
                    </div>
                  </>
                ) : (
                  <div className="text-sm mt-2 opacity-80">No test selected yet.</div>
                )}
              </div>

              <div
                className="border border-black rounded-xl p-4"
                style={{ backgroundColor: "var(--bg-soft)" }}
              >
                <div className="text-xs opacity-80">Progress</div>
                <div className="font-bold mt-1">
                  {answeredCount}/{questions.length} answered
                </div>
                <div className="text-xs opacity-80 mt-2">Total points: {totalPoints}</div>
              </div>
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

            <div className="mt-6 border border-black rounded-2xl p-5" style={{ backgroundColor: "var(--bg-soft)" }}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-xl font-bold">This Quiz Ranking</h4>
                  <p className="text-sm opacity-80">
                    See how students ranked in this test.
                  </p>
                </div>

                {userRank ? (
                  <div className="px-3 py-2 rounded-lg border border-black font-bold" style={{ backgroundColor: "var(--bg-card)" }}>
                    Your Rank: #{userRank}
                  </div>
                ) : null}
              </div>

              {loadingRanking ? (
                <div className="border border-dashed border-black rounded-lg p-6 text-center">
                  Loading ranking...
                </div>
              ) : quizRanking.length === 0 ? (
                <div className="border border-dashed border-black rounded-lg p-6 text-center">
                  No ranking found for this quiz yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {quizRanking.map((row, index) => {
                    const isCurrentUser = row.student_id === studentId;

                    return (
                      <div
                        key={`${row.student_id}-${index}`}
                        className="border border-black rounded-xl p-4"
                        style={{
                          backgroundColor: isCurrentUser ? "var(--bg-button)" : "var(--bg-card)",
                          color: "var(--text-main)",
                        }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-lg break-words">
                              #{index + 1} • {row.username}
                              {isCurrentUser ? " (You)" : ""}
                            </div>
                          </div>

                          <div className="px-3 py-2 rounded-lg border border-black font-bold">
                            {row.score} pts
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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