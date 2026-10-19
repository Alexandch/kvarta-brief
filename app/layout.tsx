import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Кварта — кофе свежей обжарки в Минске",
  description:
    "Свежая обжарка небольшими партиями, зерно для дома и офиса. Закажите кофе из Эфиопии, Колумбии или Бразилии с доставкой по Минску.",
  openGraph: {
    title: "Кварта — кофе, которому нужно немного времени",
    description: "Обжариваем в Минске с 2019 года. Свежие зерна и подписка с бесплатной доставкой.",
    locale: "ru_BY",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f2f0e8",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
