'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type QuizRow = {
  id: number;
  title: string;
  unit: string | null;
  time_limit_minutes: number | null;
  level: string | null;
  class_name: string | null;
  created_at?: string;
};

export default function AdminQuizzesPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);

  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('Unit 2');
  const [timeLimit, setTimeLimit] = useState(10);
  const [level, setLevel] = useState('');
  const [className, setClassName] = useState('');

  const load = async () => {
    setLoading(true);
    setMsg('');

    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, unit, time_limit_minutes, level, class_name, created_at')
      .order('id', { ascending: false });

    if (error) {
      setMsg(error.message);
      setQuizzes([]);
      setLoading(false);
      return;
    }

    setQuizzes(Array.isArray(data) ? (data as QuizRow[]) : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createQuiz = async () => {
    setMsg('');

    if (!title.trim() || !level || !className) {
      setMsg('Title, level and class are required.');
      return;
    }

    const { error } = await supabase.from('quizzes').insert({
      title: title.trim(),
      unit: unit.trim(),
      time_limit_minutes: Number(timeLimit) || 10,
      level,
      class_name: className,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setTitle('');
    setLevel('');
    setClassName('');
    await load();
  };

  const deleteQuiz = async (id: number) => {
    if (!confirm('Delete this quiz? (Questions may remain if not cascaded)')) return;

    setMsg('');
    const { error } = await supabase.from('quizzes').delete().eq('id', id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-100 border border-black rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-2">Quizzes</h2>
        <p className="text-sm mb-4">Create quizzes and manage them.</p>

        {msg ? (
          <div className="mb-4 bg-red-100 border border-black rounded-xl p-4">
            <p className="font-bold">Notice</p>
            <p className="text-sm">{msg}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 rounded-lg border border-black bg-yellow-50"
              placeholder="e.g. Unit 2 - Past Simple vs Past Continuous - Test 1"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Unit</label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full p-3 rounded-lg border border-black bg-yellow-50"
              placeholder="Unit 2"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Time (min)</label>
            <input
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              type="number"
              className="w-full p-3 rounded-lg border border-black bg-yellow-50"
              min={1}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full p-3 rounded-lg border border-black bg-yellow-50"
            >
              <option value="">Select</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
              <option value="C2">C2</option>
              <option value="all">ALL</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Class</label>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full p-3 rounded-lg border border-black bg-yellow-50"
            >
              <option value="">Select</option>
              <option value="Arkansas">Arkansas</option>
              <option value="London">London</option>
              <option value="California">California</option>
              <option value="all">ALL</option>
            </select>
          </div>
        </div>

        <button
          onClick={createQuiz}
          className="mt-4 px-5 py-3 rounded-lg border border-black bg-black text-yellow-300 font-bold hover:bg-gray-800 transition"
        >
          + Create Quiz
        </button>
      </div>

      <div className="bg-yellow-100 border border-black rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">All Quizzes</h3>
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
        ) : quizzes.length === 0 ? (
          <div className="border border-dashed border-black rounded-lg p-8 text-center">
            No quizzes found.
          </div>
        ) : (
          (() => {
            const grouped: Record<string, Record<string, QuizRow[]>> = {};

            quizzes.forEach((q) => {
              const unitKey = q.unit || 'No Unit';
              const parts = q.title.split(' - ');
              const topicKey = parts[1] || 'General';
              const testName = parts[2] || q.title;

              if (!grouped[unitKey]) grouped[unitKey] = {};
              if (!grouped[unitKey][topicKey]) grouped[unitKey][topicKey] = [];

              grouped[unitKey][topicKey].push({
                ...q,
                title: testName,
              });
            });

            return (
              <div className="space-y-6">
                {Object.entries(grouped).map(([unitKey, topics]) => (
                  <div key={unitKey}>
                    <h2 className="text-2xl font-extrabold mb-3">{unitKey}</h2>

                    <div className="space-y-4">
                      {Object.entries(topics).map(([topicKey, tests]) => (
                        <div
                          key={topicKey}
                          className="bg-yellow-50 border border-black rounded-xl p-4"
                        >
                          <h3 className="text-lg font-bold mb-3">{topicKey}</h3>

                          <div className="space-y-2">
                            {tests.map((q) => (
                              <div
                                key={q.id}
                                className="flex items-center justify-between border border-black rounded-lg p-3 bg-white"
                              >
                                <div>
                                  <div className="font-bold">{q.title}</div>
                                  <div className="text-xs">
                                    Level: <b>{q.level ?? '-'}</b> • Class: <b>{q.class_name ?? '-'}</b> • Time:{' '}
                                    <b>{q.time_limit_minutes ?? 10} min</b> • ID #{q.id}
                                  </div>
                                </div>

                                <button
                                  onClick={() => deleteQuiz(q.id)}
                                  className="px-3 py-2 rounded-lg border border-black bg-red-100 hover:bg-red-200 transition font-bold"
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        )}

        <p className="text-xs opacity-80 mt-4">
          Note: If you want deleting a quiz to also delete its questions, we can add cascade in DB later.
        </p>
      </div>
    </div>
  );
}