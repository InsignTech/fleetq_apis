import express from 'express';
import {
  createTruckBooking,
  getTruckBookings,
  getTruckBookingById,
  updateTruckBooking,
  getTruckBookingByMobileNumber,
  getAvailableTrucks,
  pushAvailableTrucks,
  SearchAndpushAvailableTrucks,
  // deleteTruckBooking, // uncomment if you want delete route
} from '../controller/truckbookingController.js';

import protect from '../middleWare/userMiddleWare.js'; // assuming you have auth middleware

const router = express.Router();

// Protect all routes below - only authenticated users can access
// router.use(protect);

// Create truck booking
router.post('/', createTruckBooking);

// Get all truck bookings (with optional filters)
router.get('/', getTruckBookings);


// Update truck booking by ID

router.get('/by-mobile-number', getTruckBookingByMobileNumber);

router.get('/available-trucks', getAvailableTrucks);

router.post('/push-available-trucks', pushAvailableTrucks);

router.post('/push-available-trucks-search', SearchAndpushAvailableTrucks);

router.put('/:id', updateTruckBooking);
// Get truck booking by ID
router.get('/:id', getTruckBookingById);
// Delete truck booking by ID (if needed)
// router.delete('/:id', deleteTruckBooking);

export default router;
