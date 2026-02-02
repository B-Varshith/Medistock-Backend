import { Router } from 'express';
import { createSupplier, getSuppliers, updateSupplier, deleteSupplier } from '../controllers/supplier.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createSupplier);
router.get('/', getSuppliers);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

export default router;
