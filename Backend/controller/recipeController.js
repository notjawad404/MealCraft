const mongoose = require('mongoose');
const Recipes = require('../model/recipeModel');
const RecipeInteraction = require('../model/recipeInteractionModel');
const { inspectImageDataUrl, MAX_THUMBNAIL_BYTES } = require('../utils/imageData');
const { normalizeVideoUrl } = require('../utils/videoUrl');
const {
    normalizeAllergens,
    normalizeDiets,
    normalizeMealTypes,
    normalizeRegions,
    normalizeCountries,
    findDietConflict,
} = require('../utils/recipeTags');
const { normalizeServings, normalizeCalories, normalizeNutrients } = require('../utils/nutrition');

const text = (value) => (typeof value === 'string' ? value.trim() : '');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_MINUTES = 2880; // two days, which covers proving, curing and brining

// `time` is a string on the schema, so it is converted for sorting. Anything
// that will not convert is parked at the end of the ascending order rather than
// the front, which is what someone scanning for "quickest" actually wants.
const UNSORTABLE_TIME = 10 ** 7;

const SORTS = {
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    title: { titleSort: 1, _id: 1 },
    quickest: { timeSort: 1, _id: 1 },
    longest: { timeSort: -1, _id: -1 },
};

const DEFAULT_SORT = 'newest';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Positive whole minutes, or null if the value is not usable. */
const parseMinutes = (value) => {
    if (!/^\d+$/.test(value)) return null;
    const minutes = Number(value);
    return minutes >= 1 && minutes <= MAX_MINUTES ? minutes : null;
};

/** Query-string params are user input; every one of them is clamped here. */
const parseListQuery = (query) => {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(query.limit, 10) || DEFAULT_LIMIT));
    const sort = Object.hasOwn(SORTS, query.sort) ? query.sort : DEFAULT_SORT;
    const search = text(query.search).slice(0, 100);
    return { page, limit, sort, search };
};

/**
 * Shared paging/searching/sorting for the two listing endpoints. `baseMatch`
 * decides *which* recipes are in scope — public ones, or one user's own.
 */
async function listRecipes(baseMatch, query) {
    const { page, limit, sort, search } = parseListQuery(query);

    const match = { ...baseMatch };
    if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i');
        match.$or = [{ title: pattern }, { ingredients: pattern }];
    }

    const [facet] = await Recipes.aggregate([
        { $match: match },
        {
            $addFields: {
                titleSort: { $toLower: '$title' },
                timeSort: {
                    $convert: { input: '$time', to: 'int', onError: UNSORTABLE_TIME, onNull: UNSORTABLE_TIME },
                },
                // Recipes saved before thumbnails existed only have the full
                // image; falling back keeps their cards from going blank.
                thumbnail: { $ifNull: ['$thumbnail', '$image'] },
            },
        },
        // Dropped before the sort, so the base64 payload is never carried
        // through it. Everything past this point is small. The nutrient table
        // goes the same way: cards show the calorie figure and nothing else,
        // and the dialog fetches the whole recipe anyway.
        { $project: { image: 0, instructions: 0, nutrients: 0 } },
        { $sort: SORTS[sort] },
        {
            $facet: {
                results: [
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
                    { $project: { titleSort: 0, timeSort: 0, __v: 0 } },
                ],
                total: [{ $count: 'value' }],
            },
        },
    ]);

    const total = facet?.total?.[0]?.value ?? 0;

    return {
        recipes: facet?.results ?? [],
        page,
        limit,
        sort,
        search,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
    };
}

const SUGGESTION_LIMIT = 5;

/**
 * Titles only, for the search box's type-ahead. Deliberately narrower than the
 * listing search, which also looks inside ingredients: a dropdown of titles
 * that do not visibly contain what you typed reads as broken.
 */
async function suggestTitles(baseMatch, query) {
    const search = text(query.search).slice(0, 100);
    if (!search) return [];

    return Recipes.find({ ...baseMatch, title: new RegExp(escapeRegex(search), 'i') })
        .select('title')
        .sort({ title: 1 })
        .collation({ locale: 'en', strength: 2 }) // so "apple" is not exiled below "Zabaglione"
        .limit(SUGGESTION_LIMIT)
        .lean();
}

// Title suggestions across public recipes
const suggestRecipes = async (req, res, next) => {
    try {
        return res.json({ suggestions: await suggestTitles({ isPublic: true }, req.query) });
    } catch (err) {
        next(err);
    }
};

// Title suggestions across the logged-in user's own recipes
const suggestMyRecipes = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.user.userId)) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        const createdBy = new mongoose.Types.ObjectId(req.user.userId);

        return res.json({ suggestions: await suggestTitles({ createdBy }, req.query) });
    } catch (err) {
        next(err);
    }
};

// Get public recipes — paged, searchable, sortable
const getRecipes = async (req, res, next) => {
    try {
        return res.json(await listRecipes({ isPublic: true }, req.query));
    } catch (err) {
        next(err);
    }
};

// Get recipes belonging to the logged-in user (public + private)
const getMyRecipes = async (req, res, next) => {
    try {
        // $match does no schema-aware casting the way find() does, so the id
        // off the token has to be converted by hand — as a string it silently
        // matches nothing at all.
        if (!mongoose.isValidObjectId(req.user.userId)) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        const createdBy = new mongoose.Types.ObjectId(req.user.userId);

        return res.json(await listRecipes({ createdBy }, req.query));
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

/**
 * Checks the two base64 fields on a write. Returns an error message, or null
 * when both are fine (or absent).
 */
const checkImages = ({ image, thumbnail }) => {
    if (image) {
        const check = inspectImageDataUrl(image);
        if (!check.ok) return check.message;
    }
    if (thumbnail) {
        const check = inspectImageDataUrl(thumbnail, {
            maxBytes: MAX_THUMBNAIL_BYTES,
            label: 'Thumbnail',
        });
        if (!check.ok) return check.message;
    }
    return null;
};

// Every optional field, paired with the function that vets it. Each normalizer
// answers `{ ok: true, <key>: value }` or `{ ok: false, message }`, so the loop
// below does not need to know anything about what it is checking.
const OPTIONAL_FIELDS = [
    ['allergens', normalizeAllergens],
    ['diets', normalizeDiets],
    ['mealTypes', normalizeMealTypes],
    ['regions', normalizeRegions],
    ['countries', normalizeCountries],
    ['servings', normalizeServings],
    ['calories', normalizeCalories],
    ['nutrients', normalizeNutrients],
];

/**
 * Validates every optional field off a request body: the video link, the
 * allergen and dietary lists, when and where the food is eaten, and the
 * per-serving figures.
 *
 * Keys the caller did not send are left out of the returned patch entirely, so
 * the same helper backs both the create — where absent means "none", handled
 * by the schema defaults — and the edit, where absent means "leave alone".
 *
 * @returns {{ patch: object } | { error: string }}
 */
const readOptionalFields = (body) => {
    const patch = {};

    if (body.videoUrl !== undefined) {
        const raw = text(body.videoUrl);
        if (!raw) {
            patch.videoUrl = ''; // an emptied field is how the link is removed
        } else {
            const link = normalizeVideoUrl(raw);
            if (!link.ok) return { error: link.message };
            patch.videoUrl = link.url;
        }
    }

    for (const [key, normalize] of OPTIONAL_FIELDS) {
        if (body[key] === undefined) continue;
        const result = normalize(body[key]);
        if (!result.ok) return { error: result.message };
        // Normalizers answer under their own key — `value` for the plain
        // numbers, the field's own name for the lists.
        patch[key] = key in result ? result[key] : result.value;
    }

    return { patch };
};

// Add a new recipe
const addRecipe = async (req, res, next) => {
    try {
        const { image, thumbnail, isPublic } = req.body;
        const title = text(req.body.title);
        const ingredients = text(req.body.ingredients);
        const instructions = text(req.body.instructions);
        const time = text(req.body.time);
        const username = text(req.body.username);

        if (!title || !ingredients || !instructions || !time || !username) {
            return res.status(400).json({ message: 'Required parameters missing' });
        }

        // Kept to whole minutes so the "quickest" sort has something to work
        // with — the listing converts this field to a number.
        if (parseMinutes(time) === null) {
            return res.status(400).json({ message: `Time must be whole minutes between 1 and ${MAX_MINUTES}.` });
        }

        // The images are base64 data URIs that get stored on the document, so
        // they are vetted before they can bloat the collection.
        const imageError = checkImages(req.body);
        if (imageError) {
            return res.status(400).json({ message: imageError });
        }

        const optional = readOptionalFields(req.body);
        if (optional.error) {
            return res.status(400).json({ message: optional.error });
        }

        const conflict = findDietConflict(optional.patch.diets, optional.patch.allergens);
        if (conflict) {
            return res.status(400).json({ message: conflict });
        }

        const recipe = await Recipes.create({
            title,
            ingredients,
            instructions,
            time,
            image: image || undefined,
            thumbnail: thumbnail || undefined,
            ...optional.patch,
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

        const { title, ingredients, instructions, time, image, thumbnail, isPublic } = req.body;

        if (time !== undefined && parseMinutes(text(time)) === null) {
            return res.status(400).json({ message: `Time must be whole minutes between 1 and ${MAX_MINUTES}.` });
        }

        const imageError = checkImages(req.body);
        if (imageError) {
            return res.status(400).json({ message: imageError });
        }

        const optional = readOptionalFields(req.body);
        if (optional.error) {
            return res.status(400).json({ message: optional.error });
        }

        // Either list can be missing from an edit, so the check runs against
        // what the recipe would end up with rather than what was sent.
        const conflict = findDietConflict(
            optional.patch.diets ?? recipe.diets,
            optional.patch.allergens ?? recipe.allergens,
        );
        if (conflict) {
            return res.status(400).json({ message: conflict });
        }

        const patch = { title, ingredients, instructions, time, image, thumbnail, ...optional.patch };
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
        // Otherwise every user who saved it keeps a row pointing at nothing,
        // and their favourites page quietly comes up one short.
        await RecipeInteraction.deleteMany({ recipe: recipe._id });

        return res.json({ message: 'Recipe deleted' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    // Not a route handler: controller/interactionController.js reuses it so the
    // favourites and likes pages page, search and sort exactly as these do.
    listRecipes,
    getRecipes,
    getMyRecipes,
    getRecipe,
    suggestRecipes,
    suggestMyRecipes,
    addRecipe,
    editRecipe,
    deleteRecipe,
};
