"use client";

import { useEffect, useMemo, useState } from "react";

type Quiz = {
    id: number;
    title: string;
    unit: string | null;
    time_limit_minutes: number | null;
};

type Question = {
    id: number;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: "A" | "B" | "C" | "D";
    points: number;
};

type AnswerKey = "A" | "B" | "C" | "D";

type AnswerRecord = {
    questionId: number;
    picked: AnswerKey;
    correct: AnswerKey;
};

const ui = {
    page: { padding: 24, maxWidth: 900, margin: "0 auto", color: "#fff" as const },
    card: { border: "1px solid #2b2b2b", borderRadius: 14, padding: 16, background: "#0f0f0f", marginTop: 14 },
    title: { fontSize: 26, margin: 0 },
    h2: { fontSize: 18, margin: "0 0 10px 0" },
    small: { opacity: 0.8, fontSize: 13 },
    input: { padding: 10, borderRadius: 10, border: "1px solid #3a3a3a", background: "#121212", color: "#fff", width: "100%" },
    btn: { padding: "10px 14px", borderRadius: 10, border: "1px solid #4a4a4a", background: "#1f1f1f", color: "#fff", cursor: "pointer" as const },
    btnGhost: { padding: "10px 14px", borderRadius: 10, border: "1px solid #3a3a3a", background: "transparent", color: "#fff", cursor: "pointer" as const },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 },
    option: { width: "100%", textAlign: "left" as const, padding: 12, borderRadius: 12, border: "1px solid #3a3a3a", background: "#121212", color: "#fff", cursor: "pointer" as const },
    barWrap: { height: 10, background: "#1a1a1a", borderRadius: 999, overflow: "hidden", border: "1px solid #2b2b2b" },
    bar: (pct: number) => ({ height: "100%", width: `${pct}%`, background: "#3b82f6" }),
    row: { display: "flex", gap: 10, flexWrap: "wrap" as const, alignItems: "center" as const, justifyContent: "space-between" as const },
};

export default function StudentPage() {
    const [studentId, setStudentId] = useState("");
    const [loggedIn, setLoggedIn] = useState(false);

    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [index, setIndex] = useState(0);

    const [score, setScore] = useState(0);
    const [maxScore, setMaxScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);

    const [picked, setPicked] = useState<AnswerKey | null>(null);
    const [answers, setAnswers] = useState<AnswerRecord[]>([]);
    const [showResult, setShowResult] = useState(false);
    const [showReview, setShowReview] = useState(false);

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string>("");

    // 결과 저장 상태
    const [saving, setSaving] = useState(false);
    const [savedOnce, setSavedOnce] = useState(false);
    const [saveError, setSaveError] = useState<string>("");

    const pct = useMemo(() => {
        if (!questions.length) return 0;
        return Math.round((index / questions.length) * 100);
    }, [index, questions.length]);

    const loadQuizzes = async () => {
        setMsg("");
        const res = await fetch("/api/student/quiz-list");
        const text = await res.text();
        let json: any = {};
        try { json = JSON.parse(text); } catch { }
        if (!res.ok) {
            setMsg(json.error || text || "Could not load quizzes");
            return;
        }
        setQuizzes(json.quizzes || []);
    };

    useEffect(() => {
        if (loggedIn) loadQuizzes();
    }, [loggedIn]);

    const startQuiz = async (quiz: Quiz) => {
        setMsg("");
        setLoading(true);

        setActiveQuiz(quiz);
        setQuestions([]);
        setIndex(0);

        setScore(0);
        setMaxScore(0);
        setCorrectCount(0);

        setPicked(null);
        setAnswers([]);
        setShowResult(false);
        setShowReview(false);

        // 결과 저장 reset
        setSaving(false);
        setSavedOnce(false);
        setSaveError("");

        const res = await fetch(`/api/student/questions?quiz_id=${quiz.id}`);
        const text = await res.text();
        let json: any = {};
        try { json = JSON.parse(text); } catch { }
        if (!res.ok) {
            setMsg(json.error || text || "Could not load questions");
            setLoading(false);
            return;
        }

        const qs: Question[] = json.questions || [];
        setQuestions(qs);

        const max = qs.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
        setMaxScore(max);

        setLoading(false);
    };

    const finishToDashboard = async () => {
        setActiveQuiz(null);
        setQuestions([]);
        setIndex(0);

        setPicked(null);
        setAnswers([]);
        setShowResult(false);
        setShowReview(false);

        setSaving(false);
        setSavedOnce(false);
        setSaveError("");

        await loadQuizzes();
    };

    const answer = (choice: AnswerKey) => {
        if (!questions.length) return;
        if (picked) return;

        const q = questions[index];
        setPicked(choice);

        setAnswers((prev) => [...prev, { questionId: q.id, picked: choice, correct: q.correct_option }]);

        const isCorrect = choice === q.correct_option;
        if (isCorrect) {
            setScore((s) => s + q.points);
            setCorrectCount((c) => c + 1);
        } else {
            setScore((s) => s - q.points * 0.25);
        }

        setTimeout(() => {
            const next = index + 1;
            if (next < questions.length) {
                setIndex(next);
                setPicked(null);
            } else {
                setShowResult(true);
            }
        }, 250);
    };

    // ---------------- LOGIN SCREEN ----------------
    if (!loggedIn) {
        return (
            <div style={ui.page}>
                <h1 style={ui.title}>EnglishTime</h1>

                <div style={ui.card}>
                    <h2 style={ui.h2}>Student Login</h2>
                    <div style={ui.small}>Enter your class ID. (No email needed)</div>

                    <div style={{ marginTop: 12 }}>
                        <input
                            style={ui.input}
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            placeholder="e.g. lutfiye"
                        />
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <button
                            style={ui.btn}
                            onClick={() => {
                                if (!studentId.trim()) return setMsg("Student ID is required.");
                                setMsg("");
                                setLoggedIn(true);
                            }}
                        >
                            Continue
                        </button>
                    </div>

                    {msg && <div style={{ marginTop: 12 }}>{msg}</div>}
                </div>
            </div>
        );
    }

    // ---------------- QUIZ / RESULTS SCREEN ----------------
    if (activeQuiz) {
        // RESULTS VIEW
        if (showResult) {
            const finalScore = Math.round(score);
            const wrongAnswers = answers.filter((a) => a.picked !== a.correct);

            // ✅ Otomatik 1 kere kaydet
            if (!savedOnce && !saving && !saveError) {
                setSaving(true);

                fetch("/api/student/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        student_id: studentId,
                        quiz_id: activeQuiz.id,
                        score: finalScore,
                        max_score: maxScore,
                        correct_count: correctCount,
                        total_questions: questions.length,
                    }),
                })
                    .then(async (r) => {
                        const t = await r.text();
                        if (!r.ok) throw new Error(t);
                        setSavedOnce(true);
                    })
                    .catch(() => {
                        setSaveError("Could not save result (still ok for testing).");
                    })
                    .finally(() => setSaving(false));
            }

            return (
                <div style={ui.page}>
                    <div style={ui.row}>
                        <div>
                            <h1 style={ui.title}>Results</h1>
                            <div style={ui.small}>
                                Student: <b>{studentId}</b> • Quiz: <b>{activeQuiz.title}</b>
                            </div>
                        </div>

                        <button style={ui.btnGhost} onClick={finishToDashboard}>
                            Back to Dashboard
                        </button>
                    </div>

                    <div style={ui.card}>
                        <div style={ui.row}>
                            <div>
                                <div>
                                    Correct: <b>{correctCount}</b> / {questions.length}
                                </div>
                                <div>
                                    Wrong: <b>{questions.length - correctCount}</b>
                                </div>
                                <div style={{ marginTop: 6 }}>
                                    Score: <b>{finalScore}</b> / {maxScore}
                                </div>

                                <div style={{ marginTop: 8, ...ui.small }}>
                                    {saving && "Saving result..."}
                                    {!saving && savedOnce && "Result saved ✅"}
                                    {!saving && !savedOnce && saveError && saveError}
                                </div>
                            </div>

                            <div style={ui.row}>
                                <button style={ui.btn} onClick={() => setShowReview((v) => !v)}>
                                    {showReview ? "Hide review" : "Review wrong answers"}
                                </button>

                                <button
                                    style={ui.btnGhost}
                                    onClick={() => {
                                        // retry same quiz
                                        setIndex(0);
                                        setScore(0);
                                        setCorrectCount(0);
                                        setPicked(null);
                                        setAnswers([]);
                                        setShowReview(false);
                                        setShowResult(false);

                                        setSaving(false);
                                        setSavedOnce(false);
                                        setSaveError("");
                                    }}
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    </div>

                    {showReview && (
                        <div style={ui.card}>
                            <h2 style={ui.h2}>Wrong answers</h2>

                            {wrongAnswers.length === 0 ? (
                                <div style={ui.small}>Perfect! No wrong answers 🎉</div>
                            ) : (
                                <div style={{ display: "grid", gap: 12 }}>
                                    {wrongAnswers.map((a, idx) => {
                                        const q = questions.find((x) => x.id === a.questionId);
                                        if (!q) return null;

                                        const pickedText =
                                            a.picked === "A" ? q.option_a :
                                                a.picked === "B" ? q.option_b :
                                                    a.picked === "C" ? q.option_c : q.option_d;

                                        const correctText =
                                            a.correct === "A" ? q.option_a :
                                                a.correct === "B" ? q.option_b :
                                                    a.correct === "C" ? q.option_c : q.option_d;

                                        return (
                                            <div key={idx} style={{ ...ui.card, marginTop: 0 }}>
                                                <div style={{ fontWeight: 700 }}>{q.question_text}</div>
                                                <div style={{ marginTop: 8 }}>
                                                    Your answer: <b>{a.picked}</b> — {pickedText}
                                                </div>
                                                <div>
                                                    Correct answer: <b>{a.correct}</b> — {correctText}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        // QUIZ VIEW
        const q = questions[index];

        return (
            <div style={ui.page}>
                <div style={ui.row}>
                    <div>
                        <h1 style={ui.title}>{activeQuiz.title}</h1>
                        <div style={ui.small}>
                            Student: <b>{studentId}</b> • Unit: {activeQuiz.unit || "-"}
                        </div>
                    </div>
                    <button style={ui.btnGhost} onClick={finishToDashboard}>Exit</button>
                </div>

                <div style={{ marginTop: 12, ...ui.barWrap }}>
                    <div style={ui.bar(pct)} />
                </div>

                <div style={ui.card}>
                    {loading && <div>Loading questions...</div>}

                    {!loading && questions.length === 0 && (
                        <div>
                            <div>No questions found for this quiz.</div>
                            <div style={{ marginTop: 10 }}>
                                <button style={ui.btnGhost} onClick={finishToDashboard}>Back</button>
                            </div>
                        </div>
                    )}

                    {!loading && questions.length > 0 && q && (
                        <>
                            <div style={ui.row}>
                                <div>
                                    <div style={ui.small}>
                                        Question {index + 1} / {questions.length}
                                    </div>
                                    <div style={{ fontSize: 18, marginTop: 8 }}>{q.question_text}</div>
                                </div>
                                <div style={ui.small}>
                                    Score: <b>{Math.round(score)}</b> / {maxScore}
                                </div>
                            </div>

                            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                                {(["A", "B", "C", "D"] as const).map((k) => {
                                    const text =
                                        k === "A" ? q.option_a :
                                            k === "B" ? q.option_b :
                                                k === "C" ? q.option_c : q.option_d;

                                    const isPicked = picked === k;

                                    // IMPORTANT: No correct/wrong indicator while solving.
                                    const border = isPicked ? "1px solid #3b82f6" : "1px solid #3a3a3a";
                                    const bg = isPicked ? "#0b1b33" : "#121212";

                                    return (
                                        <button
                                            key={k}
                                            onClick={() => answer(k)}
                                            style={{ ...ui.option, border, background: bg }}
                                        >
                                            <b>{k})</b> {text}
                                        </button>
                                    );
                                })}
                            </div>

                            <div style={{ marginTop: 12, ...ui.small }}>
                                Tip: You won’t see the correct answer until the quiz ends.
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // ---------------- DASHBOARD ----------------
    return (
        <div style={ui.page}>
            <div style={ui.row}>
                <div>
                    <h1 style={ui.title}>Dashboard</h1>
                    <div style={ui.small}>Student: <b>{studentId}</b></div>
                </div>
                <button style={ui.btnGhost} onClick={() => setLoggedIn(false)}>Logout</button>
            </div>

            {msg && <div style={{ marginTop: 12 }}>{msg}</div>}

            <div style={ui.card}>
                <div style={ui.row}>
                    <h2 style={{ ...ui.h2, margin: 0 }}>Available Quizzes</h2>
                    <button style={ui.btnGhost} onClick={loadQuizzes}>Refresh</button>
                </div>

                {quizzes.length === 0 ? (
                    <div style={{ marginTop: 10, ...ui.small }}>
                        No published quizzes yet.
                    </div>
                ) : (
                    <div style={{ marginTop: 12, ...ui.grid }}>
                        {quizzes.map((q) => (
                            <div key={q.id} style={ui.card}>
                                <div style={{ fontSize: 16, fontWeight: 700 }}>{q.title}</div>
                                <div style={ui.small}>Unit: {q.unit || "-"}</div>
                                <div style={ui.small}>
                                    Time limit: {q.time_limit_minutes ? `${q.time_limit_minutes} min` : "—"}
                                </div>

                                <div style={{ marginTop: 12 }}>
                                    <button style={ui.btn} onClick={() => startQuiz(q)}>
                                        Start
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
