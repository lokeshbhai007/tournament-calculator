// / Updated Home Component
import { Play } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div
      className=""
      style={{
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      {/* Header */}
      <div className="hidden sm:block p-4 sm:px-6 pt-16 md:pt-4">
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Home
        </h2>
      </div>

      {/* Main Content - Properly centered */}
      <div className="flex items-center justify-center min-h-[calc(90vh-80px)] md:min-h-[calc(90vh-80px)] px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl w-full">
          <h1
            className="text-4xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 md:mb-8 leading-tight"
            style={{ color: "var(--purple-primary)" }}
          >
            Tournament Point Calculator
          </h1>
          <p
            className="text-base sm:text-lg md:text-xl mb-8 md:mb-10 leading-relaxed max-w-2xl mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            Calculate match points, track tournament progress, and manage your
            esports wallet all in one place.
          </p>
          <Link href="/ranger-modal">
            <button
              className="font-medium py-2 sm:py-2 px-2 sm:px-3 rounded-lg flex items-center space-x-3 mx-auto transition-all duration-200 cursor-pointer hover:opacity-90 hover:transform hover:scale-105 text-base sm:text-lg"
              style={{
                backgroundColor: "var(--purple-primary)",
                color: "var(--text-primary)",
              }}
            >
              <Play className="h-5 w-5 sm:h-6 sm:w-6" />
              <span>Get Started</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
