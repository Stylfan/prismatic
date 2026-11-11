"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ChartLine,
  ChevronRight,
  GanttChart,
  LayoutDashboard,
  ListTree,
  Plus,
  Presentation,
  Settings2,
  UserRound,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/cn";

/**
 * The frame's left side, the same on every page: the programmes, and under
 * the open one its views. The current page is marked by eye and for screen
 * readers. The account sits at the bottom, out of the way.
 */

const VIEWS = [
  { key: "overview", path: "", icon: LayoutDashboard },
  { key: "roadmap", path: "/roadmap", icon: GanttChart },
  { key: "backlog", path: "/backlog", icon: ListTree },
  { key: "forecast", path: "/forecast", icon: ChartLine },
  { key: "risks", path: "/risks", icon: AlertTriangle },
  { key: "report", path: "/report", icon: Presentation },
  { key: "setup", path: "/setup", icon: Settings2 },
] as const;

const item =
  "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors hover:bg-surface/70 hover:text-ink";

export function Sidebar({
  programs,
  user,
}: {
  programs: { id: string; name: string }[];
  user: { name: string; email: string };
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const openId = pathname.match(/^\/programs\/([^/]+)/)?.[1];

  return (
    <nav
      aria-label={t("label")}
      className="flex h-full flex-col gap-4 overflow-y-auto border-r border-hairline bg-sidebar px-3 py-4"
    >
      <Link href="/" className="flex items-center gap-2.5 px-2.5 text-ink" aria-label={t("home")}>
        <svg width="22" height="22" viewBox="0 0 28 28" aria-hidden="true">
          <circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M14 7 L20.5 19 H7.5 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="14" cy="15" r="2.4" fill="var(--color-bronze)" />
        </svg>
        <span className="text-[14px] font-semibold tracking-[0.04em]">Prismatic</span>
      </Link>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between px-2.5 pb-1">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase hover:text-ink"
          >
            {t("programs")}
          </Link>
          <Link
            href="/programs/new"
            className="rounded p-0.5 text-slate hover:bg-surface hover:text-ink"
            aria-label={t("newProgram")}
            title={t("newProgram")}
          >
            <Plus className="size-4" aria-hidden />
          </Link>
        </div>
        {programs.map((p) => {
          const open = p.id === openId;
          const base = `/programs/${p.id}`;
          return (
            <div key={p.id} className="flex flex-col gap-0.5">
              <Link
                href={base}
                className={cn(item, "font-medium", open ? "text-ink" : "text-slate")}
              >
                <ChevronRight
                  className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")}
                  aria-hidden
                />
                <span className="truncate">{p.name}</span>
              </Link>
              {open && (
                <ul className="ml-4 flex flex-col gap-0.5 border-l border-hairline pl-2">
                  {VIEWS.map(({ key, path, icon: Icon }) => {
                    const href = base + path;
                    const active =
                      path === ""
                        ? pathname === base
                        : pathname === href || pathname.startsWith(`${href}/`);
                    return (
                      <li key={key}>
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            item,
                            active
                              ? "bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--color-hairline)]"
                              : "text-slate",
                          )}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          {t(key)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
        {programs.length === 0 && <p className="px-2.5 text-[13px] text-slate">{t("none")}</p>}
      </div>

      <div className="mt-auto flex flex-col gap-1 border-t border-hairline pt-3">
        <Link
          href="/account"
          aria-current={pathname.startsWith("/account") ? "page" : undefined}
          className={cn(
            item,
            pathname.startsWith("/account") ? "bg-surface text-ink" : "text-slate",
          )}
        >
          <UserRound className="size-4 shrink-0" aria-hidden />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-medium text-ink">{user.name || user.email}</span>
          </span>
        </Link>
        <div className="px-1">
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
