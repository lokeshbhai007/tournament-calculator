"use client"

import { HelpCircle, Headphones, Contact } from "lucide-react";
import { useState } from "react";

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Support form submitted:', formData);
    // You can add actual form submission logic here
    alert('Message sent successfully!');
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
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
                How are you?
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                I'm all good—unless someone fakes a wallet issue again😅
              </p>
            </div>
            
            <div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Ghar pe sb theek?
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Sab badhiya, bas koi refund maangne na aa jaye. Aap sunao?
              </p>
            </div>
            
            <div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                100 bhej momos khana hai
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Bhai wallet mein paise dikh nahi rahe, aur yaha refund ka option bhi nahi. Momos toh door ki baat hai. 🥲.
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
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200"
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
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200"
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
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200"
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
                rows="4"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200 resize-none"
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
              type="submit"
              className="w-full font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm hover:transform hover:-translate-y-0.5"
              style={{ 
                backgroundColor: 'var(--purple-primary)',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--purple-hover)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--purple-primary)'}
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}