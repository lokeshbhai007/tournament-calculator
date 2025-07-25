// app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Toggle from "@/components/Toggle";
import Providers from "./providers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Ranger.AI",
  description: "Tournament Point Calculator",
  icons: {
    icon: [
      {
        url: '/ranger-logo.svg',
        type: 'image/svg+xml',
      }
    ],
    shortcut: '/ranger-logo.svg',
    apple: '/ranger-logo.svg',
  },
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Additional favicon links for better browser support */}
        <link rel="icon" href="/ranger-logo.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/ranger-logo.svg" />
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
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers session={session}>
          <div className="flex">
            <Sidebar />
            <div className="flex-1 md:ml-56">
              <Toggle />
              <main className="main-content p-4">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}