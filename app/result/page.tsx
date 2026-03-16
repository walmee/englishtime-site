'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ResultContent() {
  const sp = useSearchParams();

  const score = sp.get('score') ?? '0';
  const correct = sp.get('correct') ?? '0';
  const total = sp.get('total') ?? '0';
  const quiz = sp.get('quiz') ?? '-';

  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <header className="border-b border-black bg-yellow-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Language Learning</h1>

          <nav className="flex gap-3">
            <Link className="px-4 py-2 border border-black rounded-lg bg-yellow-300" href="/dashboard">
              Dashboard
            </Link>
            <Link className="px-4 py-2 border border-black rounded-lg bg-yellow-300" href="/take-test">
              Take Test
            </Link>
            <Link className="px-4 py-2 border border-black rounded-lg bg-yellow-300" href="/history">
              History
            </Link>
            <Link className="px-4 py-2 border border-black rounded-lg bg-yellow-300" href="/progress">
              Progress
            </Link>
            <Link className="px-4 py-2 border border-black rounded-lg bg-yellow-300" href="/leaderboard">
              Leaderboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold mb-2">Result</h2>
        <p className="mb-8">
          Quiz ID: <b>{quiz}</b>
        </p>

        <div className="bg-yellow-100 border border-black rounded-xl p-6">
          <p className="text-xl font-bold mb-3">Your Score</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-yellow-200 border border-black rounded-lg p-4">
              <p className="font-semibold">Score</p>
              <p className="text-3xl font-bold">{score}%</p>
            </div>

            <div className="bg-yellow-200 border border-black rounded-lg p-4">
              <p className="font-semibold">Correct</p>
              <p className="text-3xl font-bold">{correct}</p>
            </div>

            <div className="bg-yellow-200 border border-black rounded-lg p-4">
              <p className="font-semibold">Total</p>
              <p className="text-3xl font-bold">{total}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              href="/take-test"
              className="px-5 py-3 bg-black text-yellow-300 font-bold rounded-lg hover:bg-gray-800 transition"
            >
              Take another test →
            </Link>

            <Link
              href="/dashboard"
              className="px-5 py-3 border border-black rounded-lg bg-yellow-200 hover:bg-yellow-300 transition"
            >
              Back to dashboard
            </Link>
          </div>

          <p className="mt-4 text-sm opacity-80">
            Next step: We can add “Review answers” here (show wrong questions after finishing).
          </p>
        </div>
      </main>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-yellow-300 text-black p-6">Loading result...</div>}>
      <ResultContent />
    </Suspense>
  );
}