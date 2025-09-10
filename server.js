const express = require('express');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Test endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Email API is running!',
    timestamp: new Date().toISOString(),
    status: 'success'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'RSVP Email Backend'
  });
});

// Send QR code via email
app.post('/api/send-qr', async (req, res) => {
  try {
    const { name, email, token, qrData } = req.body;

    // Validation
    if (!name || !email || !token || !qrData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: name, email, token, qrData' 
      });
    }

    // Generate QR code as buffer
    const qrBuffer = await QRCode.toBuffer(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Email HTML template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your RSVP QR Code</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border: 1px solid #ddd; border-radius: 8px; padding: 30px;">
          <h2 style="color: #333; margin-bottom: 20px;">Your RSVP QR Code</h2>
          <p style="font-size: 16px; color: #666;">Hi ${name},</p>
          <p style="font-size: 14px; color: #666; margin-bottom: 30px;">
            Here's your personalized QR code for the event:
          </p>
          <div style="margin: 30px 0;">
            <img src="cid:qrcode" style="max-width: 250px; border: 1px solid #eee; border-radius: 8px;" alt="QR Code" />
          </div>
          <p style="font-size: 12px; color: #999; margin-top: 20px;">
            Token: <strong>${token}</strong>
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 10px;">
            Please show this QR code at the event entrance.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email
    const mailOptions = {
      from: {
        name: 'RSVP System',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: `🎫 Your RSVP QR Code - ${name}`,
      html: emailHtml,
      attachments: [{
        filename: 'qr-code.png',
        content: qrBuffer,
        cid: 'qrcode',
        contentType: 'image/png'
      }]
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      message: 'QR code sent successfully!',
      recipient: email,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error sending QR code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// For local development only
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
module.exports = app;