"use client"

import { HelpCircle, Headphones, Contact, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [submitStatus, setSubmitStatus] = useState({
    loading: false,
    success: false,
    error: null
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    
    // Clear error when user starts typing
    if (submitStatus.error) {
      setSubmitStatus(prev => ({ ...prev, error: null }));
    }
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      setSubmitStatus({ 
        loading: false, 
        success: false, 
        error: 'Please fill in all fields' 
      });
      return;
    }
    
    setSubmitStatus({ loading: true, success: false, error: null });

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus({ loading: false, success: true, error: null });
        
        // Reset form after successful submission
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });

        // Hide success message after 5 seconds
        setTimeout(() => {
          setSubmitStatus(prev => ({ ...prev, success: false }));
        }, 5000);
      } else {
        throw new Error(data.message || 'Failed to send message');
      }
    } catch (error) {
      setSubmitStatus({ 
        loading: false, 
        success: false, 
        error: error.message || 'Something went wrong. Please try again.' 
      });
    }
  };

  return (
    <div className="mx-auto px-4 sm:px-6 pt-10 md:pt-0">
      <div className="max-h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        {/* Header */}
        <div className="py-4">
          <h2 className="text-xl font-bold " style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Support</h2>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FAQ Section */}
        <div className="card rounded-lg p-4 sm:p-6 shadow-sm border">
          <div className="flex items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Frequently Asked Questions
            </h2>
            <HelpCircle className="ml-auto w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                How to use?
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                You can simply go to the Ranger modal and find a tutorial video. Fill out the contact information so that we can help you.
              </p>
            </div>
            
            <div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Loading problem?
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                This system is fully focused on performance and precision.
              </p>
            </div>
            
            <div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                How to get helped?
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                You can contaact us through the given form.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Form Section */}
        <div className="card rounded-lg p-4 sm:p-6 shadow-sm border">
          <div className="flex items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Contact Support
            </h2>
            <Contact className="ml-auto w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </div>

          {/* Success Message */}
          {submitStatus.success && (
            <div className="mb-4 p-3 rounded-lg border border-green-200 bg-green-50 flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
              <p className="text-sm text-green-800">
                Message sent successfully! We'll get back to you within 24-48 hours.
              </p>
            </div>
          )}

          {/* Error Message */}
          {submitStatus.error && (
            <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-800">{submitStatus.error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={submitStatus.loading}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  focusRingColor: 'var(--purple-primary)'
                }}
                required
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={submitStatus.loading}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  focusRingColor: 'var(--purple-primary)'
                }}
                required
              />
            </div>
            
            <div>
              <label htmlFor="subject" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Subject
              </label>
              <input
                type="text"
                id="subject"
                value={formData.subject}
                onChange={handleInputChange}
                disabled={submitStatus.loading}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  focusRingColor: 'var(--purple-primary)'
                }}
                required
              />
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Message
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={handleInputChange}
                disabled={submitStatus.loading}
                rows="4"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  focusRingColor: 'var(--purple-primary)'
                }}
                required
              />
            </div>
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitStatus.loading}
              className="w-full font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm hover:transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none flex items-center justify-center"
              style={{ 
                backgroundColor: 'var(--purple-primary)',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => !submitStatus.loading && (e.target.style.backgroundColor = 'var(--purple-hover)')}
              onMouseLeave={(e) => !submitStatus.loading && (e.target.style.backgroundColor = 'var(--purple-primary)')}
            >
              {submitStatus.loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Message'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
