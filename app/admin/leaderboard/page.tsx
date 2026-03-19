"use client";

import { useEffect, useState } from "react";

type TopStudentRow = {
  student_id: string;
  username: string;
  level: string;
  total_score: number;
  quizzes_count: number;
};

type LevelStatRow = {
  level: string;
  students: number;
  total_score: number;
};

type ClassStatRow = {
  class_name: string;
  students: number;
  total_score: number;
};

type OverviewResponse = {
  stats: {
    totalTests: number;
    totalStudents: number;
    averageScore: number;
  };
  topStudents: TopStudentRow[];
  levelStats: LevelStatRow[];
  classStats: ClassStatRow[];
};

export default function AdminLeaderboardPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");

  const loadOverview = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/leaderboard/overview");
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setMessage(json?.error || "Failed to load leaderboard data.");
        setData(null);
      } else {
        setData(json);
      }
    } catch (error: any) {
      setMessage(error?.message || "An unexpected error occurred.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const resetLeaderboard = async () => {
    const ok = window.confirm(
      "Do you want to reset the leaderboard completely? This action cannot be undone."
    );

    if (!ok) return;

    setResetting(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/leaderboard/reset", {
        method: "POST",
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        setMessage(json?.error || "Failed to reset the leaderboard.");
      } else {
        setMessage(json?.message || "Leaderboard reset successfully.");
        await loadOverview();
      }
    } catch (error: any) {
      setMessage(error?.message || "An unexpected error occurred.");
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="bg-yellow-100 border border-black rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Leaderboard Analytics</h1>
              <p className="text-sm mt-1">
                Ranking and analytics dashboard for the entire course.
              </p>
            </div>

            <button
              onClick={resetLeaderboard}
              disabled={resetting}
              className="px-4 py-3 rounded-lg border border-black bg-red-500 text-white font-bold hover:bg-red-600 transition disabled:opacity-60"
            >
              {resetting ? "Resetting..." : "Reset Leaderboard"}
            </button>
          </div>

          {message ? (
            <div className="mb-6 bg-yellow-50 border border-black rounded-xl p-4">
              {message}
            </div>
          ) : null}

          {loading ? (
            <div className="border border-dashed border-black rounded-lg p-8 text-center">
              Loading analytics...
            </div>
          ) : !data ? (
            <div className="border border-dashed border-black rounded-lg p-8 text-center">
              No data found.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-yellow-50 border border-black rounded-xl p-5">
                  <div className="text-xs opacity-70">Total Test Records</div>
                  <div className="text-3xl font-extrabold mt-1">
                    {data.stats.totalTests}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-black rounded-xl p-5">
                  <div className="text-xs opacity-70">Students with Scores</div>
                  <div className="text-3xl font-extrabold mt-1">
                    {data.stats.totalStudents}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-black rounded-xl p-5">
                  <div className="text-xs opacity-70">Average Test Score</div>
                  <div className="text-3xl font-extrabold mt-1">
                    {data.stats.averageScore}
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-black rounded-xl p-5">
                <h2 className="text-2xl font-bold mb-4">Top Students</h2>

                {data.topStudents.length === 0 ? (
                  <div className="border border-dashed border-black rounded-lg p-6 text-center">
                    No score records yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-yellow-200">
                          <th className="border border-black p-3 text-left">#</th>
                          <th className="border border-black p-3 text-left">Student</th>
                          <th className="border border-black p-3 text-left">Level</th>
                          <th className="border border-black p-3 text-left">Quiz Count</th>
                          <th className="border border-black p-3 text-left">Total Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topStudents.map((student, index) => (
                          <tr key={student.student_id} className="bg-white">
                            <td className="border border-black p-3">{index + 1}</td>
                            <td className="border border-black p-3 font-bold">
                              {student.username}
                            </td>
                            <td className="border border-black p-3">{student.level}</td>
                            <td className="border border-black p-3">
                              {student.quizzes_count}
                            </td>
                            <td className="border border-black p-3 font-bold">
                              {student.total_score}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-yellow-50 border border-black rounded-xl p-5">
                  <h2 className="text-2xl font-bold mb-4">By Level</h2>

                  {data.levelStats.length === 0 ? (
                    <div className="border border-dashed border-black rounded-lg p-6 text-center">
                      No data available.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-yellow-200">
                            <th className="border border-black p-3 text-left">Level</th>
                            <th className="border border-black p-3 text-left">Students</th>
                            <th className="border border-black p-3 text-left">Total Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.levelStats.map((level) => (
                            <tr key={level.level} className="bg-white">
                              <td className="border border-black p-3 font-bold">
                                {level.level}
                              </td>
                              <td className="border border-black p-3">
                                {level.students}
                              </td>
                              <td className="border border-black p-3">
                                {level.total_score}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 border border-black rounded-xl p-5">
                  <h2 className="text-2xl font-bold mb-4">By Class</h2>

                  {data.classStats.length === 0 ? (
                    <div className="border border-dashed border-black rounded-lg p-6 text-center">
                      No data available.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-yellow-200">
                            <th className="border border-black p-3 text-left">Class</th>
                            <th className="border border-black p-3 text-left">Students</th>
                            <th className="border border-black p-3 text-left">Total Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.classStats.map((cls) => (
                            <tr key={cls.class_name} className="bg-white">
                              <td className="border border-black p-3 font-bold">
                                {cls.class_name}
                              </td>
                              <td className="border border-black p-3">
                                {cls.students}
                              </td>
                              <td className="border border-black p-3">
                                {cls.total_score}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}