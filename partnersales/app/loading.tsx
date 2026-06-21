export default function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, minHeight: "50vh" }}>
      <div className="ps-spinner" />
      <div className="h-section">読み込み中…</div>
    </div>
  );
}
