import express from 'express';
import {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  createUser,
} from '../controllers/admin';
import { isAuth } from '../middlewares/isAuth';
import { isAdmin } from '../middlewares/isAdmin';

const router = express.Router();

// isAuth first (is there a session at all), then isAdmin (does it have
// the role) — same ordering the middleware itself expects.
router.use(isAuth, isAdmin);

router.get('/users', listUsers);
router.post('/users', createUser);
router.get('/users/:id', getUser);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;
