"use client";

import Link from "next/link";

type ToolCardProps = {
  title: string;
  description: string;
  href: string;
  badge?: string;
};

function ToolCard({ title, description, href, badge }: ToolCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-black bg-yellow-50 p-5 transition hover:-translate-y-0.5 hover:bg-yellow-200"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold">{title}</h3>
        {badge ? (
          <span className="rounded-full border border-black bg-yellow-300 px-3 py-1 text-xs font-bold">
            {badge}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm opacity-80">{description}</p>

      <div className="mt-4 inline-flex rounded-lg border border-black bg-black px-3 py-2 text-sm font-bold text-yellow-300">
        Open →
      </div>
    </Link>
  );
}

export default function AdminToolsPage() {
  return (
    <div className="min-h-screen bg-yellow-300 text-black">
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <section className="rounded-3xl border border-black bg-yellow-100 p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.2em] opacity-70 mb-3">
            English Time
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold">Admin Tools</h1>
          <p className="mt-3 text-sm md:text-base opacity-80 max-w-3xl">
            Use these shortcuts to manage analytics, student data, quizzes, and
            course content more quickly.
          </p>
        </section>

        <section className="rounded-3xl border border-black bg-yellow-100 p-6">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Analytics & Monitoring</h2>
            <p className="text-sm opacity-80 mt-1">
              Review course performance and identify weak areas faster.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <ToolCard
              title="Quiz Insights"
              description="See the most missed questions, student mistakes, and score summaries for each quiz."
              href="/admin/quiz-insights"
              badge="Active"
            />

            <ToolCard
              title="Leaderboard"
              description="Check rankings and compare overall class performance across quizzes."
              href="/admin/leaderboard"
            />

            <ToolCard
              title="Students"
              description="Review student accounts, status, assigned levels, and class organization."
              href="/admin/users"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-black bg-yellow-100 p-6">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Content Management</h2>
            <p className="text-sm opacity-80 mt-1">
              Create and update all learning materials from one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <ToolCard
              title="Homepage Content"
              description="Edit the What's Happening Today cards shown on the homepage."
              href="/admin/tools/homepage-content"
              badge="New"
            />

            <ToolCard
              title="Quizzes"
              description="Create quizzes, set target level and class, and manage published tests."
              href="/admin/quizzes"
            />

            <ToolCard
              title="Questions"
              description="Add, edit, and organize quiz questions and answer choices."
              href="/admin/questions"
            />

            <ToolCard
              title="Worksheets"
              description="Upload worksheet PDFs and manage class-based worksheet access."
              href="/admin/worksheets"
            />

            <ToolCard
              title="Reading Texts"
              description="Manage daily reading passages and level-based reading content."
              href="/admin/reading-texts"
            />

            <ToolCard
              title="Classes"
              description="Create and organize class groups for students and content targeting."
              href="/admin/classes"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-black bg-yellow-100 p-6">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Quick Actions</h2>
            <p className="text-sm opacity-80 mt-1">
              Fast shortcuts for common admin tasks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <ToolCard
              title="Create Student"
              description="Open the student management page and add a new student with level and class."
              href="/admin/users"
            />

            <ToolCard
              title="Create Quiz"
              description="Jump directly to quiz creation and prepare a new test quickly."
              href="/admin/quizzes"
            />

            <ToolCard
              title="Add Questions"
              description="Open the questions page and start adding items to an existing quiz."
              href="/admin/questions"
            />

            <ToolCard
              title="Upload Worksheet"
              description="Go to the worksheet page and upload a new PDF for a selected class."
              href="/admin/worksheets"
            />

            <ToolCard
              title="Manage Readings"
              description="Open reading management and edit level-based reading content."
              href="/admin/reading-texts"
            />

            <ToolCard
              title="Student View"
              description="Switch to the student-facing pages and test the learning flow."
              href="/dashboard"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-black bg-yellow-100 p-6">
          <h2 className="text-2xl font-bold mb-3">Suggested Next Upgrades</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-black bg-yellow-50 p-4">
              <div className="font-bold">CSV Export</div>
              <p className="text-sm opacity-80 mt-2">
                Export quiz results and mistake reports for teachers.
              </p>
            </div>

            <div className="rounded-2xl border border-black bg-yellow-50 p-4">
              <div className="font-bold">Difficulty Labels</div>
              <p className="text-sm opacity-80 mt-2">
                Mark questions as easy, medium, or hard based on wrong-answer rate.
              </p>
            </div>

            <div className="rounded-2xl border border-black bg-yellow-50 p-4">
              <div className="font-bold">Bulk Question Import</div>
              <p className="text-sm opacity-80 mt-2">
                Convert pasted tests or PDFs into quiz questions faster.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}