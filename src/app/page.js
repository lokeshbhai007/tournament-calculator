import { Play } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="max-h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="p-4 sm:px-6">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Home</h2>
      </div>
                    
      {/* Main Content - Centered within the available space */}
      <div className="flex items-center justify-center px-4" style={{ height: 'calc(90vh - 80px)' }}>
        <div className="text-center max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4" style={{ color: 'var(--purple-primary)' }}>
            Tournament Point Calculator
          </h1>
          <p className="text-sm md:text-base mb-4 md:mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Calculate match points, track tournament progress, and manage your esports <br /> 
            wallet all in one place.
          </p>
          <Link href="/ranger-modal">
            <button 
              className="font-medium py-2 px-3 rounded-lg flex items-center space-x-2 mx-auto transition-colors duration-200 cursor-pointer"
              style={{ 
                backgroundColor: 'var(--purple-primary)', 
                color: 'var(--text-primary)' 
              }}
              
            >
              <Play className="h-4 w-4" />
              <span className="text-sm">Get Started</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}