const mongoose = require('mongoose');

/** One row per (user, recipe) pair. See docs/BACKEND.md. */
const recipeInteractionSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    recipe: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipes',
        required: true,
    },
    liked: {
        type: Boolean,
        default: false,
    },
    favourited: {
        type: Boolean,
        default: false,
    },
    // Separate, so the two lists order independently.
    likedAt: {
        type: Date,
        default: null,
    },
    favouritedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

// Enforces one row per pair; the controller retries on its duplicate error.
recipeInteractionSchema.index({ user: 1, recipe: 1 }, { unique: true });

// Partial: each index holds only the rows where its flag is set.
recipeInteractionSchema.index(
    { user: 1, favouritedAt: -1 },
    { partialFilterExpression: { favourited: true } },
);
recipeInteractionSchema.index(
    { user: 1, likedAt: -1 },
    { partialFilterExpression: { liked: true } },
);

// For cleanup after a deleted recipe.
recipeInteractionSchema.index({ recipe: 1 });

module.exports = mongoose.model('RecipeInteraction', recipeInteractionSchema);
