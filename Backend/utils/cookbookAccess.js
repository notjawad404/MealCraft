const Order = require('../model/orderModel');

const toPlain = (doc) => (typeof doc?.toObject === 'function' ? doc.toObject() : doc);

const idOf = (value) => {
    if (!value) return '';
    if (typeof value === 'object') return String(value._id ?? value);
    return String(value);
};

const isFreeOrOwn = (cookbook, userId) =>
    !(cookbook?.price > 0) || (Boolean(userId) && idOf(cookbook?.author) === String(userId));

async function getPurchasedCookbookIds(userId) {
    if (!userId) return new Set();

    const orders = await Order.find({ buyer: userId, status: 'paid' }).select('cookbook').lean();
    return new Set(orders.map((order) => String(order.cookbook)));
}

async function hasCookbookAccess(cookbook, userId) {
    if (isFreeOrOwn(cookbook, userId)) return true;
    if (!userId) return false;

    const paid = await Order.exists({
        buyer: userId,
        cookbook: cookbook._id,
        status: 'paid',
    });

    return Boolean(paid);
}

function presentCookbook(cookbook, hasAccess) {
    const plain = toPlain(cookbook);
    if (!plain) return plain;

    const recipes = Array.isArray(plain.recipes) ? plain.recipes : [];

    if (hasAccess) {
        return { ...plain, recipeCount: recipes.length, hasAccess: true, isLocked: false };
    }

    const { pdfUrl, pdfPublicId, ...rest } = plain;

    return {
        ...rest,
        pdfUrl: '',
        pdfPublicId: '',
        recipes: recipes.map((item) => {
            const recipe = item?.recipe;
            const populated = recipe && typeof recipe === 'object';

            return {
                recipe: populated
                    ? { _id: recipe._id, title: recipe.title, isPublic: recipe.isPublic }
                    : recipe,
                order: item?.order ?? 0,
                pageNumber: item?.pageNumber ?? 0,
                customNotes: '',
            };
        }),
        recipeCount: recipes.length,
        hasAccess: false,
        isLocked: true,
    };
}

module.exports = {
    hasCookbookAccess,
    getPurchasedCookbookIds,
    presentCookbook,
    isFreeOrOwn,
    idOf,
};
