import type { Metadata } from 'next';
import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'SniperBoard — Precision Signal Dashboard',
  description: "Livermore · O'Neil · Minervini 전략 기반 미국 주식 스윙 트레이딩 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeInitScript = `
    (function() {
      try {
        var t = localStorage.getItem('sb_theme') || 'dark';
        document.documentElement.dataset.theme = t;
      } catch(e) {}
    })();
  `;
  return (
    <html lang="ko" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
