const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/users', require('./routes/users.routes'));
app.use('/api/square', require('./routes/square.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/uploads', require('./routes/uploads.routes'));
module.exports = app;
