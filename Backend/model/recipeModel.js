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