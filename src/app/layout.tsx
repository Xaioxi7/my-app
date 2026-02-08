// src/app/layout.tsx
import "./globals.css";
import Link from "next/link";

export const metadata = { title: "My App" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        {/* Top navigation */}
        <header className="sticky top-0 z-40 border-b border-neutral-200/60 bg-white/80 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3 text-sm">
            <Link href="/" className="font-semibold tracking-tight">My App</Link>
            <div className="flex items-center gap-4 text-neutral-600">
              <Link href="/chat" className="hover:text-black">Chat</Link>
              <Link href="/tasks" className="hover:text-black">Tasks</Link>
              <Link href="/skills" className="hover:text-black">Skills</Link>
              <Link href="/sharing" className="hover:text-black">Sharing</Link>
              <Link href="/double" className="hover:text-black">Double</Link>
              <Link href="/profile" className="hover:text-black">Profile</Link>
            </div>
          </nav>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
