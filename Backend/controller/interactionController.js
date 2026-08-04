const mongoose = require('mongoose');
const Recipes = require('../model/recipeModel');
const RecipeInteraction = require('../model/recipeInteractionModel');
const { listRecipes } = require('./recipeController');

// Both interactions share one shape; the handlers are built from this.
const KINDS = {
    like: { flag: 'liked', at: 'likedAt', counter: 'likeCount' },
    favourite: { flag: 'favourited', at: 'favouritedAt', counter: 'favouriteCount' },
};

const DUPLICATE_KEY = 11000;

/** The recipe, or null if this user may not see it. */
async function findVisibleRecipe(recipeId, userId) {
    if (!mongoose.isValidObjectId(recipeId)) return null;

    const recipe = await Recipes.findById(recipeId).select('isPublic createdBy likeCount favouriteCount');
    if (!recipe) return null;
    if (!recipe.isPublic && recipe.createdBy?.toString() !== userId) return null;

    return recipe;
}

/**
 * Set one flag on this user's row, creating the row if needed.
 *
 * @returns {Promise<boolean>} whether the flag actually moved
 */
async function applyFlag({ user, recipe, kind, on, retry = true }) {
    const { flag, at } = KINDS[kind];

    try {
        const previous = await RecipeInteraction.findOneAndUpdate(
            { user, recipe },
            { $set: { [flag]: on, [at]: on ? new Date() : null } },
            { upsert: true, new: false, setDefaultsOnInsert: true },
        );

        // `previous` is null when this call created the row.
        return Boolean(previous?.[flag]) !== on;
    } catch (err) {
        // Two requests raced to insert; by now the row exists, so retry once.
        if (err?.code === DUPLICATE_KEY && retry) {
            return applyFlag({ user, recipe, kind, on, retry: false });
        }
        throw err;
    }
}

/** PUT/DELETE /recipe/:id/like and /recipe/:id/favourite. Idempotent. */
const setFlag = (kind, on) => async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.user.userId)) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        const recipe = await findVisibleRecipe(req.params.id, req.user.userId);
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        const { flag, counter } = KINDS[kind];
        const user = new mongoose.Types.ObjectId(req.user.userId);

        const changed = await applyFlag({ user, recipe: recipe._id, kind, on });

        let count = recipe[counter] ?? 0;
        if (changed) {
            // The filter on the way down keeps a drifted counter off negatives.
            const filter = on ? { _id: recipe._id } : { _id: recipe._id, [counter]: { $gt: 0 } };
            const updated = await Recipes.findOneAndUpdate(
                filter,
                { $inc: { [counter]: on ? 1 : -1 } },
                { new: true, projection: counter },
            );
            count = updated?.[counter] ?? (on ? count + 1 : 0);
        }

        return res.json({ [flag]: on, [counter]: count });
    } catch (err) {
        next(err);
    }
};

/** The recipe ids this user has flagged, most recent first. */
async function flaggedRecipeIds(user, kind) {
    const { flag, at } = KINDS[kind];

    const rows = await RecipeInteraction.find({ user, [flag]: true })
        .sort({ [at]: -1 })
        .select('recipe')
        .lean();

    return rows.map((row) => row.recipe);
}

/** The listing behind a "my favourites" or "my likes" page. */
const listFlagged = (kind) => async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.user.userId)) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        const user = new mongoose.Types.ObjectId(req.user.userId);
        const ids = await flaggedRecipeIds(user, kind);

        return res.json(
            await listRecipes(
                { _id: { $in: ids }, $or: [{ isPublic: true }, { createdBy: user }] },
                req.query,
            ),
        );
    } catch (err) {
        next(err);
    }
};

/** GET /recipe/saved/ids — this user's liked and favourited ids. */
const getSavedIds = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.user.userId)) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        const user = new mongoose.Types.ObjectId(req.user.userId);
        const rows = await RecipeInteraction.find({
            user,
            $or: [{ liked: true }, { favourited: true }],
        })
            .select('recipe liked favourited')
            .lean();

        return res.json({
            likes: rows.filter((row) => row.liked).map((row) => String(row.recipe)),
            favourites: rows.filter((row) => row.favourited).map((row) => String(row.recipe)),
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    likeRecipe: setFlag('like', true),
    unlikeRecipe: setFlag('like', false),
    favouriteRecipe: setFlag('favourite', true),
    unfavouriteRecipe: setFlag('favourite', false),
    getLikedRecipes: listFlagged('like'),
    getFavouriteRecipes: listFlagged('favourite'),
    getSavedIds,
};
