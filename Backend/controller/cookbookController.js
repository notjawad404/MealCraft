const Cookbook = require('../model/cookbookModel');
const User = require('../model/userModel');
const Recipe = require('../model/recipeModel');
const {
  resolveAccess,
  getPurchasedCookbookIds,
  presentCookbook,
} = require('../utils/cookbookAccess');

const MIN_PAID_PRICE = 1;

/** Returns an error message when a cookbook cannot go on sale, or null when it can. */
async function validateSaleReadiness({ price, isPublished, authorId }) {
  if (!(price > 0) || !isPublished) return null;

  if (price < MIN_PAID_PRICE) {
    return `Paid cookbooks must be priced at $${MIN_PAID_PRICE.toFixed(2)} or more.`;
  }

  const author = await User.findById(authorId).select('stripeAccountId stripePayoutsEnabled');
  if (!author?.stripeAccountId || !author.stripePayoutsEnabled) {
    return 'Connect your Stripe account from your profile before publishing a paid cookbook.';
  }

  return null;
}

// Calculate page numbers and Table of Contents index dynamically
const buildTableOfContents = async (recipeItems) => {
  if (!Array.isArray(recipeItems) || recipeItems.length === 0) {
    return { formattedRecipes: [], tableOfContents: [] };
  }

  // Fetch full details for each recipe ID
  const recipeIds = recipeItems.map((item) => item.recipe || item._id || item);
  const recipesFromDb = await Recipe.find({ _id: { $in: recipeIds } });

  const recipeMap = new Map();
  recipesFromDb.forEach((r) => recipeMap.set(r._id.toString(), r));

  let currentPage = 3; // Page 1: Cover, Page 2: Table of Contents Index
  const formattedRecipes = [];
  const tableOfContents = [];

  recipeItems.forEach((item, index) => {
    const rId = (item.recipe || item._id || item).toString();
    const recipeObj = recipeMap.get(rId);
    const title = recipeObj?.title || `Recipe #${index + 1}`;
    const pageNum = currentPage;

    // Estimate page length based on ingredients + instructions + custom notes length
    const ingredientsLen = recipeObj?.ingredients?.length || 0;
    const instructionsLen = recipeObj?.instructions?.length || 0;
    const notesLen = item.customNotes?.length || 0;
    const totalChars = ingredientsLen + instructionsLen + notesLen;

    // Standard recipe page comfortably holds ~750 characters. Spans multiple pages if longer.
    const pageSpan = totalChars > 750 ? Math.max(1, Math.ceil(totalChars / 750)) : 1;

    formattedRecipes.push({
      recipe: rId,
      order: item.order !== undefined ? item.order : index,
      customNotes: item.customNotes || '',
      pageNumber: pageNum,
      pageSpan,
    });

    tableOfContents.push({
      title,
      pageNumber: pageNum,
    });

    currentPage += pageSpan;
  });

  return { formattedRecipes, tableOfContents };
};

// Create a new cookbook
const createCookbook = async (req, res, next) => {
  try {
    const {
      title,
      description,
      price,
      recipes,
      coverImage,
      coverImagePublicId,
      pdfType,
      pdfUrl,
      pdfPublicId,
      isPublished,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Cookbook title is required' });
    }

    const numericPrice = Number(price) || 0;

    let parsedRecipes = recipes;
    if (typeof recipes === 'string') {
      try {
        parsedRecipes = JSON.parse(recipes);
      } catch {
        parsedRecipes = [];
      }
    }

    const { formattedRecipes, tableOfContents } = await buildTableOfContents(parsedRecipes || []);

    const willPublish = isPublished !== undefined ? Boolean(isPublished) : true;
    const saleError = await validateSaleReadiness({
      price: Math.max(0, numericPrice),
      isPublished: willPublish,
      authorId: req.user.userId,
    });
    if (saleError) return res.status(400).json({ message: saleError });

    const cookbook = await Cookbook.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      price: Math.max(0, numericPrice),
      currency: 'usd',
      pdfType: pdfType === 'uploaded' ? 'uploaded' : 'generated',
      pdfUrl: pdfUrl || '',
      pdfPublicId: pdfPublicId || '',
      coverImage: coverImage || '',
      coverImagePublicId: coverImagePublicId || '',
      recipes: formattedRecipes,
      tableOfContents,
      author: req.user.userId,
      isPublished: willPublish,
    });

    const populated = await Cookbook.findById(cookbook._id)
      .populate('author', 'name email')
      .populate('recipes.recipe');

    return res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// Get all published cookbooks
const getAllCookbooks = async (req, res, next) => {
  try {
    const { search } = req.query;
    const filter = { isPublished: true };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const cookbooks = await Cookbook.find(filter)
      .populate('author', 'name email')
      .populate('recipes.recipe', 'title thumbnail time servings calories')
      .sort({ createdAt: -1 })
      .lean();

    const userId = req.user?.userId;
    const purchased = await getPurchasedCookbookIds(userId);

    const presented = cookbooks.map((cookbook) => {
      const isOwner = Boolean(userId)
        && String(cookbook.author?._id ?? cookbook.author) === String(userId);
      const isPurchased = !isOwner && purchased.has(String(cookbook._id));

      return presentCookbook(cookbook, {
        hasAccess: !(cookbook.price > 0) || isOwner || isPurchased,
        isOwner,
        isPurchased,
      });
    });

    return res.status(200).json(presented);
  } catch (err) {
    next(err);
  }
};

// Get single cookbook detail with full recipe details & table of contents
const getCookbookById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const cookbook = await Cookbook.findById(id)
      .populate('author', 'name email')
      .populate({
        path: 'recipes.recipe',
        select: 'title ingredients instructions time image thumbnail videoUrl calories servings diets mealTypes regions countries allergens createdBy username isPublic',
      });

    if (!cookbook) {
      return res.status(404).json({ message: 'Cookbook not found' });
    }

    const access = await resolveAccess(cookbook, req.user?.userId);

    return res.status(200).json(presentCookbook(cookbook, access));
  } catch (err) {
    next(err);
  }
};

// Get cookbooks created by logged-in user
const getMyCookbooks = async (req, res, next) => {
  try {
    const cookbooks = await Cookbook.find({ author: req.user.userId })
      .populate('author', 'name email')
      .populate('recipes.recipe', 'title thumbnail time')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(
      cookbooks.map((cookbook) => presentCookbook(cookbook, { hasAccess: true, isOwner: true })),
    );
  } catch (err) {
    next(err);
  }
};

// Update a cookbook
const updateCookbook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cookbook = await Cookbook.findById(id);

    if (!cookbook) {
      return res.status(404).json({ message: 'Cookbook not found' });
    }

    if (cookbook.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to edit this cookbook' });
    }

    const {
      title,
      description,
      price,
      recipes,
      coverImage,
      coverImagePublicId,
      pdfType,
      pdfUrl,
      pdfPublicId,
      isPublished,
    } = req.body;

    const saleError = await validateSaleReadiness({
      price: price !== undefined ? Math.max(0, Number(price) || 0) : cookbook.price,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : cookbook.isPublished,
      authorId: cookbook.author,
    });
    if (saleError) return res.status(400).json({ message: saleError });

    if (title) cookbook.title = title.trim();
    if (description !== undefined) cookbook.description = description.trim();
    if (price !== undefined) cookbook.price = Math.max(0, Number(price) || 0);
    if (pdfType !== undefined) cookbook.pdfType = pdfType;
    if (pdfUrl !== undefined) cookbook.pdfUrl = pdfUrl;
    if (pdfPublicId !== undefined) cookbook.pdfPublicId = pdfPublicId;
    if (coverImage !== undefined) cookbook.coverImage = coverImage;
    if (coverImagePublicId !== undefined) cookbook.coverImagePublicId = coverImagePublicId;
    if (isPublished !== undefined) cookbook.isPublished = Boolean(isPublished);

    if (recipes !== undefined) {
      let parsedRecipes = recipes;
      if (typeof recipes === 'string') {
        try {
          parsedRecipes = JSON.parse(recipes);
        } catch {
          parsedRecipes = [];
        }
      }
      const { formattedRecipes, tableOfContents } = await buildTableOfContents(parsedRecipes || []);
      cookbook.recipes = formattedRecipes;
      cookbook.tableOfContents = tableOfContents;
    }

    await cookbook.save();

    const updated = await Cookbook.findById(id)
      .populate('author', 'name email')
      .populate('recipes.recipe');

    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

// Delete a cookbook
const deleteCookbook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cookbook = await Cookbook.findById(id);

    if (!cookbook) {
      return res.status(404).json({ message: 'Cookbook not found' });
    }

    if (cookbook.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this cookbook' });
    }

    await Cookbook.findByIdAndDelete(id);

    return res.status(200).json({ message: 'Cookbook deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCookbook,
  getAllCookbooks,
  getCookbookById,
  getMyCookbooks,
  updateCookbook,
  deleteCookbook,
};
