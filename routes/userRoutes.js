import express from 'express';
import { 
  userSignup, 
  updateDetails, 
  adminLogin, 
  userVerify
} from '../controller/userController.js';
import protect from '../middleWare/userMiddleWare.js';

const router = express.Router();

// =========================
// ADMIN ROUTES
// =========================
router.post('/admin/login', adminLogin);         // Admin login
router.post('/', protect, userSignup);           // Only logged-in admins can create users

// =========================
// USER ROUTES
// =========================
router.post('/verify', userVerify);                // Regular user login
router.put('/:id', protect, updateDetails);      // Update user details (auth required)


export default router;
