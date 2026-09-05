import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    listQuotations, getQuotation, createQuotation,
    updateQuotation, addLine, updateLine, removeLine
} from '../controllers/quotation.controller';

const router = Router();
router.use(authenticate);

router.get('/', listQuotations);
router.post('/', createQuotation);
router.get('/:id', getQuotation);
router.patch('/:id', updateQuotation);

router.post('/:id/lines', addLine);
router.patch('/:id/lines/:lineId', updateLine);
router.delete('/:id/lines/:lineId', removeLine);

export default router;
