const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');

router.get('/', tripController.getTrips);
router.post('/start', tripController.startTrip);
router.put('/end/:id', tripController.endTrip);

module.exports = router;
