const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  startOnboarding,
  getStatus,
  getDashboardLink,
} = require('../controller/connectController');

router.post('/onboard', authenticate, startOnboarding);
router.get('/status', authenticate, getStatus);
router.get('/dashboard', authenticate, getDashboardLink);

module.exports = router;
