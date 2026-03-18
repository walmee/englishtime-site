"use client";

import { useEffect, useState } from "react";
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

export default function AdminReadingTextsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [items, setItems] = useState<ReadingTextRow[]>([]);

  const [level, setLevel] = useState("A1");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");

  const load = async () => {
    setLoading(true);
    setMsg("");

    const { data, error } = await supabase
      .from("reading_texts")
      .select("id, level, title, summary, content, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMsg(error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(Array.isArray(data) ? (data as ReadingTextRow[]) : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createReading = async () => {
    setMsg("");

    if (!title.trim() || !content.trim()) {
      setMsg("Title and content are required.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("reading_texts").insert({
      level,
      title: title.trim(),
      summary: summary.trim() || null,
      content: content.trim(),
      is_active: true,
    });

    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }

    setTitle("");
    setSummary("");
    setContent("");
    setSaving(false);
    setMsg("Reading text created successfully.");
    load();
  };

  const toggleActive = async (id: number, nextValue: boolean) => {
    setMsg("");

    const { error } = await supabase
      .from("reading_texts")
      .update({ is_active: nextValue })
      .eq("id", id);

    if (error) {
      setMsg(error.message);
      return;
    }

    load();
  };

  const deleteReading = async (id: number) => {
    const ok = window.confirm("Delete this reading text?");
    if (!ok) return;

    setMsg("");

    const { error } = await supabase
      .from("reading_texts")
      .delete()
      .eq("id", id);

    if (error) {
      setMsg(error.message);
      return;
    }

    load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-100 border border-black rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-2">Reading Texts</h2>
        <p className="text-sm mb-4">
          Create and manage level-based reading pages.
        </p>

        {msg ? (
          <div className="mb-4 bg-red-100 border border-black rounded-xl p-4">
            <p className="font-bold">Notice</p>
            <p className="text-sm break-words">{msg}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full p-3 rounded-lg border border-black bg-yellow-50"
            >
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 rounded-lg border border-black bg-yellow-50"
              placeholder="e.g. My Daily Routine"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-bold mb-1">Summary</label>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full p-3 rounded-lg border border-black bg-yellow-50"
            placeholder="Short summary"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-bold mb-1">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[220px] p-3 rounded-lg border border-black bg-yellow-50"
            placeholder="Write the reading text here..."
          />
        </div>

        <button
          onClick={createReading}
          disabled={saving}
          className="mt-4 px-5 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-800 transition disabled:opacity-60"
        >
          {saving ? "Saving..." : "+ Create Reading Text"}
        </button>
      </div>

      <div className="bg-yellow-100 border border-black rounded-2xl p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-xl font-bold">All Reading Texts</h3>
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="border border-dashed border-black rounded-lg p-8 text-center">
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="border border-dashed border-black rounded-lg p-8 text-center">
            No reading texts found.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-yellow-50 border border-black rounded-xl p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs opacity-70 mb-1">
                      Level: <b>{item.level}</b>
                    </p>
                    <h4 className="text-lg font-bold">{item.title}</h4>
                    {item.summary ? (
                      <p className="text-sm mt-1 opacity-80">{item.summary}</p>
                    ) : null}
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full border border-black text-xs font-bold ${
                      item.is_active ? "bg-green-100" : "bg-gray-200"
                    }`}
                  >
                    {item.is_active ? "Active" : "Passive"}
                  </span>
                </div>

                <div className="mt-4 whitespace-pre-line text-sm leading-7">
                  {item.content}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleActive(item.id, !item.is_active)}
                    className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition font-bold"
                  >
                    {item.is_active ? "Make Passive" : "Make Active"}
                  </button>

                  <button
                    onClick={() => deleteReading(item.id)}
                    className="px-4 py-2 rounded-lg border border-black bg-red-100 hover:bg-red-200 transition font-bold"
                  >
                    Delete
                  </button>
                </div>

                <p className="mt-3 text-xs opacity-70">
                  {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}