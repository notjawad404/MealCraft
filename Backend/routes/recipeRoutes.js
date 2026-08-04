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
// Every one of these must stay above '/:id', or Express reads the first
// segment — "suggest", "saved" — as an id.
router.get('/suggest', suggestRecipes);
router.get('/user', authenticate, getMyRecipes);
router.get('/user/suggest', authenticate, suggestMyRecipes);

// Backing for the favourites and likes pages, which do not exist yet.
router.get('/saved/ids', authenticate, getSavedIds);
router.get('/saved/likes', authenticate, getLikedRecipes);
router.get('/saved/favourites', authenticate, getFavouriteRecipes);

// Open to everyone, but a private recipe is only found by its author — hence
// the token being read here rather than required.
router.get('/:id', optionalAuthenticate, getRecipe);
// Authenticated first: an unauthenticated request should be turned away before
// a megabyte of photo is read off the wire, not after.
router.post('/', authenticate, recipeUpload, addRecipe);
router.put('/:id', authenticate, recipeUpload, editRecipe);
router.delete('/:id', authenticate, deleteRecipe);

// Set and unset rather than toggle: two taps racing each other still end up
// somewhere predictable. Both are safe to repeat.
router.put('/:id/like', authenticate, likeRecipe);
router.delete('/:id/like', authenticate, unlikeRecipe);
router.put('/:id/favourite', authenticate, favouriteRecipe);
router.delete('/:id/favourite', authenticate, unfavouriteRecipe);

module.exports = router;
