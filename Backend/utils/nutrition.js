// Servings, calories and the per-serving nutrient list. See docs/BACKEND.md.

// Nutrients with a known customary unit. Not a closed list.
const NUTRIENTS = {
    protein: 'g',
    carbohydrates: 'g',
    sugars: 'g',
    fibre: 'g',
    fat: 'g',
    'saturated-fat': 'g',
    'trans-fat': 'g',
    cholesterol: 'mg',
    sodium: 'mg',
    salt: 'g',
    potassium: 'mg',
    calcium: 'mg',
    iron: 'mg',
    magnesium: 'mg',
    zinc: 'mg',
    'vitamin-a': 'µg',
    'vitamin-c': 'mg',
    'vitamin-d': 'µg',
    'vitamin-e': 'mg',
    'vitamin-k': 'µg',
    'vitamin-b6': 'mg',
    'vitamin-b12': 'µg',
    folate: 'µg',
};

const UNITS = ['g', 'mg', 'µg', 'IU', '%'];

// Common substitutes for the micro sign.
const UNIT_ALIASES = { mcg: 'µg', ug: 'µg', 'μg': 'µg' };

const MAX_NUTRIENTS = 30;
const MAX_NAME_LENGTH = 40;
const MAX_AMOUNT = 100000;
const MAX_SERVINGS = 1000;
const MAX_CALORIES = 20000;

const NUTRIENT_NAME = /^[\p{L}\p{N}][\p{L}\p{N} '&(),./-]*$/u;

const reject = (message) => ({ ok: false, message });

/** A whole number in range, `null` for "not given", or an error. */
function readWholeNumber(value, { field, max, min = 1 }) {
    if (value === undefined || value === null || value === '') {
        return { ok: true, value: null };
    }

    const number = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(number) || !Number.isInteger(number) || number < min) {
        return reject(min === 0 ? `${field} must be a whole number.` : `${field} must be a whole number, 1 or more.`);
    }
    if (number > max) {
        return reject(`${field} looks too high — the limit is ${max}.`);
    }

    return { ok: true, value: number };
}

const normalizeServings = (value) =>
    readWholeNumber(value, { field: 'Servings', max: MAX_SERVINGS });

// Zero is a valid figure, so the minimum differs from servings.
const normalizeCalories = (value) =>
    readWholeNumber(value, { field: 'Calories', max: MAX_CALORIES, min: 0 });

/**
 * The per-serving nutrient rows.
 *
 * @returns {{ ok: true, nutrients: Array<{name: string, amount: number, unit: string}> }
 *          | { ok: false, message: string }}
 */
function normalizeNutrients(value) {
    if (value === undefined || value === null) return { ok: true, nutrients: [] };
    if (!Array.isArray(value)) return reject('Nutrition must be a list.');
    if (value.length > MAX_NUTRIENTS) {
        return reject(`A recipe can list up to ${MAX_NUTRIENTS} nutrients.`);
    }

    const seen = new Set();
    const nutrients = [];

    for (const row of value) {
        if (!row || typeof row !== 'object') {
            return reject('Every nutrition row needs a name and an amount.');
        }

        const name = String(row.name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
        // Wholly empty rows are dropped rather than rejected.
        if (!name && (row.amount === undefined || row.amount === '')) continue;

        if (!name) return reject('Every nutrition row needs a name.');
        if (name === 'calories' || name === 'energy' || name === 'kcal') {
            return reject('Calories have their own field — put the figure there instead.');
        }
        if (name.length > MAX_NAME_LENGTH) {
            return reject(`Keep each nutrient name under ${MAX_NAME_LENGTH} characters.`);
        }
        if (!NUTRIENT_NAME.test(name)) {
            return reject(`“${name}” is not a usable nutrient name — use plain words.`);
        }
        if (seen.has(name)) {
            return reject(`${name} is listed twice.`);
        }

        const amount = typeof row.amount === 'number' ? row.amount : Number(String(row.amount ?? '').trim());
        if (!Number.isFinite(amount) || amount < 0) {
            return reject(`Give ${name} an amount, or remove the row.`);
        }
        if (amount > MAX_AMOUNT) {
            return reject(`${name} looks too high — the limit is ${MAX_AMOUNT}.`);
        }

        const rawUnit = String(row.unit ?? '').trim();
        const unit = UNIT_ALIASES[rawUnit.toLowerCase()] ?? rawUnit;
        if (!UNITS.includes(unit)) {
            return reject(`“${rawUnit}” is not a unit we know — use ${UNITS.join(', ')}.`);
        }

        seen.add(name);
        nutrients.push({ name, amount: Math.round(amount * 100) / 100, unit });
    }

    return { ok: true, nutrients };
}

module.exports = {
    NUTRIENTS,
    UNITS,
    MAX_NUTRIENTS,
    MAX_SERVINGS,
    MAX_CALORIES,
    normalizeServings,
    normalizeCalories,
    normalizeNutrients,
};
