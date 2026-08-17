import express from 'express';
import {
  listEndpoints,
  getEndpoint,
  createEndpoint,
  updateEndpoint,
  rotateSecret,
  deleteEndpoint,
  testEndpoint,
  listDeliveries,
} from '../controllers/webhooks';
import { isAuth } from '../middlewares/isAuth';
import { isAdmin } from '../middlewares/isAdmin';

const router = express.Router();

router.use(isAuth, isAdmin);

router.get('/', listEndpoints);
router.post('/', createEndpoint);
router.get('/:id', getEndpoint);
router.patch('/:id', updateEndpoint);
router.delete('/:id', deleteEndpoint);
router.post('/:id/rotate-secret', rotateSecret);
router.post('/:id/test', testEndpoint);
router.get('/:id/deliveries', listDeliveries);

export default router;
