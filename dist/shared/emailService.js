"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTenantInvitationEmail = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../config/config"));
// Create transporter with SMTP configuration for Gmail
const transporter = nodemailer_1.default.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: config_1.default.nodemailer_user,
        pass: config_1.default.nodemailer_pass,
    },
    // Optional: Add these settings for better reliability
    tls: {
        rejectUnauthorized: false,
    },
    // Optional: Add timeout settings
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
});
// Send email function
const sendEmail = (emailOptions) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mailOptions = {
            from: config_1.default.nodemailer_user,
            to: emailOptions.to,
            subject: emailOptions.subject,
            html: emailOptions.html,
        };
        yield transporter.sendMail(mailOptions);
        console.log("Email sent successfully");
    }
    catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email");
    }
});
exports.sendEmail = sendEmail;
// Send tenant invitation email
const sendTenantInvitationEmail = (tenantEmail, tenantName, autoFillUrl, propertyName, spotNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = "Welcome to Your New Rental Property!";
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Your New Rental Property</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4CAF50;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 0 0 5px 5px;
        }
        .button {
          display: inline-block;
          background-color: #4CAF50;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .button:hover {
          background-color: #45a049;
        }
        .footer {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
        }
        .highlight {
          background-color: #fff3cd;
          padding: 10px;
          border-left: 4px solid #ffc107;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Welcome to Your New Rental Property!</h1>
      </div>
      
      <div class="content">
        <p>Dear ${tenantName},</p>
        
        <p>Welcome! You have been successfully invited to join our rental property management system.</p>
        
        <div class="highlight">
          <strong>Property Details:</strong><br>
          Property: ${propertyName}<br>
          Spot Number: ${spotNumber}
        </div>
        
        <p>To complete your setup and access your account, please click the button below:</p>
        
        <a href="${autoFillUrl}" class="button">Complete Your Setup</a>
        
        <p>This link will take you to a secure page where you can:</p>
        <ul>
          <li>Set up your account password</li>
          <li>Complete your profile information</li>
          <li>Access your rental property dashboard</li>
        </ul>
        
        <p><strong>Important:</strong> This link is unique to your account and should not be shared with others.</p>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        
        <p>Best regards,<br>
        Your Property Management Team</p>
      </div>
      
      <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
        <p>If you did not expect this invitation, please contact our support team immediately.</p>
      </div>
    </body>
    </html>
  `;
    yield (0, exports.sendEmail)({
        to: tenantEmail,
        subject,
        html,
    });
});
exports.sendTenantInvitationEmail = sendTenantInvitationEmail;
exports.default = {
    sendEmail: exports.sendEmail,
    sendTenantInvitationEmail: exports.sendTenantInvitationEmail,
};
