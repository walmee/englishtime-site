"use client";

import { useEffect, useState } from "react";
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
  return (
    <div
      className="border border-black rounded-2xl p-6"
      style={{ backgroundColor: "var(--bg-card)" }}
    >
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-sm opacity-90 mb-6 break-words">{subtitle}</p>

      {rows.length === 0 ? (
        <div
          className="border border-dashed border-black rounded-lg p-8 text-center"
          style={{ backgroundColor: "var(--bg-soft)" }}
        >
          No data available in this section yet.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row, index) => {
            const isMe = row.student_id === currentStudentId;

            return (
              <div
                key={`${title}-${row.student_id}`}
                className="border border-black rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                style={{
                  backgroundColor: isMe ? "var(--bg-button)" : "var(--bg-soft)",
                }}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className="w-10 h-10 shrink-0 rounded-full border border-black flex items-center justify-center font-extrabold"
                    style={{ backgroundColor: "var(--bg-card)" }}
                  >
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold text-lg break-words">
                      {row.username} {isMe ? "← You" : ""}
                    </div>
                    <div className="text-sm opacity-80 break-words">
                      Level: {row.level} • Quizzes: {row.quizzes_count}
                    </div>
                  </div>
                </div>

                <div className="text-left md:text-right shrink-0">
                  <div className="text-xs opacity-80">Total Score</div>
                  <div className="text-2xl font-extrabold">{row.total_score}</div>
                </div>
              </div>
            );
          })}
        </div>
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

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      setMsg("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
          setMsg("You must log in first.");
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
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden text-black"
      style={{ backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}
    >
      <main className="w-full px-3 py-6 md:max-w-6xl md:mx-auto overflow-x-hidden space-y-6">
        <div
          className="border border-black rounded-2xl p-6"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-sm opacity-90 break-words">
            Track your class, level, and overall course rankings here.
          </p>
        </div>

        {msg ? (
          <div className="bg-red-100 border border-black rounded-xl p-4">
            <p className="font-bold">Notice</p>
            <p className="text-sm break-words">{msg}</p>
          </div>
        ) : null}

        {loading ? (
          <div
            className="border border-black rounded-2xl p-8 text-center"
            style={{ backgroundColor: "var(--bg-card)" }}
          >
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