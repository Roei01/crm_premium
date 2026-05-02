import { Router } from 'express';
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listCustomers,
  importCustomers
} from '../controllers/customerController';

const router = Router();

router.get('/', listCustomers);
router.post('/', createCustomer);
router.patch('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.post('/import', importCustomers);

export default router;
