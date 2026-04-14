"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type HomeHighlightRow = {
  id: number;
  card_key: string;
  label: string;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

type HomeAnnouncementRow = {
  id: number;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

type HomeWordRow = {
  id: number;
  word: string;
  meaning: string;
  example_sentence: string;
  sort_order: number;
  is_active: boolean;
};

type HomeActivityRow = {
  id: number;
  title: string;
  description_line_1: string | null;
  description_line_2: string | null;
  sort_order: number;
  is_active: boolean;
};

type NoticeTone = "info" | "error" | "success";

export default function AdminHomepageContentPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<NoticeTone>("info");

  const [highlights, setHighlights] = useState<HomeHighlightRow[]>([]);
  const [announcements, setAnnouncements] = useState<HomeAnnouncementRow[]>([]);
  const [words, setWords] = useState<HomeWordRow[]>([]);
  const [activities, setActivities] = useState<HomeActivityRow[]>([]);

  const sortedHighlights = useMemo(
    () => [...highlights].sort((a, b) => a.sort_order - b.sort_order),
    [highlights]
  );

  const sortedAnnouncements = useMemo(
    () => [...announcements].sort((a, b) => a.sort_order - b.sort_order),
    [announcements]
  );

  const sortedWords = useMemo(
    () => [...words].sort((a, b) => a.sort_order - b.sort_order),
    [words]
  );

  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => a.sort_order - b.sort_order),
    [activities]
  );

  const noticeClasses = useMemo(() => {
    if (messageTone === "error") {
      return "bg-red-50 border-red-200 text-red-900";
    }

    if (messageTone === "success") {
      return "bg-emerald-50 border-emerald-200 text-emerald-900";
    }

    return "bg-sky-50 border-sky-200 text-sky-900";
  }, [messageTone]);

  const loadData = async () => {
    setLoading(true);
    setMessage("");
    setMessageTone("info");

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

    if (String(profile.role || "").toLowerCase() !== "admin") {
      router.replace("/dashboard");
      return;
    }

    const [highlightsRes, announcementsRes, wordsRes, activitiesRes] =
      await Promise.all([
        supabase
          .from("home_highlights")
          .select("id, card_key, label, title, description, sort_order, is_active")
          .order("sort_order", { ascending: true }),

        supabase
          .from("home_announcements")
          .select("id, title, description, sort_order, is_active")
          .order("sort_order", { ascending: true }),

        supabase
          .from("home_words")
          .select("id, word, meaning, example_sentence, sort_order, is_active")
          .order("sort_order", { ascending: true }),

        supabase
          .from("home_activities")
          .select(
            "id, title, description_line_1, description_line_2, sort_order, is_active"
          )
          .order("sort_order", { ascending: true }),
      ]);

    if (highlightsRes.error) {
      setMessage(highlightsRes.error.message);
      setMessageTone("error");
      setLoading(false);
      return;
    }

    if (announcementsRes.error) {
      setMessage(announcementsRes.error.message);
      setMessageTone("error");
      setLoading(false);
      return;
    }

    if (wordsRes.error) {
      setMessage(wordsRes.error.message);
      setMessageTone("error");
      setLoading(false);
      return;
    }

    if (activitiesRes.error) {
      setMessage(activitiesRes.error.message);
      setMessageTone("error");
      setLoading(false);
      return;
    }

    setHighlights((highlightsRes.data || []) as HomeHighlightRow[]);
    setAnnouncements((announcementsRes.data || []) as HomeAnnouncementRow[]);
    setWords((wordsRes.data || []) as HomeWordRow[]);
    setActivities((activitiesRes.data || []) as HomeActivityRow[]);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateHighlight = (
    id: number,
    field: keyof HomeHighlightRow,
    value: string | number | boolean
  ) => {
    setHighlights((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const updateAnnouncement = (
    id: number,
    field: keyof HomeAnnouncementRow,
    value: string | number | boolean
  ) => {
    setAnnouncements((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const updateWord = (
    id: number,
    field: keyof HomeWordRow,
    value: string | number | boolean
  ) => {
    setWords((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const updateActivity = (
    id: number,
    field: keyof HomeActivityRow,
    value: string | number | boolean | null
  ) => {
    setActivities((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const saveAll = async () => {
    setSaving(true);
    setMessage("");
    setMessageTone("info");

    try {
      for (const row of highlights) {
        const { error } = await supabase
          .from("home_highlights")
          .update({
            label: row.label.trim(),
            title: row.title.trim(),
            description: row.description.trim(),
            sort_order: Number(row.sort_order) || 0,
            is_active: row.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (error) {
          setMessage(error.message);
          setMessageTone("error");
          setSaving(false);
          return;
        }
      }

      for (const row of announcements) {
        const { error } = await supabase
          .from("home_announcements")
          .update({
            title: row.title.trim(),
            description: row.description.trim(),
            sort_order: Number(row.sort_order) || 0,
            is_active: row.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (error) {
          setMessage(error.message);
          setMessageTone("error");
          setSaving(false);
          return;
        }
      }

      for (const row of words) {
        const { error } = await supabase
          .from("home_words")
          .update({
            word: row.word.trim(),
            meaning: row.meaning.trim(),
            example_sentence: row.example_sentence.trim(),
            sort_order: Number(row.sort_order) || 0,
            is_active: row.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (error) {
          setMessage(error.message);
          setMessageTone("error");
          setSaving(false);
          return;
        }
      }

      for (const row of activities) {
        const { error } = await supabase
          .from("home_activities")
          .update({
            title: row.title.trim(),
            description_line_1: row.description_line_1?.trim() || null,
            description_line_2: row.description_line_2?.trim() || null,
            sort_order: Number(row.sort_order) || 0,
            is_active: row.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (error) {
          setMessage(error.message);
          setMessageTone("error");
          setSaving(false);
          return;
        }
      }

      setMessage("Homepage content updated successfully.");
      setMessageTone("success");
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <section className="rounded-3xl border border-black bg-yellow-100 p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.2em] opacity-70 mb-3">
            English Time
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold">Homepage Content</h1>
          <p className="mt-3 text-sm md:text-base opacity-80 max-w-3xl">
            Edit the homepage cards and sections from one panel.
          </p>
        </section>

        {message ? (
          <div className={`rounded-2xl border p-4 ${noticeClasses}`}>{message}</div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-black bg-yellow-100 p-8 text-center">
            Loading homepage content...
          </div>
        ) : (
          <>
            <section className="rounded-3xl border border-black bg-yellow-100 p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">What&apos;s Happening Today</h2>
                <p className="text-sm opacity-80 mt-1">
                  Edit the 3 cards shown on the top-right of the homepage.
                </p>
              </div>

              {sortedHighlights.map((row, index) => (
                <div
                  key={row.id}
                  className={`rounded-2xl border border-black p-5 space-y-4 ${
                    row.is_active ? "bg-yellow-50" : "bg-neutral-200 opacity-80"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-bold">Card {index + 1}</div>

                    <div className="flex items-center gap-3">
                      {!row.is_active ? (
                        <span className="rounded-full border border-black bg-white px-3 py-1 text-xs font-bold">
                          Hidden on homepage
                        </span>
                      ) : null}

                      <label className="inline-flex items-center gap-2 text-sm font-bold">
                        <input
                          type="checkbox"
                          checked={row.is_active}
                          onChange={(e) =>
                            updateHighlight(row.id, "is_active", e.target.checked)
                          }
                        />
                        {row.is_active ? "Active" : "Passive"}
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px] gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Label</label>
                      <input
                        value={row.label}
                        onChange={(e) => updateHighlight(row.id, "label", e.target.value)}
                        className="w-full rounded-xl border border-black bg-white p-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2">Title</label>
                      <input
                        value={row.title}
                        onChange={(e) => updateHighlight(row.id, "title", e.target.value)}
                        className="w-full rounded-xl border border-black bg-white p-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2">Sort Order</label>
                      <input
                        type="number"
                        value={row.sort_order}
                        onChange={(e) =>
                          updateHighlight(row.id, "sort_order", Number(e.target.value))
                        }
                        className="w-full rounded-xl border border-black bg-white p-3"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-sm font-bold mb-2">Description</label>
                      <textarea
                        value={row.description}
                        onChange={(e) =>
                          updateHighlight(row.id, "description", e.target.value)
                        }
                        className="w-full rounded-xl border border-black bg-white p-3 min-h-[100px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-3xl border border-black bg-yellow-100 p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Announcements</h2>
                <p className="text-sm opacity-80 mt-1">
                  Edit the 3 announcement cards.
                </p>
              </div>

              {sortedAnnouncements.map((row, index) => (
                <div
                  key={row.id}
                  className={`rounded-2xl border border-black p-5 space-y-4 ${
                    row.is_active ? "bg-yellow-50" : "bg-neutral-200 opacity-80"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-bold">Announcement {index + 1}</div>

                    <div className="flex items-center gap-3">
                      {!row.is_active ? (
                        <span className="rounded-full border border-black bg-white px-3 py-1 text-xs font-bold">
                          Hidden on homepage
                        </span>
                      ) : null}

                      <label className="inline-flex items-center gap-2 text-sm font-bold">
                        <input
                          type="checkbox"
                          checked={row.is_active}
                          onChange={(e) =>
                            updateAnnouncement(row.id, "is_active", e.target.checked)
                          }
                        />
                        {row.is_active ? "Active" : "Passive"}
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Title</label>
                      <input
                        value={row.title}
                        onChange={(e) =>
                          updateAnnouncement(row.id, "title", e.target.value)
                        }
                        className="w-full rounded-xl border border-black bg-white p-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2">Sort Order</label>
                      <input
                        type="number"
                        value={row.sort_order}
                        onChange={(e) =>
                          updateAnnouncement(row.id, "sort_order", Number(e.target.value))
                        }
                        className="w-full rounded-xl border border-black bg-white p-3"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold mb-2">Description</label>
                      <textarea
                        value={row.description}
                        onChange={(e) =>
                          updateAnnouncement(row.id, "description", e.target.value)
                        }
                        className="w-full rounded-xl border border-black bg-white p-3 min-h-[100px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-3xl border border-black bg-yellow-100 p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Words of the Day</h2>
                <p className="text-sm opacity-80 mt-1">
                  Edit the 3 word cards.
                </p>
              </div>

              {sortedWords.map((row, index) => (
                <div
                  key={row.id}
                  className={`rounded-2xl border border-black p-5 space-y-4 ${
                    row.is_active ? "bg-yellow-50" : "bg-neutral-200 opacity-80"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-bold">Word {index + 1}</div>

                    <div className="flex items-center gap-3">
                      {!row.is_active ? (
                        <span className="rounded-full border border-black bg-white px-3 py-1 text-xs font-bold">
                          Hidden on homepage
                        </span>
                      ) : null}

                      <label className="inline-flex items-center gap-2 text-sm font-bold">
                        <input
                          type="checkbox"
                          checked={row.is_active}
                          onChange={(e) => updateWord(row.id, "is_active", e.target.checked)}
                        />
                        {row.is_active ? "Active" : "Passive"}
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px] gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Word</label>
                      <input
                        value={row.word}
                        onChange={(e) => updateWord(row.id, "word", e.target.value)}
                        className="w-full rounded-xl border border-black bg-white p-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2">Meaning</label>
                      <input
                        value={row.meaning}
                        onChange={(e) => updateWord(row.id, "meaning", e.target.value)}
                        className="w-full rounded-xl border border-black bg-white p-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2">Sort Order</label>
                      <input
                        type="number"
                        value={row.sort_order}
                        onChange={(e) =>
                          updateWord(row.id, "sort_order", Number(e.target.value))
                        }
                        className="w-full rounded-xl border border-black bg-white p-3"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-sm font-bold mb-2">
                        Example Sentence
                      </label>
                      <textarea
                        value={row.example_sentence}
                        onChange={(e) =>
                          updateWord(row.id, "example_sentence", e.target.value)
                        }
                        className="w-full rounded-xl border border-black bg-white p-3 min-h-[100px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-3xl border border-black bg-yellow-100 p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Speaking Club & Classes</h2>
                <p className="text-sm opacity-80 mt-1">
                  Edit the 3 activity cards. Passive ones will not appear on the student homepage.
                </p>
              </div>

              {sortedActivities.map((row, index) => (
                <div
                  key={row.id}
                  className={`rounded-2xl border border-black p-5 space-y-4 transition ${
                    row.is_active ? "bg-yellow-50" : "bg-neutral-200 opacity-80"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-bold">Activity {index + 1}</div>

                    <div className="flex flex-wrap items-center gap-3">
                      {!row.is_active ? (
                        <span className="rounded-full border border-black bg-white px-3 py-1 text-xs font-bold">
                          Hidden on homepage
                        </span>
                      ) : (
                        <span className="rounded-full border border-black bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
                          Visible on homepage
                        </span>
                      )}

                      <div>
                        <label className="block text-xs font-bold mb-1">Sort Order</label>
                        <input
                          type="number"
                          value={row.sort_order}
                          onChange={(e) =>
                            updateActivity(row.id, "sort_order", Number(e.target.value))
                          }
                          className="w-24 rounded-xl border border-black bg-white p-2"
                        />
                      </div>

                      <label className="inline-flex items-center gap-2 text-sm font-bold mt-5">
                        <input
                          type="checkbox"
                          checked={row.is_active}
                          onChange={(e) =>
                            updateActivity(row.id, "is_active", e.target.checked)
                          }
                        />
                        {row.is_active ? "Active" : "Passive"}
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Title</label>
                      <input
                        value={row.title}
                        onChange={(e) => updateActivity(row.id, "title", e.target.value)}
                        className="w-full rounded-xl border border-black bg-white p-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Description Line 1
                      </label>
                      <input
                        value={row.description_line_1 || ""}
                        onChange={(e) =>
                          updateActivity(row.id, "description_line_1", e.target.value)
                        }
                        className="w-full rounded-xl border border-black bg-white p-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Description Line 2
                      </label>
                      <input
                        value={row.description_line_2 || ""}
                        onChange={(e) =>
                          updateActivity(row.id, "description_line_2", e.target.value)
                        }
                        className="w-full rounded-xl border border-black bg-white p-3"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-3xl border border-black bg-yellow-100 p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-bold text-lg">Save Homepage Settings</div>
                <div className="text-sm opacity-80 mt-1">
                  All sections on this page will be updated together.
                </div>
              </div>

              <button
                onClick={saveAll}
                disabled={saving}
                className="px-5 py-3 rounded-2xl border border-black font-bold bg-black text-yellow-300 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save All Changes"}
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}