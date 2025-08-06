# Vercel Deployment Guide

## Overview
This application is configured for deployment on Vercel as a serverless Node.js API.

## Configuration Files

### `vercel.json`
- **Builds**: Uses `@vercel/node` to build the `api/index.js` entry point
- **Routes**: Routes all requests to the serverless function
- **Special handling**: Stripe webhook route with proper Content-Type headers

### `api/index.js`
- **Entry point**: Serverless function entry point for Vercel
- **Database connection**: Handles MongoDB connection for serverless environment
- **Default admin**: Creates default admin user if no users exist
- **Port handling**: Only starts HTTP server for local development

### `package.json`
- **Build script**: `tsc` compiles TypeScript to JavaScript
- **Vercel build**: `vercel-build` ensures build runs during deployment
- **Start script**: Uses `api/index.js` for consistency
- **Engines**: Specifies Node.js 18.x

## Environment Variables Required

Make sure to set these environment variables in your Vercel project:

- `DATABASE_URL`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT token generation
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret
- `NODEMAILER_USER`: Email service username
- `NODEMAILER_PASS`: Email service password
- `MAILJET_API_KEY`: Mailjet API key
- `MAILJET_SECRET_KEY`: Mailjet secret key
- `MAILJET_SENDER_EMAIL`: Sender email address
- `UPSTASH_REDIS_ENDPOINT`: Redis endpoint
- `UPSTASH_REDIS_PASSWORD`: Redis password
- `UPSTASH_REDIS_PORT`: Redis port
- `REDIS_CRYPTO_KEY`: Redis encryption key
- `CLIENT_URL`: Frontend URL
- `BACKEND_URL`: Backend URL

## Deployment Steps

1. **Build the project**: `npm run build`
2. **Deploy to Vercel**: `vercel --prod`
3. **Set environment variables** in Vercel dashboard
4. **Configure Stripe webhooks** to point to your Vercel URL

## Local Development

- **Development**: `npm run dev` (uses ts-node-dev)
- **Production build**: `npm run build` then `npm start`

## Troubleshooting

### "No Output Directory named 'public' found"
- This error occurs when Vercel expects a static site but gets a Node.js API
- Solution: Use the `api/` directory structure and proper `vercel.json` configuration

### Database Connection Issues
- Ensure `DATABASE_URL` is set correctly in Vercel environment variables
- Check that your MongoDB instance allows connections from Vercel's IP ranges

### Stripe Webhook Issues
- Verify webhook URL points to `/api/v1.0/stripe/webhook`
- Ensure webhook secret is set correctly in environment variables
