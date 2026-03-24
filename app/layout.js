import "./globals.css";

export const metadata = {
  title: "Jon's Todo Board",
  description: "Personal Kanban board synced with Claude Cowork",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: "#0d1117", color: "#e6edf3" }}>
        {children}
      </body>
    </html>
  );
}
