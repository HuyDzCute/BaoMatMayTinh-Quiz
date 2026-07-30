import Header from "@/components/Header";

/**
 * Layout for /chat route — full height, no extra padding.
 * Uses `<Header />` để giữ navigation.
 */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        background: "#0b0f1a",
      }}
    >
      <Header />
      <main style={{ flex: 1, minHeight: 0, display: "flex" }}>{children}</main>
    </div>
  );
}
