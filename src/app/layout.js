import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Toggle from "@/components/Toggle";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Ranger.AI",
  description: "Tournament Point Calculator",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  const html = document.documentElement;
                  if (theme === 'light') {
                    html.classList.remove('dark');
                  } else {
                    html.classList.add('dark');
                  }
                } catch (e) {
                  // If localStorage fails, default to dark
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <div className="flex">
          <Sidebar />
          <div className="flex-1 ml-56">
            <Toggle />
            <main className="main-content p-4">
              <Providers>{children}</Providers>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
