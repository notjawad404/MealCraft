const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const optionalAuthenticate = require('../middleware/optionalAuthenticate');
const {
  createCookbook,
  getAllCookbooks,
  getCookbookById,
  getMyCookbooks,
  updateCookbook,
  deleteCookbook,
} = require('../controller/cookbookController');
const {
  createCheckoutSession,
  confirmPurchase,
} = require('../controller/purchaseController');

router.get('/', optionalAuthenticate, getAllCookbooks);
router.get('/my-cookbooks', authenticate, getMyCookbooks);

// Ahead of '/:id' so 'purchases' is not read as a cookbook id.
router.post('/purchases/confirm', authenticate, confirmPurchase);

router.get('/:id', optionalAuthenticate, getCookbookById);
router.post('/:id/checkout', authenticate, createCheckoutSession);
router.post('/', authenticate, createCookbook);
router.put('/:id', authenticate, updateCookbook);
router.delete('/:id', authenticate, deleteCookbook);

module.exports = router;
