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

/** Query-string params are user input; every one of them is clamped here. */
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

/**
 * Shared paging/searching/sorting for the two listing endpoints. `baseMatch`
 * decides *which* recipes are in scope — public ones, or one user's own.
 */
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
        // A recipe has a page of its own now, so this id arrives from the
        // address bar as often as from a card. Anything that is not an id at
        // all is simply not found — findById would otherwise throw a CastError
        // and answer 500 to what is really a typo.
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        const recipe = await Recipes.findById(req.params.id).populate('createdBy', 'name');
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        // And a private one has a URL that can be guessed or passed on. Anyone
        // but its author is told it is not there, rather than that it is there
        // and they may not look — which would confirm it exists.
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
 * Decides what `image`, `thumbnail` and `imagePublicId` should become for one
 * write, uploading to Cloudinary when the request carries a new photo.
 *
 * A newly picked photo arrives as `file` — the binary multipart part, already
 * downscaled and re-encoded by the browser. Everything else is expressed in
 * `body.image`, which has three meanings:
 *
 *   absent      leave the recipe's photo exactly as it is
 *   ''          the photo was removed
 *   https://…   a URL this app wrote earlier, echoed back by the edit form
 *
 * `thumbnail` is never taken from the caller. It is a Cloudinary derivative of
 * the image, so accepting one would only be a way to make the two disagree.
 *
 * @param {object} body
 * @param {object|null} existing  the recipe as stored, on an edit
 * @param {{ buffer: Buffer, mimetype: string }|undefined} file
 * @returns {Promise<{ patch: object, uploaded: string|null, orphan: string|null } | { error: string, status?: number }>}
 */
async function resolveImage(body, existing = null, file = undefined) {
    const nothingToDo = { patch: {}, uploaded: null, orphan: null };

    // The asset the recipe holds now. Once the field points somewhere else it
    // has nobody left to reference it, so it gets swept up after the write.
    const previous = existing?.imagePublicId || null;

    if (file) {
        // Type, size and leading bytes are settled here, before the bytes are
        // handed to anyone else. Cloudinary is never asked to arbitrate what
        // counts as an image, and a bad upload costs no bandwidth to reject.
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
        // Already empty: say so rather than issuing a pointless $set.
        if (existing && !existing.image) return nothingToDo;
        return {
            patch: { image: '', thumbnail: '', imagePublicId: '' },
            uploaded: null,
            orphan: previous,
        };
    }

    // The overwhelmingly common case: an edit that did not touch the photo.
    // Returning an empty patch keeps the derived thumbnail and the public id
    // in place, which re-sending the URL on its own could not. Tested before
    // the ownership check so that changing or dropping the credentials later
    // cannot make an existing recipe uneditable.
    if (existing && body.image === existing.image) return nothingToDo;

    if (isStoredImageUrl(body.image)) {
        // A URL on our cloud that this recipe was not already using. It is
        // safe to point at, but the asset belongs to some other document, so
        // no public id is recorded — this recipe must never be able to delete
        // a photo it does not own.
        const thumbnail = isStoredImageUrl(body.thumbnail) ? body.thumbnail : body.image;
        return {
            patch: { image: body.image, thumbnail, imagePublicId: '' },
            uploaded: null,
            orphan: previous,
        };
    }

    return { error: 'A photo has to be uploaded as a file, not sent as a link.' };
}

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
    // Tracked outside the try so a failure *after* the upload can clean up the
    // asset it left behind on Cloudinary.
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

        // Kept to whole minutes so the "quickest" sort has something to work
        // with — the listing converts this field to a number.
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

        // Last, because it is the only step that leaves the machine: every
        // cheap reason to reject this request has already been ruled out, so
        // nothing is uploaded for a recipe that was about to be refused.
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
        // The recipe was never written, so an uploaded photo now belongs to
        // nothing. Best effort — the original error is what matters here.
        await destroyImage(uploaded);
        next(err);
    }
};

// Edit a recipe
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

        // An edit sends only what it means to change, so an absent field is
        // left alone — but one that arrives blank would wipe a column the
        // schema calls required, and findByIdAndUpdate runs no validators.
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

        // Either list can be missing from an edit, so the check runs against
        // what the recipe would end up with rather than what was sent.
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

        // Only now that the document points somewhere else is the photo it used
        // to point at safe to remove. Awaited rather than left running: on a
        // serverless host the process can be frozen the moment the response
        // goes out, and a detached promise would simply never finish.
        if (photo.orphan) await destroyImage(photo.orphan);

        return res.json(updated);
    } catch (err) {
        await destroyImage(uploaded);
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
        // And the photo would sit in Cloudinary forever, billed for, with the
        // only record of its existence now deleted.
        await destroyImage(recipe.imagePublicId);

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
