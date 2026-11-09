const mongoose = require('mongoose');

function makeElement(name, withAccessible) {
  const fields = {
    publicSquareId: { type: mongoose.Schema.Types.ObjectId, ref: 'PublicSquare', required: true, index: true },
    description: { type: String, default: '' },
    picture: { type: String, default: '' },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
  };
  if (withAccessible) fields.accessible = { type: Boolean, default: false };
  return mongoose.model(name, new mongoose.Schema(fields));
}

module.exports = {
  WC: makeElement('PublicSquareWC', true),
  Playground: makeElement('PublicSquarePlayground', true),
  Ramp: makeElement('PublicSquareRamp', false),
  Hazard: makeElement('PublicSquareHazard', false),
};
