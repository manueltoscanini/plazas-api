const mongoose = require('mongoose');
const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    publicSquareId: { type: Schema.Types.ObjectId, ref: 'PublicSquare', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Ej: { addRamp: {description, lat, lon}, modifyWC: {id, accessible}, deleteHazard: {id} }
    changes: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    autoApprovedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    autoRejectedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
