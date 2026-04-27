export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">AI Interviewer</h1>
      <p className="mt-4 text-center text-slate-600">
        面接IDを受け取った候補者の方は、配布されたURLから面接ルームに進んでください。
      </p>
      <p className="mt-10 text-xs text-slate-400">
        Phase 1 scaffold — interview room and avatar session arrive in Phase 2.
      </p>
    </main>
  );
}
