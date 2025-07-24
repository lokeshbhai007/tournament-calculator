// app/api/feedback/route.js (App Router format)

import nodemailer from 'nodemailer';

// Named export for POST method
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return Response.json({ 
        message: 'All fields are required',
        error: 'MISSING_FIELDS'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ 
        message: 'Invalid email format',
        error: 'INVALID_EMAIL'
      }, { status: 400 });
    }

    // Create transporter using environment variables
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or your email service
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.NODE_MAILER_KEY // App password from environment
      }
    });

    // Email to support team
    const supportMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
      subject: `Support Request: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
            New Support Request
          </h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Contact Information</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h3 style="color: #374151; margin-top: 0;">Message</h3>
            <p style="line-height: 1.6; color: #4b5563;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; font-size: 14px; color: #1e40af;">
              <strong>Note:</strong> This message was sent from the support form on ${new Date().toLocaleString()}.
            </p>
          </div>
        </div>
      `
    };

    // Confirmation email to user
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Support Request Received - We\'ll Get Back to You Soon!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1; text-align: center;">Thank You for Contacting Us!</h2>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="color: #0c4a6e; margin-top: 0;">Hi ${name},</h3>
            <p style="color: #075985; line-height: 1.6;">
              We've received your support request and our team will get back to you within 24-48 hours.
            </p>
          </div>
          
          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h4 style="color: #374151; margin-top: 0;">Your Request Details:</h4>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            <div style="margin-top: 15px; padding: 15px; background-color: #f9fafb; border-radius: 6px;">
              <p style="margin: 0; color: #4b5563; font-style: italic;">"${message}"</p>
            </div>
          </div>
          
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>Need immediate assistance? Reply to this email or contact us directly.</p>
            <p style="margin-top: 15px;">
              <strong>Best regards,</strong><br>
              The Support Team
            </p>
          </div>
        </div>
      `
    };

    // Send both emails
    await Promise.all([
      transporter.sendMail(supportMailOptions),
      transporter.sendMail(userMailOptions)
    ]);

    return Response.json({ 
      message: 'Support request sent successfully!',
      success: true 
    }, { status: 200 });

  } catch (error) {
    console.error('Email sending error:', error);
    
    return Response.json({ 
      message: 'Failed to send support request. Please try again later.',
      error: 'EMAIL_SEND_FAILED'
    }, { status: 500 });
  }
}

// Optional: Handle other HTTP methods
export async function GET() {
  return Response.json({ 
    message: 'Method not allowed. Use POST to submit support requests.' 
  }, { status: 405 });
}