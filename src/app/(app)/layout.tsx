import { requireUser } from "@/auth/session";
import { DemoBanner } from "@/components/app/demo-banner";
import { Sidebar } from "@/components/app/sidebar";
import { getDb, withUser } from "@/db/client";
import { maybeCleanDemos } from "@/services/demo-visits";
import { listPrograms } from "@/services/programs";

export const dynamic = "force-dynamic";

/**
 * The frame of every signed-in page: a fixed sidebar with the programmes
 * and their views, and the page beside it. The same on every page, so
 * nobody has to look for the way around; what is inside is shaped by each
 * page for its own job.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const programs = await withUser(user.id, (tx) => listPrograms(tx, user.id));
  // On a demo installation, visits whose time is up go while others use it.
  void maybeCleanDemos(getDb()).catch(() => undefined);
  const demo = user.demoExpiresAt;
  return (
    <div className="grid min-h-screen grid-cols-[15rem_minmax(0,1fr)] print:block">
      <aside className="sticky top-0 h-screen print:hidden">
        <Sidebar
          programs={programs.map((p) => ({ id: p.id, name: p.name }))}
          user={{ name: user.name, email: demo === null ? user.email : "" }}
        />
      </aside>
      <main id="content" className="min-w-0 px-8 pb-12 print:p-0">
        {demo !== null && <DemoBanner expiresAt={demo} />}
        {children}
      </main>
    </div>
  );
}
