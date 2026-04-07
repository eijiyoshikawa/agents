export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface py-8 text-center text-sm text-muted">
      <div className="mx-auto max-w-6xl px-6">
        <p>&copy; {new Date().getFullYear()} 建設業 x AI 活用事例集</p>
      </div>
    </footer>
  );
}
