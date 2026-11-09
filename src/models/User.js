const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true, index: true, lowercase: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['user', 'trusted', 'admin'], default: 'user' },
  enabled:   { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
