export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 flex items-center justify-center min-h-screen bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </main>
  );
}
