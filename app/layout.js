import './globals.css';

export const metadata = {
  title: 'InsightForge AI',
  description: 'Generate a personalized career growth report with Claude.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
