// app/auth/signup/page.jsx

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, Mail, Lock, User, UserPlus } from "lucide-react";

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Account created successfully!");
        router.push("/dashboard");
      } else {
        toast.error(data.error || "Registration failed");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, text: "", color: "" };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const levels = [
      { text: "Very Weak", color: "#ef4444" },
      { text: "Weak", color: "#f97316" },
      { text: "Fair", color: "#eab308" },
      { text: "Good", color: "#3b82f6" },
      { text: "Strong", color: "#22c55e" },
    ];

    return { strength, ...levels[strength - 1] || levels[0] };
  };

  const passwordStrength = getPasswordStrength(formData.password);

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
            Create your account
          </h2>
          <p 
            className="text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            Join us today and start your journey
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label 
                htmlFor="name" 
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User 
                    className="h-4 w-4"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                  className="block w-full pl-9 pr-3 py-2 border rounded-lg text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ 
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    focusRingColor: 'var(--purple-primary)'
                  }}
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Email */}
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
                  disabled={loading}
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

            {/* Password */}
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
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  className="block w-full pl-9 pr-9 py-2 border rounded-lg text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ 
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    focusRingColor: 'var(--purple-primary)'
                  }}
                  placeholder="Create a password"
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
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-1">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="flex-1 rounded-full h-1"
                      style={{ backgroundColor: 'var(--border-color)' }}
                    >
                      <div
                        className="h-1 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(passwordStrength.strength / 5) * 100}%`,
                          backgroundColor: passwordStrength.color
                        }}
                      ></div>
                    </div>
                    <span 
                      className="text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {passwordStrength.text}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label 
                htmlFor="confirmPassword" 
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock 
                    className="h-4 w-4"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                  className="block w-full pl-9 pr-9 py-2 border rounded-lg text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ 
                    backgroundColor: 'var(--bg-card)',
                    borderColor: formData.confirmPassword && formData.password !== formData.confirmPassword ? '#ef4444' : 'var(--border-color)',
                    color: 'var(--text-primary)',
                    focusRingColor: formData.confirmPassword && formData.password !== formData.confirmPassword ? '#ef4444' : 'var(--purple-primary)'
                  }}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
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
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-3 w-3 rounded border mt-1 focus:ring-2"
                style={{ 
                  accentColor: 'var(--purple-primary)',
                  borderColor: 'var(--border-color)'
                }}
              />
              <label 
                htmlFor="terms" 
                className="ml-2 block text-xs"
                style={{ color: 'var(--text-primary)' }}
              >
                I agree to the{" "}
                <Link 
                  href="/terms" 
                  className="hover:opacity-80 transition-opacity duration-200"
                  style={{ color: 'var(--purple-primary)' }}
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link 
                  href="/privacy" 
                  className="hover:opacity-80 transition-opacity duration-200"
                  style={{ color: 'var(--purple-primary)' }}
                >
                  Privacy Policy
                </Link>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || formData.password !== formData.confirmPassword}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg text-xs font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ 
                backgroundColor: 'var(--purple-primary)',
                focusRingColor: 'var(--purple-primary)'
              }}
              onMouseEnter={(e) => {
                if (!loading && formData.password === formData.confirmPassword) {
                  e.target.style.backgroundColor = 'var(--purple-hover)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'var(--purple-primary)';
              }}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-4 text-center">
            <p 
              className="text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              Already have an account?{" "}
              <Link 
                href="/auth/signin" 
                className="font-bold underline text-sm hover:opacity-80 transition-opacity duration-200"
                style={{ color: 'var(--purple-primary)' }}
              >
                Sign in
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
            By creating an account, you agree to our{" "}
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