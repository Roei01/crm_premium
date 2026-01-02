import express from 'express';
import { getMe, createUser, listUsers } from '../controllers/userController';

const router = express.Router();

// Gateway middleware already verified token and passed headers
router.get('/me', getMe);
router.get('/', listUsers); // List all users in tenant
router.post('/', createUser); // Create user in tenant (RBAC handled in controller)

export default router;

