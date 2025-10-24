import express from 'express';
import {
  createTripBooking,
  getTripBookings,
  getTripBookingById,
  updateTripBooking,
  getBookingsByMobileNumber,
  getAllTripBookings,
  cancelTripBooking,
  getPaginatedTripBookings,
  searchTripBookings
  // deleteTripBooking, // Uncomment if you want delete
} from '../controller/tripbookingController.js';

import protect from '../middleWare/userMiddleWare.js'; // Your auth middleware to get req.user

const router = express.Router();

// Create a new trip booking - protected
router.post('/', protect, createTripBooking);

// Get all trip bookings (with optional filters)
router.get('/', protect, getTripBookings);

router.get('/by-mobile-number', getBookingsByMobileNumber);

router.post('/get-all-tripbooking', getAllTripBookings)
// Get single trip booking by ID

router.get('/:id', protect, getTripBookingById);

// Update trip booking by ID
router.put('/:id', protect, updateTripBooking);

router.post('/cancel-trip-booking',cancelTripBooking)
// Uncomment if you want to enable deletion
// router.delete('/:id', protect, deleteTripBooking);

router.get('/app/get-all-tripbooking', getPaginatedTripBookings)

router.get('/app/search-tripbooking', searchTripBookings)


// router.post('/app/get-all-tripbooking', getPaginatedTripBookings)
// router.post('/app/get-all-tripbooking', getPaginatedTripBookings)
export default router;
