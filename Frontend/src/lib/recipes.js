/** Shared vocabulary for the two listing pages and the backend they talk to. */

export const PAGE_SIZE = 20;

export const DEFAULT_SORT = 'newest';

// `value` has to match the keys of SORTS in Backend/controller/recipeController.js.
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'quickest', label: 'Quickest first' },
  { value: 'longest', label: 'Longest first' },
];

export const isSort = (value) => SORT_OPTIONS.some((option) => option.value === value);

/** Both `ingredients` and `instructions` are stored newline-joined. */
export const splitLines = (value) =>
  (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export const splitIngredients = splitLines;

/* ---- Allergens and diets ----------------------------------------------- */

// `value` is what the API stores and accepts; `label` is only how it is worded
// here. Both lists mirror Backend/utils/recipeTags.js — add to one and the
// other has to follow, or the picker offers something the API rejects.

/** The fourteen declarable allergens. Cooks can add their own on top. */
export const ALLERGEN_OPTIONS = [
  { value: 'peanuts', label: 'Peanuts' },
  { value: 'tree-nuts', label: 'Tree nuts' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'gluten', label: 'Gluten' },
  { value: 'soy', label: 'Soy' },
  { value: 'fish', label: 'Fish' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'molluscs', label: 'Molluscs' },
  { value: 'sesame', label: 'Sesame' },
  { value: 'mustard', label: 'Mustard' },
  { value: 'celery', label: 'Celery' },
  { value: 'lupin', label: 'Lupin' },
  { value: 'sulphites', label: 'Sulphites' },
];

/** Closed list — "suitable for X" is a claim, so it cannot be free text. */
export const DIET_OPTIONS = [
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'gluten-free', label: 'Gluten-free' },
  { value: 'dairy-free', label: 'Dairy-free' },
  { value: 'nut-free', label: 'Nut-free' },
  { value: 'egg-free', label: 'Egg-free' },
  { value: 'alcohol-free', label: 'Alcohol-free' },
  { value: 'low-carb', label: 'Low-carb' },
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo' },
];

/** Allergens each diet rules out — see the note in Backend/utils/recipeTags.js. */
export const DIET_EXCLUDES = {
  vegan: ['dairy', 'eggs', 'fish', 'shellfish', 'molluscs'],
  vegetarian: ['fish', 'shellfish', 'molluscs'],
  'gluten-free': ['gluten'],
  'dairy-free': ['dairy'],
  'nut-free': ['peanuts', 'tree-nuts'],
  'egg-free': ['eggs'],
};

/** When in the day the recipe is for. A recipe can be several at once. */
export const MEAL_TYPE_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'appetizer', label: 'Appetizer' },
  { value: 'side', label: 'Side' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'drink', label: 'Drink' },
];

/** Culinary regions. Countries are free text beside these. */
export const REGION_OPTIONS = [
  { value: 'north-african', label: 'North African' },
  { value: 'west-african', label: 'West African' },
  { value: 'east-african', label: 'East African' },
  { value: 'southern-african', label: 'Southern African' },
  { value: 'middle-eastern', label: 'Middle Eastern' },
  { value: 'levantine', label: 'Levantine' },
  { value: 'south-asian', label: 'South Asian' },
  { value: 'southeast-asian', label: 'Southeast Asian' },
  { value: 'east-asian', label: 'East Asian' },
  { value: 'central-asian', label: 'Central Asian' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'western-european', label: 'Western European' },
  { value: 'eastern-european', label: 'Eastern European' },
  { value: 'nordic', label: 'Nordic' },
  { value: 'north-american', label: 'North American' },
  { value: 'latin-american', label: 'Latin American' },
  { value: 'caribbean', label: 'Caribbean' },
  { value: 'oceanian', label: 'Oceanian' },
];

// Autocomplete for the country field, not a limit on it — the field takes
// anything, and this only saves the typing for the ones that come up most.
export const COUNTRY_SUGGESTIONS = [
  'Argentina', 'Australia', 'Austria', 'Bangladesh', 'Belgium', 'Brazil', 'Cambodia', 'Canada',
  'Chile', 'China', 'Colombia', 'Cuba', 'Denmark', 'Egypt', 'Ethiopia', 'France', 'Georgia',
  'Germany', 'Ghana', 'Greece', 'Hungary', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
  'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kenya', 'Lebanon', 'Malaysia', 'Mexico',
  'Morocco', 'Nepal', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Palestine',
  'Peru', 'Philippines', 'Poland', 'Portugal', 'Russia', 'Saudi Arabia', 'Senegal', 'Singapore',
  'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Thailand', 'Tunisia', 'Turkey', 'Ukraine', 'United Kingdom', 'United States',
  'Vietnam',
];

export const MAX_ALLERGENS = 20;
export const MAX_REGIONS = 6;
export const MAX_COUNTRIES = 6;

/* ---- Nutrition ---------------------------------------------------------- */

// Offered in the nutrition editor with their customary unit filled in. Not a
// closed list: a cook can type a nutrient that is not here. Calories are
// missing on purpose — they have a field of their own.
export const NUTRIENT_OPTIONS = [
  { value: 'protein', label: 'Protein', unit: 'g' },
  { value: 'carbohydrates', label: 'Carbohydrates', unit: 'g' },
  { value: 'sugars', label: 'Sugars', unit: 'g' },
  { value: 'fibre', label: 'Fibre', unit: 'g' },
  { value: 'fat', label: 'Fat', unit: 'g' },
  { value: 'saturated-fat', label: 'Saturated fat', unit: 'g' },
  { value: 'trans-fat', label: 'Trans fat', unit: 'g' },
  { value: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
  { value: 'sodium', label: 'Sodium', unit: 'mg' },
  { value: 'salt', label: 'Salt', unit: 'g' },
  { value: 'potassium', label: 'Potassium', unit: 'mg' },
  { value: 'calcium', label: 'Calcium', unit: 'mg' },
  { value: 'iron', label: 'Iron', unit: 'mg' },
  { value: 'magnesium', label: 'Magnesium', unit: 'mg' },
  { value: 'zinc', label: 'Zinc', unit: 'mg' },
  { value: 'vitamin-a', label: 'Vitamin A', unit: 'µg' },
  { value: 'vitamin-c', label: 'Vitamin C', unit: 'mg' },
  { value: 'vitamin-d', label: 'Vitamin D', unit: 'µg' },
  { value: 'vitamin-e', label: 'Vitamin E', unit: 'mg' },
  { value: 'vitamin-k', label: 'Vitamin K', unit: 'µg' },
  { value: 'vitamin-b6', label: 'Vitamin B6', unit: 'mg' },
  { value: 'vitamin-b12', label: 'Vitamin B12', unit: 'µg' },
  { value: 'folate', label: 'Folate', unit: 'µg' },
];

export const NUTRIENT_UNITS = ['g', 'mg', 'µg', 'IU', '%'];

export const MAX_NUTRIENTS = 30;
export const MAX_SERVINGS = 1000;
export const MAX_CALORIES = 20000;

/* ---- Labels ------------------------------------------------------------- */

const labelsOf = (options) => new Map(options.map(({ value, label }) => [value, label]));

const ALLERGEN_LABELS = labelsOf(ALLERGEN_OPTIONS);
const DIET_LABELS = labelsOf(DIET_OPTIONS);
const MEAL_TYPE_LABELS = labelsOf(MEAL_TYPE_OPTIONS);
const REGION_LABELS = labelsOf(REGION_OPTIONS);
const NUTRIENT_LABELS = labelsOf(NUTRIENT_OPTIONS);

const sentenceCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);

/** Known allergens get their wording; a cook's own is shown as they typed it. */
export const allergenLabel = (value) => ALLERGEN_LABELS.get(value) ?? sentenceCase(value);

export const dietLabel = (value) => DIET_LABELS.get(value) ?? sentenceCase(value);

export const mealTypeLabel = (value) => MEAL_TYPE_LABELS.get(value) ?? sentenceCase(value);

export const regionLabel = (value) => REGION_LABELS.get(value) ?? sentenceCase(value);

export const nutrientLabel = (value) => NUTRIENT_LABELS.get(value) ?? sentenceCase(value);

/** The unit a nutrient is normally given in, for pre-filling the row. */
export const unitForNutrient = (value) =>
  NUTRIENT_OPTIONS.find((option) => option.value === value)?.unit ?? 'g';

/** "Pakistani food, South Asian" — the line above a recipe's title. */
export const describeOrigin = ({ countries = [], regions = [] } = {}) =>
  [...countries, ...regions.map(regionLabel)].join(' · ');

/**
 * The first contradiction between the two lists, or null. Mirrors the check the
 * API makes: a badge saying "nut-free" over an allergen list containing peanuts
 * is the one mistake here that could actually hurt someone.
 */
export function findDietConflict(diets = [], allergens = []) {
  const declared = new Set(allergens);

  for (const diet of diets) {
    const clash = (DIET_EXCLUDES[diet] ?? []).find((allergen) => declared.has(allergen));
    if (clash) {
      return `Marked ${dietLabel(diet).toLowerCase()}, but ${allergenLabel(clash).toLowerCase()} is listed as an allergen.`;
    }
  }

  return null;
}

// Video links live in ./video.js — parsing them grew past what belongs here.

const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

/**
 * Coerces a listing response into the paged shape the UI renders. A version of
 * the backend from before paging existed answers with a bare array, and a stale
 * dev server is the likeliest thing to hand one over — callers should degrade to
 * "everything on one page" rather than crash on a missing `recipes`.
 */
export function normalizePage(data, { page = 1, limit = PAGE_SIZE } = {}) {
  if (Array.isArray(data)) {
    // `stale` is surfaced in the UI. Degrading quietly here once cost two
    // rounds of "search does nothing" — the old API ignores every query
    // param, so the page flickers and returns the identical list.
    return { recipes: data, page: 1, pages: 1, total: data.length, limit, stale: true };
  }
  if (!data || !Array.isArray(data.recipes)) {
    return { recipes: [], page: 1, pages: 1, total: 0, limit };
  }
  return {
    recipes: data.recipes,
    page: num(data.page, page),
    pages: Math.max(1, num(data.pages, 1)),
    total: num(data.total, data.recipes.length),
    limit: num(data.limit, limit),
  };
}

/** "90" → "1 hr 30 min". Falls back to the raw value if it is not a number. */
export function formatTime(minutes) {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total <= 0) return String(minutes ?? '');
  if (total < 60) return `${total} min`;

  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}
