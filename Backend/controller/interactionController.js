const mongoose = require('mongoose');
const Recipes = require('../model/recipeModel');
const RecipeInteraction = require('../model/recipeInteractionModel');
const { listRecipes } = require('./recipeController');

// Liking and favouriting are the same shape twice over, so they are described
// once and the handlers are built from the description.
const KINDS = {
    like: { flag: 'liked', at: 'likedAt', counter: 'likeCount' },
    favourite: { flag: 'favourited', at: 'favouritedAt', counter: 'favouriteCount' },
};

const DUPLICATE_KEY = 11000;

/**
 * The recipe, if this user is allowed to touch it at all. A private recipe
 * belonging to someone else is not merely unlikeable — it is not theirs to know
 * about, so this reports it missing rather than forbidden.
 */
async function findVisibleRecipe(recipeId, userId) {
    if (!mongoose.isValidObjectId(recipeId)) return null;

    const recipe = await Recipes.findById(recipeId).select('isPublic createdBy likeCount favouriteCount');
    if (!recipe) return null;
    if (!recipe.isPublic && recipe.createdBy?.toString() !== userId) return null;

    return recipe;
}

/**
 * Set one flag on this user's row for this recipe, creating the row if this is
 * the first thing they have ever done about it.
 *
 * Returns whether the flag actually moved. Setting a flag that is already set
 * is not an error — a double-tapped heart, or a retried request, has to end in
 * the same place as a single one — but it must not be counted twice.
 */
async function applyFlag({ user, recipe, kind, on, retry = true }) {
    const { flag, at } = KINDS[kind];

    try {
        const previous = await RecipeInteraction.findOneAndUpdate(
            { user, recipe },
            { $set: { [flag]: on, [at]: on ? new Date() : null } },
            { upsert: true, new: false, setDefaultsOnInsert: true },
        );

        // `previous` is null when this call created the row, and a row that did
        // not exist cannot have had the flag set.
        return Boolean(previous?.[flag]) !== on;
    } catch (err) {
        // Two of this user's requests raced and both tried to insert. The
        // unique index refused the second; by now the row exists, so the same
        // update run again is an ordinary update and settles it.
        if (err?.code === DUPLICATE_KEY && retry) {
            return applyFlag({ user, recipe, kind, on, retry: false });
        }
        throw err;
    }
}

/**
 * PUT/DELETE /recipe/:id/like and /recipe/:id/favourite.
 *
 * Deliberately not one toggle endpoint: a toggle asks the server to work out
 * what the client meant, which two taps in flight at once make unanswerable.
 * "Set it on" and "set it off" both land in a known state however many times
 * they arrive.
 */
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
            // $inc rather than a recount: the whole point of the stored total is
            // that nobody has to count. The guard on the way down stops a
            // counter that has drifted from going negative and staying there.
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

/**
 * The listing behind a future "my favourites" or "my likes" page. Paging,
 * search and sorting come from the same helper the other listings use, so those
 * pages will behave identically to the ones that already exist.
 *
 * A recipe made private after being saved drops out unless the reader owns it —
 * saving something is not a permanent claim on it.
 */
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

/**
 * GET /recipe/saved/ids — every recipe this user has liked or favourited, as
 * two flat lists.
 *
 * This is what lets a heart render filled on any page without asking per card:
 * one small call on load, and the listing pages stay unauthenticated.
 */
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
