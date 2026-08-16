const express = require('express');
const router = express.Router();
const { handleStripeWebhook } = require('../controller/webhookController');

// Unauthenticated: the Stripe signature is the credential.
router.post('/webhook', handleStripeWebhook);

module.exports = router;
