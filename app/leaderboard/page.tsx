"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type LeaderboardRow = {
  student_id: string;
  username: string;
  level: string;
  total_score: number;
  quizzes_count: number;
};

type LeaderboardResponse = {
  classLeaderboard: LeaderboardRow[];
  levelLeaderboard: LeaderboardRow[];
  overallLeaderboard: LeaderboardRow[];
  currentClassName: string | null;
  currentLevel: string | null;
};

type NoticeTone = "error" | "info";

function LeaderboardSection({
  title,
  subtitle,
  rows,
  currentStudentId,
}: {
  title: string;
  subtitle: string;
  rows: LeaderboardRow[];
  currentStudentId: string;
}) {
  const topThree = useMemo(() => rows.slice(0, 3), [rows]);

  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-sm opacity-70 break-words">{subtitle}</p>
        </div>

        <div className="rounded-2xl border bg-neutral-50 px-4 py-3 text-sm">
          <div className="text-xs opacity-60">Students listed</div>
          <div className="text-xl font-bold mt-1">{rows.length}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center bg-neutral-50">
          No data available in this section yet.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {topThree.map((row, index) => {
              const isMe = row.student_id === currentStudentId;

              return (
                <div
                  key={`${title}-top-${row.student_id}`}
                  className="rounded-2xl border p-4"
                  style={{
                    backgroundColor: isMe ? "#fde68a" : "#fafafa",
                    borderColor: "#e5e5e5",
                  }}
                >
                  <div className="text-xs opacity-60">Top Rank</div>
                  <div className="text-2xl font-extrabold mt-1">#{index + 1}</div>
                  <div className="font-bold mt-3 break-words">
                    {row.username}
                    {isMe ? " (You)" : ""}
                  </div>
                  <div className="text-sm opacity-70 mt-1 break-words">
                    Level: {row.level}
                  </div>
                  <div className="text-sm opacity-70 break-words">
                    Quizzes: {row.quizzes_count}
                  </div>
                  <div className="mt-4 text-sm font-bold">{row.total_score} pts</div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => {
              const isMe = row.student_id === currentStudentId;

              return (
                <div
                  key={`${title}-${row.student_id}`}
                  className="rounded-2xl border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between shadow-sm"
                  style={{
                    backgroundColor: isMe ? "#fde68a" : "#ffffff",
                    borderColor: "#e5e5e5",
                  }}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-11 h-11 shrink-0 rounded-full border flex items-center justify-center font-extrabold bg-white">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-lg break-words">
                        {row.username} {isMe ? "← You" : ""}
                      </div>
                      <div className="text-sm opacity-70 break-words">
                        Level: {row.level} • Quizzes: {row.quizzes_count}
                      </div>
                    </div>
                  </div>

                  <div className="text-left md:text-right shrink-0">
                    <div className="text-xs opacity-60">Total Score</div>
                    <div className="text-2xl font-extrabold">{row.total_score}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse>({
    classLeaderboard: [],
    levelLeaderboard: [],
    overallLeaderboard: [],
    currentClassName: null,
    currentLevel: null,
  });

  const [currentStudentId, setCurrentStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
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

  const totalVisibleStudents = useMemo(() => {
    const ids = new Set<string>();

    data.classLeaderboard.forEach((row) => ids.add(row.student_id));
    data.levelLeaderboard.forEach((row) => ids.add(row.student_id));
    data.overallLeaderboard.forEach((row) => ids.add(row.student_id));

    return ids.size;
  }, [data]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      setMsg("");
      setNoticeTone("info");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
          setMsg("You must log in first.");
          setNoticeTone("error");
          setLoading(false);
          return;
        }

        setCurrentStudentId(user.id);

        const res = await fetch(
          `/api/student/leaderboard?student_id=${encodeURIComponent(user.id)}`
        );

        const text = await res.text();
        const json = text ? JSON.parse(text) : {};

        if (!res.ok) {
          setMsg(json?.error || "Failed to load leaderboard.");
          setNoticeTone("error");
        } else {
          setData({
            classLeaderboard: Array.isArray(json?.classLeaderboard)
              ? json.classLeaderboard
              : [],
            levelLeaderboard: Array.isArray(json?.levelLeaderboard)
              ? json.levelLeaderboard
              : [],
            overallLeaderboard: Array.isArray(json?.overallLeaderboard)
              ? json.overallLeaderboard
              : [],
            currentClassName: json?.currentClassName || null,
            currentLevel: json?.currentLevel || null,
          });
        }
      } catch (e: any) {
        setMsg(e?.message || "An unexpected error occurred.");
        setNoticeTone("error");
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  const noticeStyles = getNoticeStyles(noticeTone);

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ backgroundColor: "#f5f5f5", color: "#111111" }}
    >
      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto overflow-x-hidden space-y-6">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-sm opacity-80 break-words">
            Track your class, level, and overall course rankings here.
          </p>

          {!loading ? (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-xs opacity-60">Class leaderboard</div>
                <div className="text-2xl font-bold mt-1">
                  {data.classLeaderboard.length}
                </div>
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-xs opacity-60">Level leaderboard</div>
                <div className="text-2xl font-bold mt-1">
                  {data.levelLeaderboard.length}
                </div>
              </div>

              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="text-xs opacity-60">Unique students shown</div>
                <div className="text-2xl font-bold mt-1">{totalVisibleStudents}</div>
              </div>
            </div>
          ) : null}
        </div>

        {msg ? (
          <div className={`border rounded-2xl p-4 ${noticeStyles.wrapper}`}>
            <p className="font-bold">{noticeStyles.title}</p>
            <p className="text-sm break-words">{msg}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
            Loading leaderboard...
          </div>
        ) : (
          <>
            <LeaderboardSection
              title="My Class Leaderboard"
              subtitle={
                data.currentClassName
                  ? `Ranking of students in ${data.currentClassName} class`
                  : "Class information not found"
              }
              rows={data.classLeaderboard}
              currentStudentId={currentStudentId}
            />

            <LeaderboardSection
              title="My Level Leaderboard"
              subtitle={
                data.currentLevel
                  ? `Ranking of all students at ${data.currentLevel} level`
                  : "Level information not found"
              }
              rows={data.levelLeaderboard}
              currentStudentId={currentStudentId}
            />

            <LeaderboardSection
              title="Overall Leaderboard"
              subtitle="Overall ranking of all students in the course"
              rows={data.overallLeaderboard}
              currentStudentId={currentStudentId}
            />
          </>
        )}
      </main>
    </div>
  );
}