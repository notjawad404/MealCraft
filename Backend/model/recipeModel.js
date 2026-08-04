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
    // Cloudinary delivery URL, or a base64 data URI on pre-migration records.
    image:{
        type: String,
    },
    // Cropped derivative of `image`. Listings return this instead of `image`.
    thumbnail:{
        type: String,
    },
    // The Cloudinary asset behind the URLs above. Empty for inline images.
    imagePublicId:{
        type: String,
        default: '',
    },
    // Canonical video link, vetted by utils/videoUrl.js.
    videoUrl:{
        type: String,
        default: '',
    },
    // Known slugs from utils/recipeTags.js mixed with free text.
    allergens:{
        type: [String],
        default: [],
    },
    // Closed vocabularies, also checked in the controller.
    diets:{
        type: [{ type: String, enum: DIETS }],
        default: [],
    },
    mealTypes:{
        type: [{ type: String, enum: MEAL_TYPES }],
        default: [],
    },
    regions:{
        type: [{ type: String, enum: REGIONS }],
        default: [],
    },
    // Free text.
    countries:{
        type: [String],
        default: [],
    },
    servings:{
        type: Number,
        default: null,
    },
    // Per serving. null means unknown, which is not zero.
    calories:{
        type: Number,
        default: null,
    },
    // Per serving, free-form names.
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
    // Running totals of the rows in the recipeInteraction collection.
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