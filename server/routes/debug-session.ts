
import express from 'express';
import { logsService } from '../services/logs-service';

const router = express.Router();

// نقطة نهاية للتشخيص (تستخدم فقط في بيئة التطوير)
router.get('/debug/session', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const debugInfo = {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      userId: req.user?.id,
      username: req.user?.username,
      hasSession: !!req.session,
      sessionID: req.sessionID?.substring(0, 8) + '...',
      sessionData: req.session ? Object.keys(req.session) : [],
      cookies: Object.keys(req.cookies || {}),
      headers: {
        authorization: req.get('Authorization'),
        cookie: req.get('Cookie')?.substring(0, 50) + '...',
        userAgent: req.get('User-Agent')
      }
    };

    await logsService.debug('auth', 'Session debug info requested', debugInfo);
    res.json(debugInfo);
  } catch (error) {
    console.error('Error in session debug:', error);
    res.status(500).json({ 
      error: 'Debug error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export { router as debugSessionRouter };
