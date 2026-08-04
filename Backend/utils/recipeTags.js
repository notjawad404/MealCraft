// Recipe tag vocabularies. See docs/BACKEND.md.

// The fourteen declarable allergens. Free text is accepted alongside these.
const ALLERGENS = [
    'peanuts',
    'tree-nuts',
    'dairy',
    'eggs',
    'gluten',
    'soy',
    'fish',
    'shellfish',
    'molluscs',
    'sesame',
    'mustard',
    'celery',
    'lupin',
    'sulphites',
];

// Diets a recipe can be marked suitable for. Closed vocabulary.
const DIETS = [
    'halal',
    'kosher',
    'vegan',
    'vegetarian',
    'pescatarian',
    'gluten-free',
    'dairy-free',
    'nut-free',
    'egg-free',
    'alcohol-free',
    'low-carb',
    'keto',
    'paleo',
];

// Allergens each diet rules out.
const DIET_EXCLUDES = {
    vegan: ['dairy', 'eggs', 'fish', 'shellfish', 'molluscs'],
    vegetarian: ['fish', 'shellfish', 'molluscs'],
    'gluten-free': ['gluten'],
    'dairy-free': ['dairy'],
    'nut-free': ['peanuts', 'tree-nuts'],
    'egg-free': ['eggs'],
};

// When in the day the recipe is for. A recipe can be several at once.
const MEAL_TYPES = [
    'breakfast',
    'brunch',
    'lunch',
    'dinner',
    'snack',
    'appetizer',
    'side',
    'dessert',
    'drink',
];

// Culinary regions. Countries beside these are free text.
const REGIONS = [
    'north-african',
    'west-african',
    'east-african',
    'southern-african',
    'middle-eastern',
    'levantine',
    'south-asian',
    'southeast-asian',
    'east-asian',
    'central-asian',
    'mediterranean',
    'western-european',
    'eastern-european',
    'nordic',
    'north-american',
    'latin-american',
    'caribbean',
    'oceanian',
];

const MAX_ALLERGENS = 20;
const MAX_ALLERGEN_LENGTH = 40;
const MAX_MEAL_TYPES = MEAL_TYPES.length;
const MAX_REGIONS = 6;
const MAX_COUNTRIES = 6;
const MAX_COUNTRY_LENGTH = 60;

// Free text: opens with a letter or digit, then ordinary punctuation only.
const PLAIN_WORDS = /^[\p{L}\p{N}][\p{L}\p{N} '&(),./-]*$/u;

const reject = (message) => ({ ok: false, message });

const ALLERGEN_SET = new Set(ALLERGENS);
const DIET_SET = new Set(DIETS);
const MEAL_TYPE_SET = new Set(MEAL_TYPES);
const REGION_SET = new Set(REGIONS);

/** Trim, lower-case and de-duplicate a list of tags. */
function cleanList(value, { field, preserveCase = false }) {
    if (value === null) return { ok: true, list: [] };
    if (!Array.isArray(value)) {
        return reject(`${field} must be a list.`);
    }

    const seen = new Set();
    const list = [];

    for (const entry of value) {
        if (typeof entry !== 'string') {
            return reject(`Every entry in ${field.toLowerCase()} must be text.`);
        }
        const cleaned = entry.trim().replace(/\s+/g, ' ');
        const key = cleaned.toLowerCase();
        if (!cleaned || seen.has(key)) continue;
        seen.add(key);
        list.push(preserveCase ? cleaned : key);
    }

    return { ok: true, list };
}

/**
 * Validate a recipe's allergens. Unknown values are kept as free text.
 *
 * @returns {{ ok: true, allergens: string[] } | { ok: false, message: string }}
 */
function normalizeAllergens(value) {
    if (value === undefined) return { ok: true, allergens: [] };

    const cleaned = cleanList(value, { field: 'Allergens' });
    if (!cleaned.ok) return cleaned;

    const { list } = cleaned;
    if (list.length > MAX_ALLERGENS) {
        return reject(`A recipe can list up to ${MAX_ALLERGENS} allergens.`);
    }

    for (const allergen of list) {
        if (ALLERGEN_SET.has(allergen)) continue;
        if (allergen.length > MAX_ALLERGEN_LENGTH) {
            return reject(`Keep each allergen under ${MAX_ALLERGEN_LENGTH} characters.`);
        }
        if (!PLAIN_WORDS.test(allergen)) {
            return reject(`“${allergen}” is not a usable allergen — use plain words.`);
        }
    }

    return { ok: true, allergens: list };
}

/**
 * Validate a list against a closed vocabulary.
 *
 * @returns {{ ok: true, list: string[] } | { ok: false, message: string }}
 */
function normalizeChoices(value, { allowed, field, max, plural, singular }) {
    if (value === undefined) return { ok: true, list: [] };

    const cleaned = cleanList(value, { field });
    if (!cleaned.ok) return cleaned;

    if (cleaned.list.length > max) {
        return reject(`A recipe can have up to ${max} ${plural}.`);
    }

    for (const entry of cleaned.list) {
        if (!allowed.has(entry)) {
            return reject(`“${entry}” is not ${singular} we know about.`);
        }
    }

    return cleaned;
}

/** Meal types. Closed vocabulary. */
function normalizeMealTypes(value) {
    const result = normalizeChoices(value, {
        allowed: MEAL_TYPE_SET,
        field: 'Meal types',
        max: MAX_MEAL_TYPES,
        plural: 'meal types',
        singular: 'a meal type',
    });
    return result.ok ? { ok: true, mealTypes: result.list } : result;
}

/** Culinary regions. Closed vocabulary. */
function normalizeRegions(value) {
    const result = normalizeChoices(value, {
        allowed: REGION_SET,
        field: 'Regions',
        max: MAX_REGIONS,
        plural: 'regions',
        singular: 'a region',
    });
    return result.ok ? { ok: true, regions: result.list } : result;
}

/** Countries the recipe belongs to. Free text, capitalisation preserved. */
function normalizeCountries(value) {
    if (value === undefined) return { ok: true, countries: [] };

    const cleaned = cleanList(value, { field: 'Countries', preserveCase: true });
    if (!cleaned.ok) return cleaned;

    if (cleaned.list.length > MAX_COUNTRIES) {
        return reject(`A recipe can name up to ${MAX_COUNTRIES} countries.`);
    }

    for (const country of cleaned.list) {
        if (country.length > MAX_COUNTRY_LENGTH) {
            return reject(`Keep each country under ${MAX_COUNTRY_LENGTH} characters.`);
        }
        if (!PLAIN_WORDS.test(country)) {
            return reject(`“${country}” is not a usable country name — use plain words.`);
        }
    }

    return { ok: true, countries: cleaned.list };
}

/**
 * Validate a recipe's diets. Closed vocabulary.
 *
 * @returns {{ ok: true, diets: string[] } | { ok: false, message: string }}
 */
function normalizeDiets(value) {
    if (value === undefined) return { ok: true, diets: [] };

    const cleaned = cleanList(value, { field: 'Dietary suitability' });
    if (!cleaned.ok) return cleaned;

    for (const diet of cleaned.list) {
        if (!DIET_SET.has(diet)) {
            return reject(`“${diet}” is not a dietary option we know about.`);
        }
    }

    return { ok: true, diets: cleaned.list };
}

/** The first diet/allergen contradiction, or null. */
function findDietConflict(diets = [], allergens = []) {
    const declared = new Set(allergens);

    for (const diet of diets) {
        const clash = (DIET_EXCLUDES[diet] ?? []).find((allergen) => declared.has(allergen));
        if (clash) {
            return `This recipe is marked ${diet} but lists ${clash} as an allergen. Remove one of the two.`;
        }
    }

    return null;
}

module.exports = {
    ALLERGENS,
    DIETS,
    DIET_EXCLUDES,
    MEAL_TYPES,
    REGIONS,
    MAX_ALLERGENS,
    MAX_ALLERGEN_LENGTH,
    MAX_REGIONS,
    MAX_COUNTRIES,
    normalizeAllergens,
    normalizeDiets,
    normalizeMealTypes,
    normalizeRegions,
    normalizeCountries,
    findDietConflict,
};
