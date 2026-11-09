require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`API en http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Error conectando a MongoDB:', err);
    process.exit(1);
  });
