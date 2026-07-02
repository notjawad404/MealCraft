const express = require('express');
const { getRecipes, getMyRecipes, getRecipe, addRecipe, editRecipe, deleteRecipe } = require('../controller/recipeController.js');
const authenticate = require('../middleware/authenticate.js');

const router = express.Router();

router.get('/', getRecipes);
router.get('/user', authenticate, getMyRecipes);
router.get('/:id', getRecipe);
router.post('/', authenticate, addRecipe);
router.put('/:id', authenticate, editRecipe);
router.delete('/:id', authenticate, deleteRecipe);

module.exports = router;