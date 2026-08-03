const mongoose = require('mongoose');

/**
 * Who liked and who saved what.
 *
 * One row per (user, recipe) pair, in its own collection, rather than a
 * `likedBy: [ObjectId]` array on the recipe. Two reasons, and the second is the
 * one that matters:
 *
 *   - A recipe document already carries a base64 image. Appending every liker's
 *     id to it would grow an unbounded array inside a document that is read on
 *     every listing, and a popular recipe would eventually meet MongoDB's 16 MB
 *     ceiling. Rows are the shape that does not grow anything.
 *   - "Show me everything I favourited" is a query *by user*. Against an array
 *     on the recipe it means scanning recipes and looking inside each one;
 *     against this collection it is an index seek.
 *
 * Both flags live on the same row because they are the same relationship seen
 * twice: liking a recipe and saving it are two things one person did about one
 * recipe, and keeping them together means one lookup answers both.
 *
 * Unliking clears the flag rather than deleting the row — the row is usually
 * still carrying the other flag, and the partial indexes below mean a cleared
 * flag costs nothing to keep.
 */
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
    // Kept apart from `updatedAt`, and from each other: the two lists are
    // ordered independently, and liking something should not shuffle it to the
    // top of the favourites page.
    likedAt: {
        type: Date,
        default: null,
    },
    favouritedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

// One row per pair — and the only place a double-like can actually be stopped.
// Two requests arriving together both look, both find nothing, and both try to
// insert; this index is what makes the second one fail instead of quietly
// creating a duplicate. The controller catches that failure and retries.
recipeInteractionSchema.index({ user: 1, recipe: 1 }, { unique: true });

// The two future pages, newest first. Partial, so each index holds only the
// rows where its flag is actually set: a user with one favourite and nine
// hundred likes has one entry in the favourites index, not nine hundred and one.
recipeInteractionSchema.index(
    { user: 1, favouritedAt: -1 },
    { partialFilterExpression: { favourited: true } },
);
recipeInteractionSchema.index(
    { user: 1, likedAt: -1 },
    { partialFilterExpression: { liked: true } },
);

// For clearing up after a deleted recipe.
recipeInteractionSchema.index({ recipe: 1 });

module.exports = mongoose.model('RecipeInteraction', recipeInteractionSchema);
