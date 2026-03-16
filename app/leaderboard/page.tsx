"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    <div className="bg-yellow-100 border border-black rounded-2xl p-6">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-sm opacity-90 mb-6">{subtitle}</p>

      {rows.length === 0 ? (
        <div className="border border-dashed border-black rounded-lg p-8 text-center bg-yellow-50">
          Bu bölümde henüz veri yok.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row, index) => {
            const isMe = row.student_id === currentStudentId;

            return (
              <div
                key={`${title}-${row.student_id}`}
                className={[
                  "border border-black rounded-xl p-4 flex items-center justify-between",
                  isMe ? "bg-yellow-300" : "bg-yellow-50",
                ].join(" ")}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full border border-black bg-yellow-200 flex items-center justify-center font-extrabold">
                    {index + 1}
                  </div>

                  <div>
                    <div className="font-bold text-lg">
                      {row.username} {isMe ? "← You" : ""}
                    </div>
                    <div className="text-sm opacity-80">
                      Level: {row.level} • Quizzes: {row.quizzes_count}
                    </div>
                  </div>
                </div>

                <div className="text-right">
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
          setMsg("Önce giriş yapmalısın.");
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
          setMsg(json?.error || "Leaderboard yüklenemedi.");
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
        setMsg(e?.message || "Beklenmeyen bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <header className="border-b border-black bg-yellow-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Language Learning</h1>

          <nav className="flex gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
            >
              Dashboard
            </Link>
            <Link
              href="/take-test"
              className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
            >
              Take Test
            </Link>
            <Link
              href="/history"
              className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
            >
              History
            </Link>
            <Link
              href="/progress"
              className="px-4 py-2 rounded-lg border border-black bg-yellow-300 hover:bg-yellow-400 transition"
            >
              Progress
            </Link>
            <Link
              href="/leaderboard"
              className="px-4 py-2 rounded-lg border border-black bg-yellow-500 font-bold"
            >
              Leaderboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-sm opacity-90">
            Kendi sınıfını, seviyeni ve tüm kurs sıralamasını buradan takip et.
          </p>
        </div>

        {msg ? (
          <div className="bg-red-100 border border-black rounded-xl p-4">
            <p className="font-bold">Notice</p>
            <p className="text-sm">{msg}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="bg-yellow-100 border border-black rounded-2xl p-8 text-center">
            Loading leaderboard...
          </div>
        ) : (
          <>
            <LeaderboardSection
              title="My Class Leaderboard"
              subtitle={
                data.currentClassName
                  ? `${data.currentClassName} sınıfındaki öğrencilerin sıralaması`
                  : "Sınıf bilgisi bulunamadı"
              }
              rows={data.classLeaderboard}
              currentStudentId={currentStudentId}
            />

            <LeaderboardSection
              title="My Level Leaderboard"
              subtitle={
                data.currentLevel
                  ? `${data.currentLevel} seviyesindeki tüm öğrencilerin sıralaması`
                  : "Level bilgisi bulunamadı"
              }
              rows={data.levelLeaderboard}
              currentStudentId={currentStudentId}
            />

            <LeaderboardSection
              title="Overall Leaderboard"
              subtitle="Tüm kurstaki öğrencilerin genel sıralaması"
              rows={data.overallLeaderboard}
              currentStudentId={currentStudentId}
            />
          </>
        )}
      </main>
    </div>
  );
}