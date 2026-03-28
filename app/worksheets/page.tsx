"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type WorksheetRow = {
  id: number;
  title: string;
  description?: string | null;
  file_url?: string | null;
  class_id?: number | null;
  created_at?: string | null;
};

type NoticeTone = "error" | "info";

export default function WorksheetsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [worksheets, setWorksheets] = useState<WorksheetRow[]>([]);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<NoticeTone>("info");

  const getNoticeStyles = (tone: NoticeTone) => {
    if (tone === "error") {
      return {
        wrapper: "bg-red-50 border-red-200 text-red-900",
        title: "Issue",
      };
    }

    return {
      wrapper: "bg-sky-50 border-sky-200 text-sky-900",
      title: "Info",
    };
  };

  const latestWorksheetDate = useMemo(() => {
    if (!worksheets.length) return "";
    const latest = [...worksheets].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })[0];

    return latest?.created_at ? new Date(latest.created_at).toLocaleString() : "";
  }, [worksheets]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setNotice("");
      setNoticeTone("info");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        router.replace("/login");
        return;
      }

      try {
        const res = await fetch("/api/student/worksheets", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const text = await res.text();
        const json = text ? JSON.parse(text) : {};

        if (!res.ok) {
          setNotice(json?.error || "Worksheets could not be loaded.");
          setNoticeTone("error");
          setWorksheets([]);
          setLoading(false);
          return;
        }

        setWorksheets(
          Array.isArray(json?.worksheets) ? (json.worksheets as WorksheetRow[]) : []
        );
        setLoading(false);
      } catch (e: any) {
        setNotice(e?.message || "Worksheets could not be loaded.");
        setNoticeTone("error");
        setWorksheets([]);
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const noticeStyles = getNoticeStyles(noticeTone);

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ backgroundColor: "#f5f5f5", color: "#111111" }}
    >
      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto space-y-6">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold mb-2">Worksheets</h2>
          <p className="text-sm opacity-80">
            Open and review the worksheets shared for your class.
          </p>

          {notice ? (
            <div className={`mt-4 border rounded-2xl p-4 ${noticeStyles.wrapper}`}>
              <p className="font-bold">{noticeStyles.title}</p>
              <p className="text-sm break-words">{notice}</p>
            </div>
          ) : null}

          {!loading ? (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-xs opacity-60">Total worksheets</div>
                <div className="text-2xl font-bold mt-1">{worksheets.length}</div>
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-xs opacity-60">Available PDFs</div>
                <div className="text-2xl font-bold mt-1">
                  {worksheets.filter((w) => !!w.file_url).length}
                </div>
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-xs opacity-60">Latest upload</div>
                <div className="text-sm font-semibold mt-2 break-words">
                  {latestWorksheetDate || "No uploads yet"}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xl font-bold">Class Worksheets</h3>
              <p className="text-sm opacity-70 mt-1">
                Download or open the materials prepared for your class.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              Loading worksheets...
            </div>
          ) : worksheets.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              No worksheets available for your class yet.
            </div>
          ) : (
            <div className="space-y-4">
              {worksheets.map((w, index) => (
                <div
                  key={w.id}
                  className="rounded-2xl border p-5 shadow-sm"
                  style={{ backgroundColor: "#ffffff", borderColor: "#e5e5e5" }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs opacity-60 mb-2">
                        Worksheet {index + 1}
                      </div>
                      <h4 className="text-lg font-bold break-words">{w.title}</h4>

                      {w.description ? (
                        <p className="mt-2 text-sm opacity-80 break-words">
                          {w.description}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm opacity-50">
                          No description added.
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {w.file_url ? (
                        <a
                          href={w.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-4 py-2 rounded-xl border font-bold transition hover:bg-yellow-300"
                          style={{
                            backgroundColor: "#facc15",
                            color: "#111111",
                            borderColor: "#111111",
                          }}
                        >
                          Open PDF
                        </a>
                      ) : (
                        <span className="inline-flex items-center px-4 py-2 rounded-xl border bg-neutral-100 text-sm">
                          No PDF
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs opacity-60">
                    <span>ID #{w.id}</span>
                    {w.created_at ? (
                      <span>{new Date(w.created_at).toLocaleString()}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold mb-2">Writing Feedback</h3>
          <p className="text-sm opacity-70">
            Your writing scores and teacher comments are shown on the Writing page.
          </p>

          <div className="mt-4 rounded-2xl border border-dashed p-6 text-sm">
            Open the Writing page to review teacher score and feedback for your submissions.
          </div>
        </div>
      </main>
    </div>
  );
}