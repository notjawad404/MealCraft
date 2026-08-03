const express = require('express');
const {
    getRecipes,
    getMyRecipes,
    getRecipe,
    suggestRecipes,
    suggestMyRecipes,
    addRecipe,
    editRecipe,
    deleteRecipe,
} = require('../controller/recipeController.js');
const authenticate = require('../middleware/authenticate.js');

const router = express.Router();

router.get('/', getRecipes);
// Both of these must stay above '/:id', or Express reads "suggest" as an id.
router.get('/suggest', suggestRecipes);
router.get('/user', authenticate, getMyRecipes);
router.get('/user/suggest', authenticate, suggestMyRecipes);
router.get('/:id', getRecipe);
router.post('/', authenticate, addRecipe);
router.put('/:id', authenticate, editRecipe);
router.delete('/:id', authenticate, deleteRecipe);

module.exports = router;
