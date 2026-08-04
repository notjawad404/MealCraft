const mongoose = require('mongoose');
const { DIETS, MEAL_TYPES, REGIONS } = require('../utils/recipeTags');

const recipeSchema = mongoose.Schema({
    title:{
        type: String,
        required: true
    },
    ingredients:{
        type: String,
        required: true
    },
    instructions:{
        type: String,
        required: true
    },
    time:{
        type: String,
        required: true
    },
    // A Cloudinary delivery URL. Recipes written before the move to Cloudinary
    // hold a base64 data URI here instead — both forms go straight into an
    // `<img src>`, so readers do not have to care which they got, and
    // scripts/migrateImagesToCloudinary.js converts the stragglers. Nothing
    // writes a data URI any more: a new photo is uploaded as binary and only
    // the URL comes back. See controller/recipeController.js.
    image:{
        type: String,
    },
    // A much smaller copy of `image`: a cropped Cloudinary derivative, or on
    // legacy documents a re-encoding the client made at upload time. Listings
    // return this and omit `image` entirely, so a page of twenty recipes costs
    // kilobytes rather than tens of megabytes.
    thumbnail:{
        type: String,
    },
    // The Cloudinary asset behind the two URLs above, kept so the photo can be
    // deleted when it is replaced or its recipe is. Empty on documents whose
    // image is stored inline, which is exactly the test for which kind it is.
    imagePublicId:{
        type: String,
        default: '',
    },
    // Optional link to the recipe on video — YouTube for preference, Vimeo,
    // Dailymotion or a direct video file otherwise. Vetted and rebuilt in
    // canonical form by utils/videoUrl.js, which is what lets the frontend put
    // the value into a player without trusting it.
    videoUrl:{
        type: String,
        default: '',
    },
    // What the recipe contains, for anyone who has to avoid it. A mix of the
    // known slugs in utils/recipeTags.js and whatever else the cook typed —
    // free text is allowed here because only they know what is in it.
    allergens:{
        type: [String],
        default: [],
    },
    // The diets the recipe is suitable for: halal, kosher, vegan and so on.
    // Closed vocabulary, checked in the controller against DIETS. The enum
    // here covers direct writes; findByIdAndUpdate skips validators, which is
    // why the controller does not lean on it.
    diets:{
        type: [{ type: String, enum: DIETS }],
        default: [],
    },
    // Which meals the recipe is for — a frittata is breakfast, brunch and lunch
    // at once, so this is a list rather than one choice.
    mealTypes:{
        type: [{ type: String, enum: MEAL_TYPES }],
        default: [],
    },
    // Where the food is from. Regions are a closed list; the countries beside
    // them are free text, because no fixed country list settles quietly.
    regions:{
        type: [{ type: String, enum: REGIONS }],
        default: [],
    },
    countries:{
        type: [String],
        default: [],
    },
    // How many the recipe makes. Everything nutritional below is *per serving*,
    // and without this figure those numbers cannot be scaled to a pan.
    servings:{
        type: Number,
        default: null,
    },
    // Per serving, and optional: null means the cook did not know, which is not
    // the same as zero. Its own field rather than a nutrient row because it is
    // the one figure worth putting on a card.
    calories:{
        type: Number,
        default: null,
    },
    // Everything else the cook knew, per serving. Free-form on purpose — the
    // names in utils/nutrition.js are offered, not required, so a recipe can
    // carry a nutrient this app has never heard of.
    nutrients:{
        type: [
            {
                _id: false,
                name: { type: String, required: true },
                amount: { type: Number, required: true },
                unit: { type: String, required: true },
            },
        ],
        default: [],
    },
    username:{
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    isPublic: {
        type: Boolean,
        default: true,
    },
    // Running totals of the rows in the recipeInteraction collection, which is
    // where the answer really lives. They are kept here so a page of twenty
    // cards can show its counts without twenty counting queries, and so a
    // "most liked" sort has a field it can index. Moved by $inc in the same
    // request that flips the flag — see controller/interactionController.js.
    likeCount: {
        type: Number,
        default: 0,
    },
    favouriteCount: {
        type: Number,
        default: 0,
    },
}, {timestamps: true});

module.exports = mongoose.model('Recipes', recipeSchema);