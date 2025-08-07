import { Request, Response, NextFunction } from 'express';

// Middleware to handle raw body for Stripe webhooks in Vercel
export const rawBodyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if this is a Stripe webhook request
  if (req.path.includes('/webhook-vercel') && req.method === 'POST') {
    // For Vercel serverless, the body might already be parsed
    // We need to reconstruct the raw body for Stripe signature verification
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      // Convert parsed JSON back to raw buffer
      const rawBody = Buffer.from(JSON.stringify(req.body), 'utf8');
      req.body = rawBody;
    }
  }
  next();
};

