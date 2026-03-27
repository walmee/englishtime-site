"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type QuizRow = {
  id: number;
  title: string;
  unit: string | null;
  class_name?: string | null;
  level?: string | null;
};

type QuestionRow = {
  id: number;
  quiz_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  points: number;
  explanation: string | null;
};

type FormState = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  points: number;
  explanation: string;
};

type GroupedQuizMap = Record<string, Record<string, QuizRow[]>>;

const emptyForm = (): FormState => ({
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "A",
  points: 10,
  explanation: "",
});

export default function TeacherQuestionsPage() {
  const router = useRouter();

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [quizId, setQuizId] = useState<number | null>(null);

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);

  const [form, setForm] = useState<FormState>(emptyForm());

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());

  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({});
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({});

  const selectedQuiz = useMemo(() => {
    return quizzes.find((x) => x.id === quizId) || null;
  }, [quizzes, quizId]);

  const selectedQuizLabel = useMemo(() => {
    if (!selectedQuiz) return "";
    return `#${selectedQuiz.id} • ${selectedQuiz.unit ?? "-"} • ${selectedQuiz.title}`;
  }, [selectedQuiz]);

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

  const getAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || "";
  };

  const loadQuizzes = async () => {
    setMsg("");
    setLoadingPage(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;

    if (!userId) {
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      router.replace("/login");
      return;
    }

    const currentRole = String(profile.role || "").toLowerCase();

    if (currentRole !== "teacher" && currentRole !== "admin") {
      router.replace("/dashboard");
      return;
    }

    if (currentRole === "admin") {
      router.replace("/admin/questions");
      return;
    }

    const { data: teacherClasses, error: teacherClassError } = await supabase
      .from("teacher_classes")
      .select(
        `
        class_id,
        classes (
          class_name
        )
      `
      )
      .eq("teacher_id", userId);

    if (teacherClassError) {
      setMsg(teacherClassError.message);
      setQuizzes([]);
      setLoadingPage(false);
      return;
    }

    const classNames = (teacherClasses || [])
      .map((row: any) => row.classes?.class_name)
      .filter(Boolean);

    if (classNames.length === 0) {
      setQuizzes([]);
      setQuizId(null);
      setLoadingPage(false);
      return;
    }

    const { data, error } = await supabase
      .from("quizzes")
      .select("id, title, unit, class_name, level")
      .in("class_name", classNames)
      .order("id", { ascending: false });

    if (error) {
      setMsg(error.message);
      setQuizzes([]);
      setLoadingPage(false);
      return;
    }

    const rows = Array.isArray(data) ? (data as QuizRow[]) : [];
    setQuizzes(rows);

    if (!quizId && rows.length > 0) {
      setQuizId(rows[0].id);
    } else if (rows.length === 0) {
      setQuizId(null);
    }

    const initialOpenUnits: Record<string, boolean> = {};
    const initialOpenTopics: Record<string, boolean> = {};

    rows.forEach((q, index) => {
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
    setLoadingPage(false);
  };

  const loadQuestions = async (qid: number) => {
    setLoadingQuestions(true);
    setMsg("");

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setMsg("Session not found. Please login again.");
        setQuestions([]);
        setLoadingQuestions(false);
        return;
      }

      const res = await fetch(
        `/api/teacher/questions?quiz_id=${encodeURIComponent(String(qid))}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setMsg(json?.error || "Questions could not be loaded.");
        setQuestions([]);
        setLoadingQuestions(false);
        return;
      }

      setQuestions(Array.isArray(json?.questions) ? (json.questions as QuestionRow[]) : []);
      setLoadingQuestions(false);
    } catch (e: any) {
      setMsg(e?.message || "Questions could not be loaded.");
      setQuestions([]);
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  useEffect(() => {
    if (quizId) {
      loadQuestions(quizId);
      setEditingId(null);
      setForm(emptyForm());
      setEditForm(emptyForm());
    } else {
      setQuestions([]);
      setLoadingQuestions(false);
    }
  }, [quizId]);

  const validateForm = (f: FormState) => {
    if (!quizId) return "Select a quiz first.";
    if (!f.question_text.trim()) return "Question text is required.";
    if (!f.option_a.trim() || !f.option_b.trim() || !f.option_c.trim() || !f.option_d.trim()) {
      return "All options (A, B, C, D) are required.";
    }
    if (!["A", "B", "C", "D"].includes(f.correct_option)) return "Correct option must be A/B/C/D.";
    if (!Number.isFinite(f.points) || f.points <= 0) return "Points must be a positive number.";
    return "";
  };

  const onCreate = async () => {
    setMsg("");
    const err = validateForm(form);
    if (err) {
      setMsg(err);
      return;
    }

    setBusy(true);
    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setMsg("Session not found. Please login again.");
        return;
      }

      const res = await fetch("/api/teacher/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          quiz_id: quizId!,
          question_text: form.question_text.trim(),
          option_a: form.option_a.trim(),
          option_b: form.option_b.trim(),
          option_c: form.option_c.trim(),
          option_d: form.option_d.trim(),
          correct_option: form.correct_option,
          points: Number(form.points),
          explanation: form.explanation.trim() ? form.explanation.trim() : null,
        }),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setMsg(json?.error || "Create failed.");
        return;
      }

      setForm(emptyForm());
      await loadQuestions(quizId!);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (q: QuestionRow) => {
    setMsg("");
    setEditingId(q.id);
    setEditForm({
      question_text: q.question_text ?? "",
      option_a: q.option_a ?? "",
      option_b: q.option_b ?? "",
      option_c: q.option_c ?? "",
      option_d: q.option_d ?? "",
      correct_option: (q.correct_option as "A" | "B" | "C" | "D") || "A",
      points: Number(q.points ?? 10),
      explanation: q.explanation ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm());
  };

  const onUpdate = async () => {
    setMsg("");
    if (!editingId) return;

    const err = validateForm(editForm);
    if (err) {
      setMsg(err);
      return;
    }

    setBusy(true);
    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setMsg("Session not found. Please login again.");
        return;
      }

      const res = await fetch("/api/teacher/questions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: editingId,
          question_text: editForm.question_text.trim(),
          option_a: editForm.option_a.trim(),
          option_b: editForm.option_b.trim(),
          option_c: editForm.option_c.trim(),
          option_d: editForm.option_d.trim(),
          correct_option: editForm.correct_option,
          points: Number(editForm.points),
          explanation: editForm.explanation.trim() ? editForm.explanation.trim() : null,
        }),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setMsg(json?.error || "Update failed.");
        return;
      }

      setEditingId(null);
      setEditForm(emptyForm());
      await loadQuestions(quizId!);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: number) => {
    setMsg("");
    if (!confirm("Delete this question?")) return;

    setBusy(true);
    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setMsg("Session not found. Please login again.");
        return;
      }

      const res = await fetch(
        `/api/teacher/questions?id=${encodeURIComponent(String(id))}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setMsg(json?.error || "Delete failed.");
        return;
      }

      await loadQuestions(quizId!);
    } finally {
      setBusy(false);
    }
  };

  const toggleUnit = (unitKey: string) => {
    setOpenUnits((prev) => ({ ...prev, [unitKey]: !prev[unitKey] }));
  };

  const toggleTopic = (topicKey: string) => {
    setOpenTopics((prev) => ({ ...prev, [topicKey]: !prev[topicKey] }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-100 border border-black rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold mb-1">My Questions</h2>
            <p className="text-sm">
              Pick a quiz from your assigned classes, then add, edit, or delete questions.
            </p>
          </div>

          <button
            onClick={() => quizId && loadQuestions(quizId)}
            className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition disabled:opacity-60"
            disabled={!quizId || busy}
          >
            Refresh
          </button>
        </div>

        {msg ? (
          <div className="mt-4 bg-red-100 border border-black rounded-xl p-4">
            <p className="font-bold">Notice</p>
            <p className="text-sm">{msg}</p>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-4 items-start">
          <div>
            <label className="block text-sm font-bold mb-3">Select quiz</label>

            {loadingPage ? (
              <div className="border border-black rounded-xl p-4 bg-yellow-50">
                Loading quizzes...
              </div>
            ) : quizzes.length === 0 ? (
              <div className="border border-black rounded-xl p-4 bg-yellow-50">
                No quizzes found.
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
                      className="border border-black rounded-xl overflow-hidden bg-yellow-50"
                    >
                      <button
                        onClick={() => toggleUnit(unitKey)}
                        className="w-full flex items-center justify-between px-4 py-4 text-left font-extrabold border-b border-black bg-white"
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
                                className="border border-black rounded-lg overflow-hidden bg-white"
                              >
                                <button
                                  onClick={() => toggleTopic(topicKey)}
                                  className="w-full flex items-center justify-between px-4 py-3 text-left font-bold border-b border-black bg-yellow-50"
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

                                      return (
                                        <button
                                          key={q.id}
                                          onClick={() => setQuizId(q.id)}
                                          className="block w-full text-left px-4 py-3 rounded-lg border border-black transition"
                                          style={{
                                            backgroundColor: isSelected ? "#facc15" : "white",
                                          }}
                                        >
                                          <div className="font-semibold">{testName}</div>
                                          <div className="text-xs opacity-70 mt-1">
                                            Class: <b>{q.class_name ?? "-"}</b> • Level:{" "}
                                            <b>{q.level ?? "-"}</b> • ID #{q.id}
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
            <div className="border border-dashed border-black rounded-xl p-4 bg-yellow-50">
              <div className="text-xs opacity-80">Selected</div>
              <div className="font-bold">{selectedQuizLabel || "—"}</div>
              <div className="text-xs opacity-80 mt-1">
                You only see quizzes from your assigned classes.
              </div>
            </div>

            {selectedQuiz ? (
              <div className="border border-dashed border-black rounded-xl p-4 bg-yellow-50">
                <div className="text-xs opacity-80">Quiz Details</div>
                <div className="text-sm mt-2">
                  Class: <b>{selectedQuiz.class_name ?? "-"}</b>
                </div>
                <div className="text-sm mt-1">
                  Level: <b>{selectedQuiz.level ?? "-"}</b>
                </div>
                <div className="text-sm mt-1">
                  Questions: <b>{questions.length}</b>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bg-yellow-100 border border-black rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-4">
          {editingId ? `Edit Question #${editingId}` : "Add New Question"}
        </h3>

        <div className="grid grid-cols-1 gap-3">
          <label className="text-sm font-bold">Question text</label>
          <textarea
            value={editingId ? editForm.question_text : form.question_text}
            onChange={(e) =>
              editingId
                ? setEditForm((p) => ({ ...p, question_text: e.target.value }))
                : setForm((p) => ({ ...p, question_text: e.target.value }))
            }
            className="w-full p-3 rounded-lg border border-black bg-yellow-50 min-h-[90px]"
            placeholder="Type the question..."
            disabled={busy}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(["a", "b", "c", "d"] as const).map((k) => {
              const key = `option_${k}` as const;
              const label = `Option ${k.toUpperCase()}`;
              const value = editingId ? (editForm as any)[key] : (form as any)[key];

              return (
                <div key={key}>
                  <label className="text-sm font-bold">{label}</label>
                  <input
                    value={value}
                    onChange={(e) =>
                      editingId
                        ? setEditForm((p) => ({ ...(p as any), [key]: e.target.value }))
                        : setForm((p) => ({ ...(p as any), [key]: e.target.value }))
                    }
                    className="w-full p-3 rounded-lg border border-black bg-yellow-50"
                    placeholder={`${label}...`}
                    disabled={busy}
                  />
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-bold">Correct option</label>
              <select
                value={editingId ? editForm.correct_option : form.correct_option}
                onChange={(e) => {
                  const v = e.target.value as "A" | "B" | "C" | "D";
                  editingId
                    ? setEditForm((p) => ({ ...p, correct_option: v }))
                    : setForm((p) => ({ ...p, correct_option: v }));
                }}
                className="w-full p-3 rounded-lg border border-black bg-yellow-50"
                disabled={busy}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold">Points</label>
              <input
                type="number"
                value={editingId ? editForm.points : form.points}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  editingId
                    ? setEditForm((p) => ({ ...p, points: v }))
                    : setForm((p) => ({ ...p, points: v }));
                }}
                className="w-full p-3 rounded-lg border border-black bg-yellow-50"
                disabled={busy}
                min={1}
              />
            </div>

            <div className="flex items-end gap-2">
              {!editingId ? (
                <button
                  onClick={onCreate}
                  className="w-full px-4 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 disabled:opacity-60"
                  disabled={!quizId || busy}
                >
                  {busy ? "Saving..." : "Add Question"}
                </button>
              ) : (
                <>
                  <button
                    onClick={onUpdate}
                    className="w-full px-4 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 disabled:opacity-60"
                    disabled={!quizId || busy}
                  >
                    {busy ? "Updating..." : "Save Changes"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-3 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition disabled:opacity-60"
                    disabled={busy}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold">Explanation (optional)</label>
            <input
              value={editingId ? editForm.explanation : form.explanation}
              onChange={(e) =>
                editingId
                  ? setEditForm((p) => ({ ...p, explanation: e.target.value }))
                  : setForm((p) => ({ ...p, explanation: e.target.value }))
              }
              className="w-full p-3 rounded-lg border border-black bg-yellow-50"
              placeholder="Short explanation (optional)"
              disabled={busy}
            />
          </div>
        </div>
      </div>

      <div className="bg-yellow-100 border border-black rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-xl font-bold">Question List</h3>
          <div className="text-sm opacity-80">
            {quizId ? `Quiz #${quizId} • ${questions.length} question(s)` : "Select a quiz"}
          </div>
        </div>

        {loadingQuestions ? (
          <div className="border border-dashed border-black rounded-lg p-8 text-center">
            Loading...
          </div>
        ) : questions.length === 0 ? (
          <div className="border border-dashed border-black rounded-lg p-8 text-center">
            No questions found for this quiz.
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, index) => (
              <div key={q.id} className="bg-yellow-50 border border-black rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-bold">
                      Q{index + 1} • #{q.id} • {q.points} pts • Correct: {q.correct_option}
                    </div>
                    <div className="text-sm mt-2 break-words">{q.question_text}</div>
                    <div className="text-xs mt-3 space-y-1">
                      <div>
                        <b>A)</b> {q.option_a}
                      </div>
                      <div>
                        <b>B)</b> {q.option_b}
                      </div>
                      <div>
                        <b>C)</b> {q.option_c}
                      </div>
                      <div>
                        <b>D)</b> {q.option_d}
                      </div>
                      {q.explanation ? (
                        <div className="mt-2">
                          <b>Explanation:</b> {q.explanation}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(q)}
                      className="px-3 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition disabled:opacity-60"
                      disabled={busy}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(q.id)}
                      className="px-3 py-2 rounded-lg border border-black bg-red-200 hover:bg-red-300 transition disabled:opacity-60"
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs opacity-80 mt-4">
          Teacher question actions use dedicated secure teacher API routes.
        </div>
      </div>
    </div>
  );
}