"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type HomeHighlightRow = {
  id: number;
  card_key: string;
  label: string;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

type FormRow = {
  id: number;
  card_key: string;
  label: string;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

export default function AdminHomeHighlightsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<FormRow[]>([]);

  const loadData = async () => {
    setLoading(true);
    setMessage("");

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

    const { data, error } = await supabase
      .from("home_highlights")
      .select("id, card_key, label, title, description, sort_order, is_active")
      .order("sort_order", { ascending: true });

    if (error) {
      setMessage(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(Array.isArray(data) ? (data as HomeHighlightRow[]) : []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateRow = (
    id: number,
    field: keyof FormRow,
    value: string | number | boolean
  ) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const saveAll = async () => {
    setSaving(true);
    setMessage("");

    try {
      for (const row of rows) {
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
          setSaving(false);
          return;
        }
      }

      setMessage("Home highlights updated successfully.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-black">
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-extrabold">Home Highlights</h1>
          <p className="text-sm opacity-70 mt-2">
            Edit the 3 cards shown in the “What’s Happening Today?” section on the homepage.
          </p>
        </section>

        {message ? (
          <div className="rounded-2xl border bg-sky-50 border-sky-200 text-sky-900 p-4">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
            Loading...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
            No home highlight records found.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row, index) => (
              <div key={row.id} className="rounded-3xl border bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <div className="text-xs uppercase tracking-[0.15em] opacity-50">
                    Card {index + 1}
                  </div>
                  <div className="font-bold mt-1">{row.card_key}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Label</label>
                    <input
                      value={row.label}
                      onChange={(e) => updateRow(row.id, "label", e.target.value)}
                      className="w-full rounded-2xl border bg-neutral-50 p-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">Title</label>
                    <input
                      value={row.title}
                      onChange={(e) => updateRow(row.id, "title", e.target.value)}
                      className="w-full rounded-2xl border bg-neutral-50 p-3"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-2">Description</label>
                    <textarea
                      value={row.description}
                      onChange={(e) => updateRow(row.id, "description", e.target.value)}
                      className="w-full rounded-2xl border bg-neutral-50 p-3 min-h-[120px]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">Sort Order</label>
                    <input
                      type="number"
                      value={row.sort_order}
                      onChange={(e) =>
                        updateRow(row.id, "sort_order", Number(e.target.value))
                      }
                      className="w-full rounded-2xl border bg-neutral-50 p-3"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-3 text-sm font-bold">
                      <input
                        type="checkbox"
                        checked={row.is_active}
                        onChange={(e) =>
                          updateRow(row.id, "is_active", e.target.checked)
                        }
                      />
                      Active
                    </label>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <button
                onClick={saveAll}
                disabled={saving}
                className="px-5 py-3 rounded-2xl border font-bold"
                style={{
                  backgroundColor: "#facc15",
                  color: "#111111",
                  borderColor: "#111111",
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}