import { useEffect } from "react";
import { Link } from "wouter";
import logoMark from "../../assets/logo-mark.png";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    window.scrollTo(0, 0);
    const prev = document.title;
    document.title = `${title} — RelateIQ+`;
    return () => {
      document.title = prev;
    };
  }, [title]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-white/30 selection:text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 py-4 px-6 backdrop-blur-md bg-background/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src={logoMark} alt="RelateIQ+ Logo" className="w-8 h-8 rounded" />
            <span className="text-xl font-bold tracking-tight">RelateIQ+</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            Back to home
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6">
        <article className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight mb-2">{title}</h1>
          <p className="text-muted-foreground text-sm mb-10">Last updated: {updated}</p>
          <div className="space-y-8 text-white/80 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_p+p]:mt-3">
            {children}
          </div>
        </article>
      </main>

      <footer className="py-12 border-t border-white/10 bg-background">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoMark} alt="RelateIQ+ Logo" className="w-6 h-6 rounded" />
            <span className="font-semibold tracking-tight text-white/80">RelateIQ+</span>
          </div>
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} RelateIQ+. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
