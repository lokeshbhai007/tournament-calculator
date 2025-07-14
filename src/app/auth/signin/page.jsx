// app/auth/signin/page.jsx

"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, Mail, Lock, Github } from "lucide-react";

export default function SignIn() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loadingStates, setLoadingStates] = useState({
    credentials: false,
    google: false,
    github: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingStates(prev => ({ ...prev, credentials: true }));

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
      } else if (result?.ok) {
        toast.success("Welcome! login successfull.");
        router.push("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoadingStates(prev => ({ ...prev, credentials: false }));
    }
  };

  const handleSocialSignIn = async (provider) => {
    try {
      setLoadingStates(prev => ({ ...prev, [provider]: true }));
      await signIn(provider, { callbackUrl: "/" });
    } catch (error) {
      console.error("Social login error:", error);
      toast.error("An error occurred during social login");
    } finally {
      setLoadingStates(prev => ({ ...prev, [provider]: false }));
    }
  };

  const isAnyLoading = Object.values(loadingStates).some(state => state);

  if (!isMounted) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: 'var(--purple-primary)' }}
        ></div>
      </div>
    );
  }

  return (
    <div 
      className="max-h-screen min-h-screen flex items-center justify-center p-2 overflow-auto"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="max-w-sm w-full space-y-4">
        {/* Header */}
        <div className="text-center">
          <h2 
            className="text-2xl font-bold mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            Welcome back
          </h2>
          <p 
            className="text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            Sign in to your account to continue
          </p>
        </div>

        {/* Main Card */}
        <div 
          className="rounded-xl shadow-lg p-5 border"
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            borderColor: 'var(--border-color)' 
          }}
        >
          {/* Social Login Buttons */}
          <div className="space-y-2 mb-4">
            <button
              onClick={() => handleSocialSignIn("google")}
              disabled={isAnyLoading}
              className="w-full flex items-center justify-center px-3 py-2 border rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ 
                backgroundColor: 'var(--bg-card)', 
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                focusRingColor: 'var(--purple-primary)'
              }}
            >
              {loadingStates.google ? (
                <div 
                  className="animate-spin rounded-full h-4 w-4 border-b-2"
                  style={{ borderColor: 'var(--text-primary)' }}
                ></div>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            {/* <button
              onClick={() => handleSocialSignIn("github")}
              disabled={isAnyLoading}
              className="w-full flex items-center justify-center px-3 py-2 border rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ 
                backgroundColor: 'var(--bg-card)', 
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                focusRingColor: 'var(--purple-primary)'
              }}
            >
              {loadingStates.github ? (
                <div 
                  className="animate-spin rounded-full h-4 w-4 border-b-2"
                  style={{ borderColor: 'var(--text-primary)' }}
                ></div>
              ) : (
                <>
                  <Github className="w-4 h-4 mr-2" />
                  Continue with GitHub
                </>
              )}
            </button> */}
          </div>

          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div 
                className="w-full border-t"
                style={{ borderColor: 'var(--border-color)' }}
              />
            </div>
            <div className="relative flex justify-center text-xs">
              <span 
                className="px-2"
                style={{ 
                  backgroundColor: 'var(--bg-card)', 
                  color: 'var(--text-secondary)' 
                }}
              >
                Or continue with email
              </span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="email" 
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail 
                    className="h-4 w-4"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isAnyLoading}
                  className="block w-full pl-9 pr-3 py-2 border rounded-lg text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ 
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    focusRingColor: 'var(--purple-primary)'
                  }}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock 
                    className="h-4 w-4"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isAnyLoading}
                  className="block w-full pl-9 pr-9 py-2 border rounded-lg text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ 
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    focusRingColor: 'var(--purple-primary)'
                  }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff 
                      className="h-4 w-4 hover:opacity-70"
                      style={{ color: 'var(--text-secondary)' }}
                    />
                  ) : (
                    <Eye 
                      className="h-4 w-4 hover:opacity-70"
                      style={{ color: 'var(--text-secondary)' }}
                    />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-3 w-3 rounded border focus:ring-2"
                  style={{ 
                    accentColor: 'var(--purple-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                />
                <label 
                  htmlFor="remember-me" 
                  className="ml-2 block text-xs"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Remember me
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isAnyLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg text-xs font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ 
                backgroundColor: 'var(--purple-primary)',
                focusRingColor: 'var(--purple-primary)'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--purple-hover)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'var(--purple-primary)';
              }}
            >
              {loadingStates.credentials ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-4 text-center">
            <p 
              className="text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              Don't have an account?{" "}
              <Link 
                href="/auth/signup" 
                className="font-bold underline text-sm hover:opacity-80 transition-opacity duration-200"
                style={{ color: 'var(--purple-primary)' }}
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p 
            className="text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            By signing in, you agree to our{" "}
            <Link 
              href="" 
              className="hover:opacity-80 transition-opacity duration-200"
              style={{ color: 'var(--purple-primary)' }}
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link 
              href="" 
              className="hover:opacity-80 transition-opacity duration-200"
              style={{ color: 'var(--purple-primary)' }}
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}