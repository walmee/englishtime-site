"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Quiz = {
  id: number;
  title: string;
};

export default function BulkQuestionsPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizId, setQuizId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("id, title")
        .order("id", { ascending: false });

      if (data) {
        setQuizzes(data);
        if (data.length) setQuizId(data[0].id);
      }
    };

    load();
  }, []);

  const parseQuestions = () => {
    const blocks = text.split("\n\n");

    return blocks.map((block) => {
      const lines = block.split("\n");

      const question = lines[0]?.replace(/^\d+\)\s*/, "");

      const options = {
        A: lines.find((l) => l.startsWith("A)"))?.replace("A)", "").trim(),
        B: lines.find((l) => l.startsWith("B)"))?.replace("B)", "").trim(),
        C: lines.find((l) => l.startsWith("C)"))?.replace("C)", "").trim(),
        D: lines.find((l) => l.startsWith("D)"))?.replace("D)", "").trim(),
      };

      const answerLine = lines.find((l) =>
        l.toLowerCase().includes("answer")
      );

      const correct = answerLine?.split(":")[1]?.trim().toUpperCase();

      return {
        question_text: question,
        option_a: options.A,
        option_b: options.B,
        option_c: options.C,
        option_d: options.D,
        correct_option: correct,
        points: 10,
      };
    });
  };

  const handleSubmit = async () => {
    setMsg("");

    if (!quizId) {
      setMsg("Quiz seç");
      return;
    }

    setLoading(true);

    try {
      const parsed = parseQuestions();

      const valid = parsed.filter(
        (q) =>
          q.question_text &&
          q.option_a &&
          q.option_b &&
          q.option_c &&
          q.option_d &&
          q.correct_option
      );

      const payload = valid.map((q) => ({
        ...q,
        quiz_id: quizId,
      }));

      const { error } = await supabase.from("questions").insert(payload);

      if (error) {
        setMsg(error.message);
        return;
      }

      setMsg(`${payload.length} soru eklendi`);
      setText("");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-300 text-black p-6">
      <div className="max-w-3xl mx-auto bg-yellow-100 p-6 rounded-xl border border-black">
        <h1 className="text-2xl font-bold mb-4">Bulk Question Upload</h1>

        <select
          value={quizId ?? ""}
          onChange={(e) => setQuizId(Number(e.target.value))}
          className="w-full p-3 mb-4 border border-black rounded-lg"
        >
          {quizzes.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`1) I ___ to school yesterday.
A) go
B) went
C) gone
D) going
Answer: B`}
          className="w-full h-64 p-3 border border-black rounded-lg"
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 px-6 py-3 bg-black text-yellow-300 rounded-lg font-bold"
        >
          {loading ? "Uploading..." : "Parse & Add"}
        </button>

        {msg && <p className="mt-4">{msg}</p>}
      </div>
    </div>
  );
}