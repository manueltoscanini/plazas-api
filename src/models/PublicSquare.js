const mongoose = require('mongoose');

const hazardSchema = new mongoose.Schema({
  description: { type: String, default: '' },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  picture: { type: String, default: '' },
});

const squareSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    accessibilityDescription: { type: String, default: '' },
    location: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lon: { type: Number, required: true, min: -180, max: 180 },
    },
    wc: { exists: { type: Boolean, default: false } },
    playground: { exists: { type: Boolean, default: false } },
    ramps: { exists: { type: Boolean, default: false } },
    paths: {
      exists: { type: Boolean, default: false },
      accessible: { type: Boolean, default: false },
      description: { type: String, default: '' },
    },
    hazards: {
      exists: { type: Boolean, default: false },
      hazards: { type: [hazardSchema], default: [] },
    },
    pictures: { type: [String], default: [] },
  },
  { timestamps: true } // crea createdAt y updatedAt automaticamente
);

module.exports = mongoose.model('PublicSquare', squareSchema);
