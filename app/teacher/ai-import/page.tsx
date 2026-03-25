"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type QuizRow = {
  id: number;
  title: string;
  unit: string | null;
};

type ParsedQuestion = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  points: number;
  explanation?: string | null;
};

type AnalyzeResponse = {
  ok: boolean;
  questions: ParsedQuestion[];
  note?: string;
};

function emptyQuestion(): ParsedQuestion {
  return {
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "A",
    points: 10,
    explanation: "",
  };
}

export default function TeacherAiImportPage() {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [quizId, setQuizId] = useState<number | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  useEffect(() => {
    const loadQuizzes = async () => {
      setLoadingQuizzes(true);
      setMessage("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;
      if (!userId) {
        setLoadingQuizzes(false);
        setMessage("Please login first.");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      const role = String(profile?.role || "").toLowerCase();

      if (role === "teacher") {
        const { data: teacherClasses, error: teacherClassesError } = await supabase
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

        if (teacherClassesError) {
          setMessage(teacherClassesError.message);
          setLoadingQuizzes(false);
          return;
        }

        const classNames = (teacherClasses || [])
          .map((row: any) => row.classes?.class_name)
          .filter(Boolean);

        if (classNames.length === 0) {
          setQuizzes([]);
          setQuizId(null);
          setLoadingQuizzes(false);
          return;
        }

        const { data, error } = await supabase
          .from("quizzes")
          .select("id, title, unit")
          .in("class_name", classNames)
          .order("id", { ascending: false });

        if (error) {
          setMessage(error.message);
          setQuizzes([]);
          setLoadingQuizzes(false);
          return;
        }

        const rows = Array.isArray(data) ? (data as QuizRow[]) : [];
        setQuizzes(rows);
        if (rows.length > 0) setQuizId(rows[0].id);
        setLoadingQuizzes(false);
        return;
      }

      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, unit")
        .order("id", { ascending: false });

      if (error) {
        setMessage(error.message);
        setQuizzes([]);
        setLoadingQuizzes(false);
        return;
      }

      const rows = Array.isArray(data) ? (data as QuizRow[]) : [];
      setQuizzes(rows);
      if (rows.length > 0) setQuizId(rows[0].id);
      setLoadingQuizzes(false);
    };

    loadQuizzes();
  }, []);

  const selectedQuizLabel = useMemo(() => {
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) return "";
    return quiz.unit ? `${quiz.unit} • ${quiz.title}` : quiz.title;
  }, [quizzes, quizId]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    setQuestions([]);
    setHasAnalyzed(false);
    setMessage("");
  };

  const analyzeImages = async () => {
    setMessage("");

    if (!quizId) {
      setMessage("Please select a quiz.");
      return;
    }

    if (files.length === 0) {
      setMessage("Please upload at least one image.");
      return;
    }

    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("quiz_id", String(quizId));

      files.forEach((file) => {
        formData.append("images", file);
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      const res = await fetch("/api/teacher/ai-import", {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
        body: formData,
      });

      const json = (await res.json()) as AnalyzeResponse | { error?: string };

      if (!res.ok) {
        setMessage((json as any)?.error || "Failed to analyze images.");
        setAnalyzing(false);
        return;
      }

      const parsed = Array.isArray((json as AnalyzeResponse).questions)
        ? (json as AnalyzeResponse).questions
        : [];

      if (parsed.length === 0) {
        setMessage("No valid questions were extracted from the uploaded images.");
        setQuestions([]);
        setHasAnalyzed(true);
        setAnalyzing(false);
        return;
      }

      setQuestions(
        parsed.map((q) => ({
          ...emptyQuestion(),
          ...q,
          points: Number(q.points) > 0 ? Number(q.points) : 10,
          explanation: q.explanation || "",
        }))
      );
      setHasAnalyzed(true);
      setMessage((json as AnalyzeResponse).note || "Questions extracted successfully.");
    } catch (e: any) {
      setMessage(e?.message || "Unexpected error.");
    } finally {
      setAnalyzing(false);
    }
  };

  const updateQuestion = (
    index: number,
    field: keyof ParsedQuestion,
    value: string | number
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index
          ? {
              ...q,
              [field]: value,
            }
          : q
      )
    );
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const addEmptyQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  };

  const saveQuestions = async () => {
    setMessage("");

    if (!quizId) {
      setMessage("Please select a quiz.");
      return;
    }

    if (questions.length === 0) {
      setMessage("There are no questions to save.");
      return;
    }

    const invalid = questions.find(
      (q) =>
        !q.question_text.trim() ||
        !q.option_a.trim() ||
        !q.option_b.trim() ||
        !q.option_c.trim() ||
        !q.option_d.trim() ||
        !["A", "B", "C", "D"].includes(q.correct_option)
    );

    if (invalid) {
      setMessage("Please complete all question fields before saving.");
      return;
    }

    setSaving(true);

    try {
      const payload = questions.map((q) => ({
        quiz_id: quizId,
        question_text: q.question_text.trim(),
        option_a: q.option_a.trim(),
        option_b: q.option_b.trim(),
        option_c: q.option_c.trim(),
        option_d: q.option_d.trim(),
        correct_option: q.correct_option,
        points: Number(q.points) || 10,
        explanation: q.explanation?.trim() ? q.explanation.trim() : null,
      }));

      const { error } = await supabase.from("questions").insert(payload);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      setMessage(`${payload.length} questions added to the selected quiz.`);
      setQuestions([]);
      setFiles([]);
      setHasAnalyzed(false);
    } catch (e: any) {
      setMessage(e?.message || "Unexpected error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <section className="bg-yellow-100 border border-black rounded-2xl p-6">
          <h1 className="text-3xl font-bold mb-2">AI Question Import</h1>
          <p className="text-sm opacity-80">
            Upload one or more images, let AI extract the questions, review them,
            then add them to the selected quiz.
          </p>

          {message ? (
            <div className="mt-4 bg-yellow-50 border border-black rounded-xl p-4">
              {message}
            </div>
          ) : null}
        </section>

        <section className="bg-yellow-100 border border-black rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Step 1 — Select quiz and upload images</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Quiz</label>
              <select
                value={quizId ?? ""}
                onChange={(e) => setQuizId(Number(e.target.value))}
                disabled={loadingQuizzes}
                className="w-full p-3 rounded-lg border border-black bg-white"
              >
                {loadingQuizzes ? (
                  <option>Loading quizzes...</option>
                ) : quizzes.length === 0 ? (
                  <option>No quizzes found</option>
                ) : (
                  quizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.unit ? `${quiz.unit} • ${quiz.title}` : quiz.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Selected Quiz</label>
              <div className="w-full p-3 rounded-lg border border-black bg-white min-h-[50px]">
                {selectedQuizLabel || "-"}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">Upload Images</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
                className="w-full p-3 rounded-lg border border-black bg-white"
              />
              <p className="text-xs opacity-70 mt-2">
                You can upload multiple images. If all questions do not fit in one image,
                upload several pages/screenshots together.
              </p>
            </div>
          </div>

          {files.length > 0 ? (
            <div className="mt-4 bg-yellow-50 border border-black rounded-xl p-4">
              <div className="font-bold mb-2">Uploaded Files</div>
              <div className="space-y-1 text-sm">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`}>
                    {index + 1}. {file.name}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={analyzeImages}
              disabled={analyzing || files.length === 0 || !quizId}
              className="px-5 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 transition disabled:opacity-60"
            >
              {analyzing ? "Analyzing..." : "Analyze Images"}
            </button>
          </div>
        </section>

        <section className="bg-yellow-100 border border-black rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold">Step 2 — Review Extracted Questions</h2>
              <p className="text-sm opacity-80">
                Check the text before saving. You can edit anything here.
              </p>
            </div>

            <button
              onClick={addEmptyQuestion}
              className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition font-bold"
            >
              + Add Empty Question
            </button>
          </div>

          {!hasAnalyzed && questions.length === 0 ? (
            <div className="border border-dashed border-black rounded-lg p-8 text-center bg-yellow-50">
              Analyze images first to preview extracted questions.
            </div>
          ) : questions.length === 0 ? (
            <div className="border border-dashed border-black rounded-lg p-8 text-center bg-yellow-50">
              No questions available to review.
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div
                  key={index}
                  className="bg-yellow-50 border border-black rounded-xl p-4"
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-lg font-bold">Question {index + 1}</h3>
                    <button
                      onClick={() => removeQuestion(index)}
                      className="px-3 py-2 rounded-lg border border-black bg-red-500 text-white hover:bg-red-600 transition font-bold"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-sm font-bold mb-1">Question Text</label>
                      <textarea
                        value={q.question_text}
                        onChange={(e) =>
                          updateQuestion(index, "question_text", e.target.value)
                        }
                        className="w-full p-3 rounded-lg border border-black bg-white min-h-[100px]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold mb-1">Option A</label>
                        <input
                          value={q.option_a}
                          onChange={(e) => updateQuestion(index, "option_a", e.target.value)}
                          className="w-full p-3 rounded-lg border border-black bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-1">Option B</label>
                        <input
                          value={q.option_b}
                          onChange={(e) => updateQuestion(index, "option_b", e.target.value)}
                          className="w-full p-3 rounded-lg border border-black bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-1">Option C</label>
                        <input
                          value={q.option_c}
                          onChange={(e) => updateQuestion(index, "option_c", e.target.value)}
                          className="w-full p-3 rounded-lg border border-black bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-1">Option D</label>
                        <input
                          value={q.option_d}
                          onChange={(e) => updateQuestion(index, "option_d", e.target.value)}
                          className="w-full p-3 rounded-lg border border-black bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-bold mb-1">Correct Option</label>
                        <select
                          value={q.correct_option}
                          onChange={(e) =>
                            updateQuestion(
                              index,
                              "correct_option",
                              e.target.value as "A" | "B" | "C" | "D"
                            )
                          }
                          className="w-full p-3 rounded-lg border border-black bg-white"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-1">Points</label>
                        <input
                          type="number"
                          min={1}
                          value={q.points}
                          onChange={(e) =>
                            updateQuestion(index, "points", Number(e.target.value))
                          }
                          className="w-full p-3 rounded-lg border border-black bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-1">Explanation</label>
                        <input
                          value={q.explanation || ""}
                          onChange={(e) =>
                            updateQuestion(index, "explanation", e.target.value)
                          }
                          className="w-full p-3 rounded-lg border border-black bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <button
                  onClick={saveQuestions}
                  disabled={saving || questions.length === 0 || !quizId}
                  className="px-5 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-900 transition disabled:opacity-60"
                >
                  {saving ? "Saving..." : `Add ${questions.length} Question(s) to Quiz`}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}