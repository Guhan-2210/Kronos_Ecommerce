// src/routes/auth.routes.js
import { AutoRouter } from 'itty-router';
import {
  signupCtrl,
  loginCtrl,
  refreshCtrl,
  logoutCtrl,
  logoutAllCtrl,
} from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { signupSchema, loginSchema } from '../schemas/auth.schemas.js';

const authRouter = AutoRouter({ base: '/auth' });

// Auth routes
authRouter.post('/signup', validateBody(signupSchema), signupCtrl);
authRouter.post('/login', validateBody(loginSchema), loginCtrl);
authRouter.post('/refresh', refreshCtrl);
authRouter.post('/logout', logoutCtrl);
authRouter.post('/logout-all', requireAuth(), logoutAllCtrl);

export default authRouter;
