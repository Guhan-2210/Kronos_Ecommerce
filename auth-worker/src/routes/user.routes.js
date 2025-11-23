// src/routes/user.routes.js
import { AutoRouter } from 'itty-router';
import { meCtrl } from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const userRouter = AutoRouter({ base: '/user' });

// User routes
userRouter.get('/me', requireAuth(), meCtrl);

export default userRouter;
