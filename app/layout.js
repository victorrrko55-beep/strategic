import "./globals.css";

export const metadata = {
  title: "Strategic Workflow Platform",
  description: "AI-Powered Strategic Planning and Validation Command Center",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
