const express = require('express');
const { STOPS } = require('../data/stops');
const router = express.Router();

router.get('/', (req, res) => {
  res.json(STOPS);
});

module.exports = router;
