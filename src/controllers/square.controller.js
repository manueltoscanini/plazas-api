const mongoose = require('mongoose');
const Square = require('../models/PublicSquare');
const { WC, Playground, Ramp, Hazard } = require('../models/elements');


// Distancia en km entre dos puntos (formula de Haversine)
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Campos que se pueden enviar al crear o modificar
const EDITABLE = [
  'name', 'description', 'accessibilityDescription', 'location',
  'wc', 'playground', 'ramps', 'paths', 'hazards', 'pictures',
];

function pickEditable(body) {
  const data = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return data;
}

// GET /api/square/list?lat=..&lon=..&radius=..   (radius en km)
// Si no se pasa lat/lon, devuelve todas las plazas.
exports.list = async (req, res) => {
  try {
    const squares = await Square.find()
      .select('name location wc playground ramps paths.exists paths.accessible hazards.exists updatedAt')
      .lean();

    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return res.json(squares);
    }

    const radius = parseFloat(req.query.radius) || 10;

    const result = squares
      .map((s) => ({ ...s, distanceKm: distanceKm(lat, lon, s.location.lat, s.location.lon) }))
      .filter((s) => s.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/square/:id
exports.getById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    const square = await Square.findById(req.params.id).lean();
    if (!square) return res.status(404).json({ message: 'Plaza no encontrada' });

    const q = { publicSquareId: square._id };
    const [wcs, playgrounds, ramps, hazards] = await Promise.all([
      WC.find(q).lean(),
      Playground.find(q).lean(),
      Ramp.find(q).lean(),
      Hazard.find(q).lean(),
    ]);

    res.json({ ...square, elements: { wcs, playgrounds, ramps, hazards } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/square   (solo admin)
exports.create = async (req, res) => {
  try {
    const square = await Square.create(pickEditable(req.body));
    res.status(201).json(square);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PATCH /api/square/:id   (solo admin)
exports.update = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'ID inv�lido' });
    }
    const square = await Square.findByIdAndUpdate(
      req.params.id,
      { $set: pickEditable(req.body) },
      { new: true, runValidators: true }
    );
    if (!square) return res.status(404).json({ message: 'Plaza no encontrada' });
    res.json(square);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
