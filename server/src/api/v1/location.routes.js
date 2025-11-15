
const express = require('express');
const router = express.Router();
const locationController = require('../../modules/location/controllers/location.controller');

router.post('/', locationController.createLocation);
router.get('/', locationController.getLocations);
router.get('/:id', locationController.getLocation);
router.put('/:id', locationController.updateLocation);
router.delete('/:id', locationController.deleteLocation);

module.exports = router;