import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Аналитика руководства — мониторинг качества",
  description: "Мониторинг качества обучения, рейтинги и экзамены 30 джуз.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
