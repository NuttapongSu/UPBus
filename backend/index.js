require('dotenv').config();
const express = require('express');
const session = require('express-session');
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
const pagesRouter         = require('./routes/pages');
const reservationsRouter  = require('./routes/reservations');
const lineRouter          = require('./routes/line');
const stopsRouter         = require('./routes/stops');
const pushRouter          = require('./routes/push');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session for admin pages
app.use(session({
  secret: process.env.SESSION_SECRET || 'upbus-admin-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }, // 8 hours
}));

// Static assets for admin UI
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Admin page routes (session-based)
app.use('/', pagesRouter);

// API routes
app.use('/api/auth',           authRouter);
app.use('/api/buses',          busesRouter);
app.use('/api/sustainability', sustainabilityRouter);
app.use('/api/complaints',     complaintsRouter);
app.use('/api/admin',          adminRouter);
app.use('/api/driver',         driverRouter);
app.use('/api/reservations',   reservationsRouter);
app.use('/api/line',           lineRouter);
app.use('/api/stops',          stopsRouter);
app.use('/api/push',           pushRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 UP Smart Transit API on port ${PORT}`);
  gpsPoller.start();
  co2Aggregator.start();
});

module.exports = app;
