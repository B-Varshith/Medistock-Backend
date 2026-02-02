import { Router } from 'express';
import { createTransaction, getTransactions } from '../controllers/transaction.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createTransaction);
router.get('/', getTransactions);

export default router;
