const Recipes = require('../model/recipeModel');
const { inspectImageDataUrl } = require('../utils/imageData');

const text = (value) => (typeof value === 'string' ? value.trim() : '');

// Get all recipes
const getRecipes = async (req, res, next) => {
    try {
        const recipes = await Recipes.find({ isPublic: true }).populate('createdBy', 'name');
        return res.json(recipes);
    } catch (err) {
        next(err);
    }
};

// Get all recipes belonging to the logged-in user (public + private)
const getMyRecipes = async (req, res, next) => {
    try {
        const recipes = await Recipes.find({ createdBy: req.user.userId });
        return res.json(recipes);
    } catch (err) {
        next(err);
    }
};

// Get recipe by ID
const getRecipe = async (req, res, next) => {
    try {
        const recipe = await Recipes.findById(req.params.id).populate('createdBy', 'name');
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }
        return res.json(recipe);
    } catch (err) {
        next(err);
    }
};

// Add a new recipe
const addRecipe = async (req, res, next) => {
    try {
        const { image, isPublic } = req.body;
        const title = text(req.body.title);
        const ingredients = text(req.body.ingredients);
        const instructions = text(req.body.instructions);
        const time = text(req.body.time);
        const username = text(req.body.username);

        if (!title || !ingredients || !instructions || !time || !username) {
            return res.status(400).json({ message: 'Required parameters missing' });
        }

        // The image is a base64 data URI that gets stored on the document, so it
        // is vetted before it can bloat the collection with something unusable.
        if (image) {
            const check = inspectImageDataUrl(image);
            if (!check.ok) {
                return res.status(400).json({ message: check.message });
            }
        }

        const recipe = await Recipes.create({
            title,
            ingredients,
            instructions,
            time,
            image: image || undefined,
            username,
            createdBy: req.user.userId,
            isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
        });

        return res.status(201).json(recipe);
    } catch (err) {
        next(err);
    }
};

// Edit a recipe
const editRecipe = async (req, res, next) => {
    try {
        const recipe = await Recipes.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        if (recipe.createdBy?.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to edit this recipe' });
        }

        const { title, ingredients, instructions, time, image, isPublic } = req.body;

        if (image) {
            const check = inspectImageDataUrl(image);
            if (!check.ok) {
                return res.status(400).json({ message: check.message });
            }
        }

        const patch = { title, ingredients, instructions, time, image };
        if (isPublic !== undefined) patch.isPublic = Boolean(isPublic);
        const updated = await Recipes.findByIdAndUpdate(req.params.id, patch, { new: true });

        return res.json(updated);
    } catch (err) {
        next(err);
    }
};

// Delete a recipe
const deleteRecipe = async (req, res, next) => {
    try {
        const recipe = await Recipes.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        if (recipe.createdBy?.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to delete this recipe' });
        }

        await Recipes.findByIdAndDelete(req.params.id);
        return res.json({ message: 'Recipe deleted' });
    } catch (err) {
        next(err);
    }
};

module.exports = { getRecipes, getMyRecipes, getRecipe, addRecipe, editRecipe, deleteRecipe };
