import { Request, Response } from 'express';

/**
 * Health check endpoint for polling by the VS Code extension and monitoring tools.
 * GET /api/health
 */
export const getHealth = (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
};
