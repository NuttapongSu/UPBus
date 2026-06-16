require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const gpsPoller    = require('./services/gpsPoller');
const co2Aggregator = require('./services/co2Aggregator');

const authRouter          = require('./routes/auth');
const busesRouter         = require('./routes/buses');
const sustainabilityRouter = require('./routes/sustainability');
const complaintsRouter    = require('./routes/complaints');
const adminRouter         = require('./routes/admin');
const driverRouter        = require('./routes/driver');

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth',           authRouter);
app.use('/api/buses',          busesRouter);
app.use('/api/sustainability', sustainabilityRouter);
app.use('/api/complaints',     complaintsRouter);
app.use('/api/admin',          adminRouter);
app.use('/api/driver',         driverRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 UP Smart Transit API on port ${PORT}`);
  gpsPoller.start();
  co2Aggregator.start();
});

module.exports = app;
