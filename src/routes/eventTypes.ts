import express from 'express';
import {
  listEventTypes,
  getEventType,
  createEventType,
  updateEventType,
  deleteEventType,
  fireEventType,
} from '../controllers/eventTypes';
import { isAuth } from '../middlewares/isAuth';
import { isAdmin } from '../middlewares/isAdmin';

const router = express.Router();

router.use(isAuth, isAdmin);

router.get('/', listEventTypes);
router.post('/', createEventType);
router.get('/:key', getEventType);
router.patch('/:key', updateEventType);
router.delete('/:key', deleteEventType);
router.post('/:key/fire', fireEventType);

export default router;
