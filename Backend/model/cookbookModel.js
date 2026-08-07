const mongoose = require('mongoose');

const cookbookRecipeSchema = new mongoose.Schema({
  recipe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipes',
    required: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  customNotes: {
    type: String,
    default: '', // Creator's special tips/stories for this recipe in this cookbook
  },
  pageNumber: {
    type: Number,
    default: 1,
  },
}, { _id: false });

const cookbookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  coverImage: {
    type: String,
    default: '',
  },
  coverImagePublicId: {
    type: String,
    default: '',
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  currency: {
    type: String,
    default: 'usd',
  },
  // 'generated' (compiled from recipes) or 'uploaded' (custom PDF file uploaded by creator)
  pdfType: {
    type: String,
    enum: ['generated', 'uploaded'],
    default: 'generated',
  },
  // Cloudinary URL for the PDF document
  pdfUrl: {
    type: String,
    default: '',
  },
  pdfPublicId: {
    type: String,
    default: '',
  },
  // Ordered array of recipes with optional custom notes per recipe
  recipes: [cookbookRecipeSchema],

  // Generated or custom Table of Contents index [{ title, pageNumber }]
  tableOfContents: [{
    _id: false,
    title: { type: String, required: true },
    pageNumber: { type: Number, required: true },
  }],

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  salesCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('Cookbook', cookbookSchema);
