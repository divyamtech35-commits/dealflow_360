import { Router } from 'express';
import { getQuotations, getQuotationById, createQuotation } from '../controllers/quote.controller';

const router = Router();

router.get('/', getQuotations);
router.get('/:id', getQuotationById);
router.post('/', createQuotation);

export default router;
