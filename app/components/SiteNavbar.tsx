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
  const [mobileOpen, setMobileOpen] = useState(false);

  const [openMain, setOpenMain] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);

 useEffect(() => {
  const applyUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setRole("guest");
      setUsername("");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, username")
      .eq("id", session.user.id)
      .single();

    if (!profile) {
      setRole("student");
      setUsername(session.user.email || "");
      return;
    }

    setRole(profile.role === "admin" ? "admin" : "student");
    setUsername(profile.username || session.user.email || "");
  };

  applyUser();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => {
    applyUser();
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("student_id");
    localStorage.removeItem("is_admin");
    localStorage.removeItem("admin_email");
    window.location.href = "/";
  };

  const guestMenu: MenuItem[] = [
    { key: "home", label: "Ana Sayfa", href: "/" },
    { key: "announcements", label: "Duyurular", href: "/#announcements" },
    { key: "daily-words", label: "Günün Kelimeleri", href: "/#daily-words" },
    { key: "daily-texts", label: "Günün Metni", href: "/#daily-texts" },
    { key: "activities", label: "Etkinlikler", href: "/#activities" },
  ];

  const studentMenu: MenuItem[] = [
    { key: "home", label: "Ana Sayfa", href: "/" },
    { key: "announcements", label: "Duyurular", href: "/#announcements" },
    { key: "daily-words", label: "Günün Kelimeleri", href: "/#daily-words" },
    { key: "daily-texts", label: "Günün Metni", href: "/#daily-texts" },
    { key: "activities", label: "Etkinlikler", href: "/#activities" },
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

  const adminMenu: MenuItem[] = [
    { key: "home", label: "Ana Sayfa", href: "/" },
    { key: "announcements", label: "Duyurular", href: "/#announcements" },
    { key: "daily-words", label: "Günün Kelimeleri", href: "/#daily-words" },
    { key: "daily-texts", label: "Günün Metni", href: "/#daily-texts" },
    { key: "activities", label: "Etkinlikler", href: "/#activities" },
    {
      key: "admin",
      label: "Admin",
      children: [
        { key: "admin-overview", label: "Overview", href: "/admin" },
        { key: "admin-users", label: "Students", href: "/admin/users" },
        { key: "admin-quizzes", label: "Quizzes", href: "/admin/quizzes" },
        { key: "admin-worksheets", label: "Worksheets", href: "/admin/worksheets" },
      ],
    },
    {
      key: "student-view",
      label: "Student View",
      children: [
        { key: "dashboard", label: "Dashboard", href: "/dashboard" },
        { key: "leaderboard", label: "Leaderboard", href: "/leaderboard" },
        { key: "worksheets", label: "Worksheets", href: "/worksheets" },
      ],
    },
  ];

  const navItems =
    role === "guest" ? guestMenu : role === "admin" ? adminMenu : studentMenu;

  const accountItems = useMemo<MenuItem[]>(() => {
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-white/95 backdrop-blur">
      <div className="w-full px-4 py-4 md:max-w-7xl md:mx-auto">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-4 shrink-0">
            <Image
              src="/logo.svg"
              alt="English Time"
              width={170}
              height={56}
              className="h-12 w-auto object-contain"
              priority
            />
          </Link>

          <div className="hidden xl:flex items-center gap-2">
            <nav className="flex items-center gap-1 rounded-full border border-black/10 bg-[#fffdf4] px-2 py-2 shadow-sm">
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
              {accountItems.map((item) =>
                item.href ? (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={accountButtonClass(pathname === item.href, item.label === "Login")}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.key}
                    onClick={item.action}
                    className="rounded-full bg-black px-5 py-3 text-sm font-bold text-yellow-300 transition hover:bg-gray-800"
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>
          </div>

          <button
            className="xl:hidden rounded-xl border border-black px-4 py-2 font-semibold"
            onClick={() => setMobileOpen((v) => !v)}
          >
            Menü
          </button>
        </div>

        {mobileOpen ? (
          <div className="xl:hidden mt-4 rounded-2xl border border-black/10 bg-[#fffdf4] p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-2">
              {navItems.map((item) =>
                item.href ? (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={mobileLinkClass(pathname === item.href)}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <div key={item.key} className="rounded-xl border border-black/10 bg-white p-3">
                    <p className="mb-2 font-bold">{item.label}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {item.children?.map((child) =>
                        child.href ? (
                          <Link
                            key={child.key}
                            href={child.href}
                            className={mobileLinkClass(pathname === child.href)}
                          >
                            {child.label}
                          </Link>
                        ) : (
                          <button
                            key={child.key}
                            onClick={child.action}
                            className="rounded-xl border border-black/10 px-4 py-3 text-left font-medium hover:bg-yellow-50"
                          >
                            {child.label}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )
              )}

              <div className="mt-2 grid grid-cols-1 gap-2">
                {accountItems.map((item) =>
                  item.href ? (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={mobileLinkClass(pathname === item.href, item.label === "Login")}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      key={item.key}
                      onClick={item.action}
                      className="rounded-xl bg-black px-4 py-3 font-bold text-yellow-300"
                    >
                      {item.label}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
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
    item.children?.some((child) =>
      child.href ? pathname === child.href : child.children?.some((sub) => sub.href === pathname)
    ) ?? false;

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
        <div className="absolute left-0 top-full mt-2 min-w-[240px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl">
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
                  className={`block px-5 py-4 text-sm transition hover:bg-yellow-50 ${
                    pathname === child.href ? "bg-yellow-100 font-bold" : ""
                  }`}
                >
                  {child.label}
                </Link>
              ) : child.children ? (
                <button
                  type="button"
                  className={`block w-full px-5 py-4 text-left text-sm transition hover:bg-yellow-50 ${
                    child.children.some((sub) => sub.href === pathname) ? "bg-yellow-100 font-bold" : ""
                  }`}
                >
                  {child.label}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={child.action}
                  className="block w-full px-5 py-4 text-left text-sm transition hover:bg-yellow-50"
                >
                  {child.label}
                </button>
              )}

              {child.children && openSub === child.key ? (
                <div className="absolute left-full top-0 ml-2 min-w-[220px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl">
                  {child.children.map((sub) => (
                    <Link
                      key={sub.key}
                      href={sub.href || "#"}
                      className={`block px-5 py-4 text-sm transition hover:bg-yellow-50 ${
                        pathname === sub.href ? "bg-yellow-100 font-bold" : ""
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
      ? "bg-[#e2b236] text-black shadow-sm"
      : "text-black/80 hover:bg-yellow-50 hover:text-black",
  ].join(" ");
}

function accountButtonClass(active: boolean, isLogin = false) {
  if (isLogin) {
    return [
      "rounded-full px-5 py-3 text-sm font-bold transition",
      active
        ? "bg-[#e2b236] text-black border border-transparent"
        : "border border-black/15 bg-white hover:bg-yellow-50",
    ].join(" ");
  }

  return [
    "rounded-full px-5 py-3 text-sm font-semibold transition",
    active
      ? "bg-[#e2b236] text-black"
      : "border border-black/15 bg-white hover:bg-yellow-50",
  ].join(" ");
}

function mobileLinkClass(active: boolean, highlighted = false) {
  return [
    "rounded-xl px-4 py-3 font-medium transition",
    highlighted
      ? active
        ? "bg-[#e2b236] text-black font-bold"
        : "border border-black/10 bg-white hover:bg-yellow-50"
      : active
      ? "bg-[#e2b236] text-black font-bold"
      : "border border-black/10 bg-white hover:bg-yellow-50",
  ].join(" ");
}