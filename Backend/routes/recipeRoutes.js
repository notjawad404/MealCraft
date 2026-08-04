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
const {
    likeRecipe,
    unlikeRecipe,
    favouriteRecipe,
    unfavouriteRecipe,
    getLikedRecipes,
    getFavouriteRecipes,
    getSavedIds,
} = require('../controller/interactionController.js');
const authenticate = require('../middleware/authenticate.js');
const optionalAuthenticate = require('../middleware/optionalAuthenticate.js');
const recipeUpload = require('../middleware/recipeUpload.js');

const router = express.Router();

router.get('/', getRecipes);
// These must stay above '/:id', or their first segment is read as an id.
router.get('/suggest', suggestRecipes);
router.get('/user', authenticate, getMyRecipes);
router.get('/user/suggest', authenticate, suggestMyRecipes);

// Backing for the favourites and likes pages, which do not exist yet.
router.get('/saved/ids', authenticate, getSavedIds);
router.get('/saved/likes', authenticate, getLikedRecipes);
router.get('/saved/favourites', authenticate, getFavouriteRecipes);

// Token read rather than required: a private recipe is found only by its author.
router.get('/:id', optionalAuthenticate, getRecipe);
// Authenticated before the upload middleware reads the photo off the wire.
router.post('/', authenticate, recipeUpload, addRecipe);
router.put('/:id', authenticate, recipeUpload, editRecipe);
router.delete('/:id', authenticate, deleteRecipe);

// Set and unset rather than toggle; both are safe to repeat.
router.put('/:id/like', authenticate, likeRecipe);
router.delete('/:id/like', authenticate, unlikeRecipe);
router.put('/:id/favourite', authenticate, favouriteRecipe);
router.delete('/:id/favourite', authenticate, unfavouriteRecipe);

module.exports = router;
