"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type Role = "guest" | "student" | "admin";

type MenuItem = {
  key: string;
  label: string;
  href?: string;
  action?: () => void;
  children?: MenuItem[];
};

export default function SiteNavbar() {
  const pathname = usePathname();

  const [role, setRole] = useState<Role>("guest");
  const [username, setUsername] = useState("");
  const [theme, setTheme] = useState("yellow");
  const [mobileOpen, setMobileOpen] = useState(false);

  const [openMain, setOpenMain] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [openAccount, setOpenAccount] = useState(false);

  useEffect(() => {
    const applyUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setRole("guest");
        setUsername("");
        setTheme("yellow");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, username, theme")
        .eq("id", session.user.id)
        .single();

      if (!profile) {
        setRole("student");
        setUsername(session.user.email || "");
        setTheme("yellow");
        return;
      }

      setRole(profile.role === "admin" ? "admin" : "student");
      setUsername(profile.username || session.user.email || "");
      setTheme(profile.theme || "yellow");
    };

    applyUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      applyUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("student_id");
    localStorage.removeItem("is_admin");
    localStorage.removeItem("admin_email");
    document.body.setAttribute("data-theme", "yellow");
    window.location.href = "/";
  };

  const publicItems: MenuItem[] = [
    { key: "home", label: "Home", href: "/" },
    { key: "announcements", label: "Announcements", href: "/#announcements" },
    { key: "daily-words", label: "Word of the Day", href: "/#daily-words" },
    { key: "daily-texts", label: "Daily Reading", href: "/#daily-texts" },
    { key: "activities", label: "Activities", href: "/#activities" },
  ];

  const studentItems: MenuItem[] = [
    ...publicItems,
    {
      key: "learning",
      label: "Learning",
      children: [
        { key: "dashboard", label: "Dashboard", href: "/dashboard" },
        { key: "take-test", label: "Take Test", href: "/take-test" },
        { key: "history", label: "History", href: "/history" },
        { key: "progress", label: "Progress", href: "/progress" },
      ],
    },
    {
      key: "resources",
      label: "Resources",
      children: [
        { key: "leaderboard", label: "Leaderboard", href: "/leaderboard" },
        { key: "worksheets", label: "Worksheets", href: "/worksheets" },
      ],
    },
  ];

  const adminItems: MenuItem[] = [
    ...publicItems,
    {
      key: "admin",
      label: "Admin",
      children: [
        { key: "admin-home", label: "Overview", href: "/admin" },
        { key: "admin-quizzes", label: "Quizzes", href: "/admin/quizzes" },
        { key: "admin-questions", label: "Questions", href: "/admin/questions" },
        { key: "admin-classes", label: "Classes", href: "/admin/classes" },
        { key: "admin-users", label: "Students", href: "/admin/users" },
        { key: "admin-worksheets", label: "Worksheets", href: "/admin/worksheets" },
        { key: "admin-reading-texts", label: "Reading Texts", href: "/admin/reading-texts" },
        { key: "admin-leaderboard", label: "Leaderboard", href: "/admin/leaderboard" },
        { key: "admin-tools", label: "Tools", href: "/admin/tools" },
      ],
    },
    {
      key: "student-view",
      label: "Student View",
      children: [
        { key: "dashboard", label: "Dashboard", href: "/dashboard" },
        { key: "take-test", label: "Take Test", href: "/take-test" },
        { key: "history", label: "History", href: "/history" },
        { key: "progress", label: "Progress", href: "/progress" },
        { key: "leaderboard", label: "Leaderboard", href: "/leaderboard" },
        { key: "worksheets", label: "Worksheets", href: "/worksheets" },
      ],
    },
  ];

  const navItems =
    role === "guest" ? publicItems : role === "admin" ? adminItems : studentItems;

  const mobileAccountItems = useMemo<MenuItem[]>(() => {
    if (role === "guest") {
      return [{ key: "login", label: "Login", href: "/login" }];
    }

    if (role === "admin") {
      return [
        { key: "admin-panel", label: "Admin Panel", href: "/admin" },
        { key: "change-password", label: "Change Password", href: "/change-password" },
        { key: "logout", label: "Logout", action: logout },
      ];
    }

    return [
      { key: "change-password", label: "Change Password", href: "/change-password" },
      { key: "logout", label: "Logout", action: logout },
    ];
  }, [role]);

  const initial = username?.trim()?.charAt(0)?.toUpperCase() || "U";

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#d7cfbe] bg-[#fffdf7]">
        <div className="w-full px-4 py-4 md:max-w-7xl md:mx-auto">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <Image
                src="/logo.svg"
                alt="English Time"
                width={170}
                height={56}
                className="h-12 w-auto object-contain"
                priority
              />
            </Link>

            <div className="hidden xl:flex items-center gap-3">
              <nav className="flex items-center gap-1 rounded-full border border-[#d7cfbe] bg-white px-2 py-2 shadow-sm">
                {navItems.map((item) => (
                  <DesktopNavItem
                    key={item.key}
                    item={item}
                    pathname={pathname}
                    openMain={openMain}
                    setOpenMain={setOpenMain}
                    openSub={openSub}
                    setOpenSub={setOpenSub}
                  />
                ))}
              </nav>

              <div className="flex items-center gap-2">
                {role === "guest" ? (
                  <Link
                    href="/login"
                    className={accountButtonClass(pathname === "/login", true)}
                  >
                    Login
                  </Link>
                ) : (
                  <div
                    className="relative"
                    onMouseEnter={() => setOpenAccount(true)}
                    onMouseLeave={() => setOpenAccount(false)}
                  >
                    <button
                      type="button"
                      className="flex items-center gap-3 rounded-full border border-[#d7cfbe] bg-white px-3 py-2 shadow-sm hover:bg-[#f5e7b8] transition"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e0b33a] text-black text-sm font-bold">
                        {initial}
                      </div>
                      <div className="text-left leading-tight">
                        <div className="text-sm font-semibold text-[#2b2b2b] max-w-[120px] truncate">
                          {username}
                        </div>
                        <div className="text-xs text-[#6b6248]">
                          {role === "admin" ? "Admin" : "Student"}
                        </div>
                      </div>
                    </button>

                    {openAccount ? (
                      <div className="absolute right-0 top-full min-w-[220px] overflow-hidden rounded-2xl border border-[#d7cfbe] bg-[#fffdf7] shadow-xl">
                        <Link
                          href="/dashboard"
                          className={`block px-5 py-4 text-sm text-[#222222] transition hover:bg-[#f5e7b8] ${
                            pathname === "/dashboard" ? "bg-[#e0b33a] font-bold text-black" : ""
                          }`}
                        >
                          Profile
                        </Link>

                        <Link
                          href="/change-password"
                          className={`block px-5 py-4 text-sm text-[#222222] transition hover:bg-[#f5e7b8] ${
                            pathname === "/change-password"
                              ? "bg-[#e0b33a] font-bold text-black"
                              : ""
                          }`}
                        >
                          Change Password
                        </Link>

                        <button
                          onClick={logout}
                          className="block w-full px-5 py-4 text-left text-sm font-bold text-[#222222] transition hover:bg-[#f5e7b8]"
                        >
                          Logout
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <button
              className="xl:hidden rounded-xl border border-black px-4 py-2 font-semibold bg-white text-black"
              onClick={() => setMobileOpen(true)}
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      <div
        className={`xl:hidden fixed inset-0 z-[999] transition ${
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/35 transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />

        <div
          className={`absolute right-0 top-0 h-full w-full max-w-[420px] bg-[#fffdf7] shadow-2xl border-l border-[#d7cfbe] transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-[#d7cfbe] px-5 py-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.svg"
                  alt="English Time"
                  width={150}
                  height={48}
                  className="h-10 w-auto object-contain"
                />
              </div>

              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-black px-4 py-2 font-semibold bg-white text-black"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <div className="grid grid-cols-1 gap-3">
                {navItems.map((item) =>
                  item.href ? (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={mobileLinkClass(pathname === item.href)}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <div
                      key={item.key}
                      className="rounded-2xl border border-[#d7cfbe] bg-[#f7f1e3] p-3"
                    >
                      <p className="mb-3 px-2 text-sm font-bold text-[#6b6248]">
                        {item.label}
                      </p>

                      <div className="grid grid-cols-1 gap-2">
                        {item.children?.map((child) =>
                          child.href ? (
                            <Link
                              key={child.key}
                              href={child.href}
                              className={mobileLinkClass(pathname === child.href)}
                              onClick={() => setMobileOpen(false)}
                            >
                              {child.label}
                            </Link>
                          ) : (
                            <button
                              key={child.key}
                              onClick={() => {
                                child.action?.();
                                setMobileOpen(false);
                              }}
                              className="rounded-2xl border border-[#d7cfbe] bg-white px-4 py-3 text-left font-medium text-black hover:bg-[#f5e7b8]"
                            >
                              {child.label}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}

                <div className="mt-1 grid grid-cols-1 gap-2">
                  {role !== "guest" && username ? (
                    <div className="rounded-2xl border border-[#d7cfbe] bg-white px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e0b33a] text-black text-sm font-bold">
                          {initial}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#2b2b2b]">
                            {username}
                          </div>
                          <div className="text-xs text-[#6b6248]">
                            {role === "admin" ? "Admin" : "Student"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {mobileAccountItems.map((item) =>
                    item.href ? (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={mobileAccountClass(
                          pathname === item.href,
                          item.label === "Login"
                        )}
                        onClick={() => setMobileOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <button
                        key={item.key}
                        onClick={() => {
                          item.action?.();
                          setMobileOpen(false);
                        }}
                        className="rounded-2xl bg-black px-4 py-3 font-bold text-yellow-300"
                      >
                        {item.label}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DesktopNavItem({
  item,
  pathname,
  openMain,
  setOpenMain,
  openSub,
  setOpenSub,
}: {
  item: MenuItem;
  pathname: string;
  openMain: string | null;
  setOpenMain: (v: string | null) => void;
  openSub: string | null;
  setOpenSub: (v: string | null) => void;
}) {
  const hasActiveChild =
    item.children?.some((child) => child.href && pathname === child.href) ?? false;

  const active = item.href ? pathname === item.href : hasActiveChild;

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpenMain(item.key)}
      onMouseLeave={() => {
        setOpenMain(null);
        setOpenSub(null);
      }}
    >
      {item.href ? (
        <Link href={item.href} className={desktopLinkClass(active)}>
          {item.label}
        </Link>
      ) : (
        <button type="button" className={desktopLinkClass(active)}>
          {item.label}
        </button>
      )}

      {item.children && openMain === item.key ? (
        <div className="absolute left-0 top-full min-w-[260px] overflow-hidden rounded-2xl border border-[#d7cfbe] bg-[#fffdf7] shadow-xl">
          {item.children.map((child) => (
            <div
              key={child.key}
              className="relative"
              onMouseEnter={() => setOpenSub(child.key)}
              onMouseLeave={() => setOpenSub(null)}
            >
              {child.href ? (
                <Link
                  href={child.href}
                  className={`block px-5 py-4 text-sm text-[#222222] transition hover:bg-[#f5e7b8] ${
                    pathname === child.href ? "bg-[#e0b33a] font-bold text-black" : ""
                  }`}
                >
                  {child.label}
                </Link>
              ) : child.children ? (
                <button
                  type="button"
                  className={`block w-full px-5 py-4 text-left text-sm text-[#222222] transition hover:bg-[#f5e7b8] ${
                    child.children.some((sub) => sub.href === pathname)
                      ? "bg-[#e0b33a] font-bold text-black"
                      : ""
                  }`}
                >
                  {child.label}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={child.action}
                  className="block w-full px-5 py-4 text-left text-sm text-[#222222] transition hover:bg-[#f5e7b8]"
                >
                  {child.label}
                </button>
              )}

              {child.children && openSub === child.key ? (
                <div className="absolute left-full top-0 min-w-[240px] overflow-hidden rounded-2xl border border-[#d7cfbe] bg-[#fffdf7] shadow-xl">
                  {child.children.map((sub) => (
                    <Link
                      key={sub.key}
                      href={sub.href || "#"}
                      className={`block px-5 py-4 text-sm text-[#222222] transition hover:bg-[#f5e7b8] ${
                        pathname === sub.href ? "bg-[#e0b33a] font-bold text-black" : ""
                      }`}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function desktopLinkClass(active: boolean) {
  return [
    "rounded-full px-4 py-3 text-sm font-medium transition",
    active
      ? "bg-[#e0b33a] text-black shadow-sm"
      : "text-[#222222] hover:bg-[#f5e7b8]",
  ].join(" ");
}

function accountButtonClass(active: boolean, isLogin = false) {
  if (isLogin) {
    return [
      "rounded-full px-5 py-3 text-sm font-bold transition",
      active
        ? "bg-[#e0b33a] text-black"
        : "border border-[#d7cfbe] bg-white text-black hover:bg-[#f5e7b8]",
    ].join(" ");
  }

  return [
    "rounded-full px-5 py-3 text-sm font-semibold transition",
    active
      ? "bg-[#e0b33a] text-black"
      : "border border-[#d7cfbe] bg-white text-black hover:bg-[#f5e7b8]",
  ].join(" ");
}

function mobileLinkClass(active: boolean) {
  return [
    "rounded-2xl px-4 py-4 font-semibold transition border text-[18px]",
    active
      ? "bg-[#e0b33a] text-black border-[#cfa12b]"
      : "bg-white text-[#222222] border-[#d7cfbe] hover:bg-[#f5e7b8]",
  ].join(" ");
}

function mobileAccountClass(active: boolean, isLogin = false) {
  if (isLogin) {
    return [
      "rounded-2xl px-4 py-4 text-center font-bold transition border text-[18px]",
      active
        ? "bg-[#e0b33a] text-black border-[#cfa12b]"
        : "bg-white text-[#222222] border-[#d7cfbe] hover:bg-[#f5e7b8]",
    ].join(" ");
  }

  return [
    "rounded-2xl px-4 py-4 text-center font-semibold transition border text-[18px]",
    active
      ? "bg-[#e0b33a] text-black border-[#cfa12b]"
      : "bg-white text-[#222222] border-[#d7cfbe] hover:bg-[#f5e7b8]",
  ].join(" ");
}