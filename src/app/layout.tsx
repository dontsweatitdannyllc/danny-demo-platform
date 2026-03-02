import type { ReactNode } from 'react';

export const metadata = {
  title: 'Dont Sweat It Danny — Demo Platform',
  description: 'Paywalled demo platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'ui-sans-serif, system-ui', margin: 0 }}>{children}</body>
    </html>
  );
}
