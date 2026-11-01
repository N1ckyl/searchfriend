import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'SearchFriend 🎁 - Secret Santa & Anonymous Gift Delivery',
  description:
    'Web app to notify Secret Santa gift deliveries 100% anonymously with centralized WhatsApp alerts.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-rose-500 selection:text-white">
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
