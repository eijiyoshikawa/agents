export default function Spinner({ size = 40 }: { size?: number }) {
  return (
    <div
      className="rounded-full border-2 border-white/15 border-t-brand-glow animate-spin"
      style={{ width: size, height: size }}
      role="status"
      aria-label="読み込み中"
    />
  );
}
