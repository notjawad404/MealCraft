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

router.get('/', optionalAuthenticate, getAllCookbooks);
router.get('/my-cookbooks', authenticate, getMyCookbooks);
router.get('/:id', optionalAuthenticate, getCookbookById);
router.post('/', authenticate, createCookbook);
router.put('/:id', authenticate, updateCookbook);
router.delete('/:id', authenticate, deleteCookbook);

module.exports = router;
