// server/src/domains/unit/unit.controller.js
const unitService = require('./unit.service');

exports.createUnit = async (req, res) => {
  try {
    const unit = await unitService.createUnit(req.body);
    res.status(201).json(unit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getUnits = async (req, res) => {
  try {
    const units = await unitService.getAllUnits();
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUnit = async (req, res) => {
  try {
    const unit = await unitService.getUnitById(req.params.id);
    res.json(unit);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

exports.updateUnit = async (req, res) => {
  try {
    const unit = await unitService.updateUnit(req.params.id, req.body);
    res.json(unit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteUnit = async (req, res) => {
  try {
    await unitService.deleteUnit(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
