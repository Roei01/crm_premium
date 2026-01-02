import { Router } from 'express';
import { createCustomer, listCustomers, importCustomers } from '../controllers/customerController';

const router = Router();

router.post('/', createCustomer);
router.get('/', listCustomers);
router.post('/import', importCustomers);

export default router;

