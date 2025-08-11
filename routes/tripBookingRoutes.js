import express from 'express';
import {
  createTripBooking,
  getTripBookings,
  getTripBookingById,
  updateTripBooking,
  getBookingsByMobileNumber,
  // deleteTripBooking, // Uncomment if you want delete
} from '../controller/tripbookingController.js';

import protect from '../middleWare/userMiddleWare.js'; // Your auth middleware to get req.user

const router = express.Router();

// Create a new trip booking - protected
router.post('/', protect, createTripBooking);

// Get all trip bookings (with optional filters)
router.get('/', protect, getTripBookings);

// Get single trip booking by ID
router.get('/:id', protect, getTripBookingById);

// Update trip booking by ID
router.put('/:id', protect, updateTripBooking);

router.get('/by-mobile-number', getBookingsByMobileNumber);
// Uncomment if you want to enable deletion
// router.delete('/:id', protect, deleteTripBooking);

export default router;
