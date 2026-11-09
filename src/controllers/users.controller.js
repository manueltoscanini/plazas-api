const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

exports.checkEmail = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  res.json({ result: !!user });
};

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (await User.findOne({ email })) {
      return res.status(409).json({ message: 'El correo ya está registrado' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ firstName, lastName, email, password: hash });
    res.status(201).json({ token: signToken(user) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !user.enabled || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }
  res.json({ token: signToken(user) });
};
