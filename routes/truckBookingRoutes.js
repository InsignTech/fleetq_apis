import express from 'express';
import {
  createTruckBooking,
  getTruckBookings,
  getTruckBookingById,
  updateTruckBooking,
  // deleteTruckBooking, // uncomment if you want delete route
} from '../controller/truckbookingController.js';

import protect from '../middleWare/userMiddleWare.js'; // assuming you have auth middleware

const router = express.Router();

// Protect all routes below - only authenticated users can access
router.use(protect);

// Create truck booking
router.post('/', createTruckBooking);

// Get all truck bookings (with optional filters)
router.get('/', getTruckBookings);

// Get truck booking by ID
router.get('/:id', getTruckBookingById);

// Update truck booking by ID
router.put('/:id', updateTruckBooking);

// Delete truck booking by ID (if needed)
// router.delete('/:id', deleteTruckBooking);

export default router;
