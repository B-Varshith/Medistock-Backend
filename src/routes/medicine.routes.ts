import { Router } from 'express';
import { addMedicine, getMedicines, getMedicineById, deleteMedicine, sellMedicines, updateMedicine } from '../controllers/medicine.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticate);
// Routes
router.post('/', authenticate, upload.single('bill'), addMedicine); // This was addMedicine
router.get('/', getMedicines);
router.get('/:id', getMedicineById);
router.delete('/:id', deleteMedicine);
router.put('/:id', updateMedicine);
router.post('/sell', sellMedicines);

export default router;
