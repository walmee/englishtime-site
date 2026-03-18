"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type ReadingTextRow = {
  id: number;
  level: string;
  title: string;
  summary: string | null;
  content: string;
  is_active: boolean;
  created_at?: string | null;
};

export default function ReadingDetailPage() {
  const params = useParams();
  const rawLevel = String(params.level || "").trim().toUpperCase();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<ReadingTextRow | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReading = async () => {
      setLoading(true);
      setError("");

      if (!rawLevel) {
        setError("Level not found.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("reading_texts")
        .select("id, level, title, summary, content, is_active, created_at")
        .eq("level", rawLevel)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        setError(error.message);
        setItem(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setError(`No active reading text found for ${rawLevel}.`);
        setItem(null);
        setLoading(false);
        return;
      }

      setItem(data as ReadingTextRow);
      setLoading(false);
    };

    loadReading();
  }, [rawLevel]);

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
    >
      <main className="w-full px-4 py-8 md:max-w-4xl md:mx-auto space-y-6">
        <div
          className="border border-black rounded-3xl p-6 md:p-8"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <p
                className="text-sm font-bold uppercase tracking-[0.2em]"
                style={{ color: "var(--text-soft)" }}
              >
                Reading Page
              </p>
              <h1 className="text-3xl md:text-4xl font-extrabold mt-2">
                {rawLevel} Reading
              </h1>
            </div>

            <Link
              href="/#daily-texts"
              className="rounded-full px-5 py-3 text-sm font-bold border border-black transition"
              style={{
                backgroundColor: "var(--bg-button)",
                color: "var(--text-main)",
              }}
            >
              ← Back to Home
            </Link>
          </div>

          {loading ? (
            <div
              className="border border-dashed border-black rounded-2xl p-8 text-center"
              style={{ backgroundColor: "var(--bg-soft)" }}
            >
              Loading reading text...
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-black rounded-2xl p-6">
              <p className="font-bold mb-2">Notice</p>
              <p className="text-sm break-words">{error}</p>
            </div>
          ) : item ? (
            <div className="space-y-6">
              <div
                className="border border-black rounded-2xl p-6"
                style={{ backgroundColor: "var(--bg-soft)" }}
              >
                <p
                  className="text-sm font-bold uppercase tracking-[0.15em] mb-2"
                  style={{ color: "var(--text-soft)" }}
                >
                  {item.level}
                </p>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
                  {item.title}
                </h2>

                {item.summary ? (
                  <p
                    className="text-base leading-7"
                    style={{ color: "var(--text-soft)" }}
                  >
                    {item.summary}
                  </p>
                ) : null}
              </div>

              <div
                className="border border-black rounded-2xl p-6 md:p-8"
                style={{ backgroundColor: "var(--bg-soft)" }}
              >
                <h3 className="text-xl font-bold mb-4">Reading Text</h3>
                <div className="whitespace-pre-line leading-8 text-[17px]">
                  {item.content}
                </div>
              </div>

              <div
                className="border border-dashed border-black rounded-2xl p-6"
                style={{ backgroundColor: "var(--bg-card)" }}
              >
                <h3 className="text-lg font-bold mb-2">Questions Section</h3>
                <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                  This area is ready for your next step. Later, you can add:
                  multiple choice questions, true/false tasks, sequencing
                  activities, and other reading exercises under this text.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}