const mongoose = require('mongoose');

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
    // A base64 data URI (`data:image/jpeg;base64,…`), stored inline rather than
    // as a link to a file elsewhere. Shape and size are enforced in the
    // controller via utils/imageData.js — findByIdAndUpdate skips schema
    // validators by default, so a validator here would only cover creates.
    image:{
        type: String,
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
}, {timestamps: true});

module.exports = mongoose.model('Recipes', recipeSchema);