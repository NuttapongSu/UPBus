import type { Metadata, Viewport } from 'next';
import { Kanit } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';

const kanit = Kanit({ subsets: ['latin'], weight: ['300', '400', '600', '700'] });

export const metadata: Metadata = {
  title: 'UP Smart Transit',
  description: 'ระบบขนส่งอัจฉริยะเพื่อมหาวิทยาลัยสีเขียว',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${kanit.className} bg-[#0a0a14] text-white`}>{children}</body>
    </html>
  );
}
