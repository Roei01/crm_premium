import express from 'express';
import { getMe, createUser, listUsers, deleteUser, listDeletedUsers, restoreUser, getAuditLogs } from '../controllers/userController';

const router = express.Router();

// Gateway middleware already verified token and passed headers
router.get('/me', getMe);
router.get('/audit-logs', getAuditLogs); // View audit logs (Admin only)
router.get('/', listUsers); // List all users in tenant
router.post('/', createUser); // Create user in tenant (RBAC handled in controller)
router.get('/deleted', listDeletedUsers); // List deleted users (recycle bin)
router.delete('/:id', deleteUser); // Soft delete
router.put('/:id/restore', restoreUser); // Restore deleted user

export default router;

