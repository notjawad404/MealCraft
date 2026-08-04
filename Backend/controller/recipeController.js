const mongoose = require('mongoose');
const Recipes = require('../model/recipeModel');
const RecipeInteraction = require('../model/recipeInteractionModel');
const { inspectImageBuffer } = require('../utils/imageData');
const {
    ImageStoreError,
    isStoredImageUrl,
    uploadImage,
    destroyImage,
} = require('../utils/imageStore');
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
const MAX_MINUTES = 2880;

// Unparsable times sort last.
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

/** Positive whole minutes, or null. */
const parseMinutes = (value) => {
    if (!/^\d+$/.test(value)) return null;
    const minutes = Number(value);
    return minutes >= 1 && minutes <= MAX_MINUTES ? minutes : null;
};

const parseArrayParam = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
        return val.flatMap((v) => (typeof v === 'string' ? v.split(',') : [])).map((s) => s.trim().toLowerCase()).filter(Boolean);
    }
    if (typeof val === 'string') {
        return val.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    }
    return [];
};

const parseStringArrayParam = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
        return val.flatMap((v) => (typeof v === 'string' ? v.split(',') : [])).map((s) => s.trim()).filter(Boolean);
    }
    if (typeof val === 'string') {
        return val.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
};

/** Clamps every list query param. */
const parseListQuery = (query) => {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(query.limit, 10) || DEFAULT_LIMIT));
    const sort = Object.hasOwn(SORTS, query.sort) ? query.sort : DEFAULT_SORT;
    const search = text(query.search).slice(0, 100);

    const mealTypes = parseArrayParam(query.mealType || query.mealTypes);
    const regions = parseArrayParam(query.region || query.regions);
    const countries = parseStringArrayParam(query.country || query.countries);
    const diets = parseArrayParam(query.diet || query.diets);
    const exclude = parseArrayParam(query.exclude);

    const rawCalories = Number.parseInt(query.maxCalories, 10);
    const maxCalories = Number.isFinite(rawCalories) && rawCalories > 0 ? rawCalories : null;

    const rawTime = Number.parseInt(query.maxTime, 10);
    const maxTime = Number.isFinite(rawTime) && rawTime > 0 ? rawTime : null;

    return { page, limit, sort, search, mealTypes, regions, countries, diets, exclude, maxCalories, maxTime };
};

/** Shared paging, searching and sorting for the listing endpoints. */
async function listRecipes(baseMatch, query) {
    const { page, limit, sort, search, mealTypes, regions, countries, diets, exclude, maxCalories, maxTime } = parseListQuery(query);

    const match = { ...baseMatch };

    const andConditions = [];

    if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i');
        andConditions.push({ $or: [{ title: pattern }, { ingredients: pattern }] });
    }

    if (mealTypes.length > 0) {
        andConditions.push({ mealTypes: { $in: mealTypes } });
    }

    if (regions.length > 0) {
        andConditions.push({ regions: { $in: regions } });
    }

    if (countries.length > 0) {
        const countryRegexes = countries.map((c) => new RegExp(escapeRegex(c), 'i'));
        andConditions.push({ countries: { $in: countryRegexes } });
    }

    if (diets.length > 0) {
        andConditions.push({ diets: { $all: diets } });
    }

    if (exclude.length > 0) {
        andConditions.push({ allergens: { $nin: exclude } });
        for (const term of exclude) {
            andConditions.push({ ingredients: { $not: new RegExp(escapeRegex(term), 'i') } });
        }
    }

    if (maxCalories !== null) {
        andConditions.push({ calories: { $lte: maxCalories, $ne: null } });
    }

    if (andConditions.length > 0) {
        match.$and = andConditions;
    }

    const pipeline = [{ $match: match }];

    pipeline.push({
        $addFields: {
            titleSort: { $toLower: '$title' },
            timeSort: {
                $convert: { input: '$time', to: 'int', onError: UNSORTABLE_TIME, onNull: UNSORTABLE_TIME },
            },
            thumbnail: { $ifNull: ['$thumbnail', '$image'] },
        },
    });

    if (maxTime !== null) {
        pipeline.push({ $match: { timeSort: { $lte: maxTime } } });
    }

    pipeline.push(
        { $project: { image: 0, instructions: 0, nutrients: 0, imagePublicId: 0 } },
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
    );

    const [facet] = await Recipes.aggregate(pipeline);

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

/** Matching titles for the search box type-ahead. */
async function suggestTitles(baseMatch, query) {
    const search = text(query.search).slice(0, 100);
    if (!search) return [];

    return Recipes.find({ ...baseMatch, title: new RegExp(escapeRegex(search), 'i') })
        .select('title')
        .sort({ title: 1 })
        .collation({ locale: 'en', strength: 2 })
        .limit(SUGGESTION_LIMIT)
        .lean();
}

// Title suggestions across public recipes.
const suggestRecipes = async (req, res, next) => {
    try {
        return res.json({ suggestions: await suggestTitles({ isPublic: true }, req.query) });
    } catch (err) {
        next(err);
    }
};

// Title suggestions across the logged-in user's own recipes.
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

// Public recipes: paged, searchable, sortable.
const getRecipes = async (req, res, next) => {
    try {
        return res.json(await listRecipes({ isPublic: true }, req.query));
    } catch (err) {
        next(err);
    }
};

// The logged-in user's own recipes, public and private.
const getMyRecipes = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.user.userId)) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        const createdBy = new mongoose.Types.ObjectId(req.user.userId);

        return res.json(await listRecipes({ createdBy }, req.query));
    } catch (err) {
        next(err);
    }
};

// One recipe by id.
const getRecipe = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        const recipe = await Recipes.findById(req.params.id).populate('createdBy', 'name');
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        // A private recipe reads as missing to anyone but its author.
        const ownerId = (recipe.createdBy?._id ?? recipe.createdBy)?.toString();
        if (!recipe.isPublic && (!req.user || req.user.userId !== ownerId)) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        return res.json(recipe);
    } catch (err) {
        next(err);
    }
};

/**
 * Resolves `image`, `thumbnail` and `imagePublicId` for one write.
 *
 * @param {object} body
 * @param {object|null} existing  the recipe as stored, on an edit
 * @param {{ buffer: Buffer, mimetype: string }|undefined} file
 * @returns {Promise<{ patch: object, uploaded: string|null, orphan: string|null } | { error: string, status?: number }>}
 */
async function resolveImage(body, existing = null, file = undefined) {
    const nothingToDo = { patch: {}, uploaded: null, orphan: null };

    const previous = existing?.imagePublicId || null;

    if (file) {
        const check = inspectImageBuffer(file.buffer, file.mimetype);
        if (!check.ok) return { error: check.message };

        try {
            const stored = await uploadImage(file.buffer);
            return {
                patch: { image: stored.image, thumbnail: stored.thumbnail, imagePublicId: stored.publicId },
                uploaded: stored.publicId,
                orphan: previous,
            };
        } catch (err) {
            if (err instanceof ImageStoreError) return { error: err.message, status: 502 };
            throw err;
        }
    }

    if (body.image === undefined) return nothingToDo;

    if (!body.image) {
        if (existing && !existing.image) return nothingToDo;
        return {
            patch: { image: '', thumbnail: '', imagePublicId: '' },
            uploaded: null,
            orphan: previous,
        };
    }

    // An edit that did not touch the photo.
    if (existing && body.image === existing.image) return nothingToDo;

    if (isStoredImageUrl(body.image)) {
        // No public id: the asset belongs to another document.
        const thumbnail = isStoredImageUrl(body.thumbnail) ? body.thumbnail : body.image;
        return {
            patch: { image: body.image, thumbnail, imagePublicId: '' },
            uploaded: null,
            orphan: previous,
        };
    }

    return { error: 'A photo has to be uploaded as a file, not sent as a link.' };
}

// Optional fields paired with their normalizer.
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
 * Validates the optional fields off a request body. Keys the caller did not
 * send are left out of the patch.
 *
 * @returns {{ patch: object } | { error: string }}
 */
const readOptionalFields = (body) => {
    const patch = {};

    if (body.videoUrl !== undefined) {
        const raw = text(body.videoUrl);
        if (!raw) {
            patch.videoUrl = '';
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
        patch[key] = key in result ? result[key] : result.value;
    }

    return { patch };
};

// Add a new recipe.
const addRecipe = async (req, res, next) => {
    // Outside the try so a later failure can clean the uploaded asset up.
    let uploaded = null;
    try {
        const { isPublic } = req.body;
        const title = text(req.body.title);
        const ingredients = text(req.body.ingredients);
        const instructions = text(req.body.instructions);
        const time = text(req.body.time);
        const username = text(req.body.username);

        if (!title || !ingredients || !instructions || !time || !username) {
            return res.status(400).json({ message: 'Required parameters missing' });
        }

        if (parseMinutes(time) === null) {
            return res.status(400).json({ message: `Time must be whole minutes between 1 and ${MAX_MINUTES}.` });
        }

        const optional = readOptionalFields(req.body);
        if (optional.error) {
            return res.status(400).json({ message: optional.error });
        }

        const conflict = findDietConflict(optional.patch.diets, optional.patch.allergens);
        if (conflict) {
            return res.status(400).json({ message: conflict });
        }

        // Last, so nothing is uploaded for a recipe about to be refused.
        const photo = await resolveImage(req.body, null, req.file);
        if (photo.error) {
            return res.status(photo.status || 400).json({ message: photo.error });
        }
        uploaded = photo.uploaded;

        const recipe = await Recipes.create({
            title,
            ingredients,
            instructions,
            time,
            ...photo.patch,
            ...optional.patch,
            username,
            createdBy: req.user.userId,
            isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
        });

        return res.status(201).json(recipe);
    } catch (err) {
        await destroyImage(uploaded);
        next(err);
    }
};

// Edit a recipe.
const editRecipe = async (req, res, next) => {
    let uploaded = null;
    try {
        const recipe = await Recipes.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        if (recipe.createdBy?.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to edit this recipe' });
        }

        const { title, ingredients, instructions, time, isPublic } = req.body;

        // Absent means "leave alone"; blank would wipe a required column.
        for (const key of ['title', 'ingredients', 'instructions', 'time']) {
            if (req.body[key] !== undefined && !text(req.body[key])) {
                return res.status(400).json({ message: 'Required parameters missing' });
            }
        }

        if (time !== undefined && parseMinutes(text(time)) === null) {
            return res.status(400).json({ message: `Time must be whole minutes between 1 and ${MAX_MINUTES}.` });
        }

        const optional = readOptionalFields(req.body);
        if (optional.error) {
            return res.status(400).json({ message: optional.error });
        }

        // Checked against what the recipe would end up with.
        const conflict = findDietConflict(
            optional.patch.diets ?? recipe.diets,
            optional.patch.allergens ?? recipe.allergens,
        );
        if (conflict) {
            return res.status(400).json({ message: conflict });
        }

        const photo = await resolveImage(req.body, recipe, req.file);
        if (photo.error) {
            return res.status(photo.status || 400).json({ message: photo.error });
        }
        uploaded = photo.uploaded;

        const patch = { title, ingredients, instructions, time, ...photo.patch, ...optional.patch };
        if (isPublic !== undefined) patch.isPublic = Boolean(isPublic);
        const updated = await Recipes.findByIdAndUpdate(req.params.id, patch, { new: true });

        // Awaited: a serverless process can freeze once the response is sent.
        if (photo.orphan) await destroyImage(photo.orphan);

        return res.json(updated);
    } catch (err) {
        await destroyImage(uploaded);
        next(err);
    }
};

// Delete a recipe.
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
        await RecipeInteraction.deleteMany({ recipe: recipe._id });
        await destroyImage(recipe.imagePublicId);

        return res.json({ message: 'Recipe deleted' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    // Not a route handler — reused by interactionController.
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
