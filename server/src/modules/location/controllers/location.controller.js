// server/src/modules/location/controllers/location.controller.js
const locationService = require('../services/location.service');

exports.createLocation = async (req, res) => {
  try {
    const location = await locationService.createLocation(req.body);
    res.status(201).json(location);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getLocations = async (req, res) => {
  try {
    const locations = await locationService.getAllLocations();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLocation = async (req, res) => {
  try {
    const location = await locationService.getLocationById(req.params.id);
    res.json(location);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const location = await locationService.updateLocation(req.params.id, req.body);
    res.json(location);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteLocation = async (req, res) => {
  try {
    await locationService.deleteLocation(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};