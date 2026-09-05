import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getOrderShipments,
    updateShipmentStatus
} from '../controllers/shipment.controller';

const router = Router();
router.use(authenticate);

router.get('/order/:orderId', getOrderShipments);
router.post('/:id/status', updateShipmentStatus);

export default router;
