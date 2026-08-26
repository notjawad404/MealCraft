const mongoose = require('mongoose');
const Cookbook = require('../model/cookbookModel');
const Order = require('../model/orderModel');

const PAID = 'paid';
const RECENT_SALES_LIMIT = 50;

const objectId = (value) => new mongoose.Types.ObjectId(String(value));

const getMyPurchases = async (req, res, next) => {
    try {
        const orders = await Order.find({ buyer: req.user.userId, status: PAID })
            .sort({ paidAt: -1, createdAt: -1 })
            .populate({
                path: 'cookbook',
                select: 'title description coverImage price currency pdfType pdfUrl recipes isPublished author',
                populate: { path: 'author', select: 'name' },
            })
            .lean();

        // A cookbook deleted after the sale leaves the order pointing at nothing.
        const purchases = orders
            .filter((order) => order.cookbook)
            .map((order) => {
                const { recipes, ...cookbook } = order.cookbook;

                return {
                    orderId: order._id,
                    purchasedAt: order.paidAt || order.createdAt,
                    amount: order.amount,
                    currency: order.currency,
                    cookbook: {
                        ...cookbook,
                        recipeCount: Array.isArray(recipes) ? recipes.length : 0,
                    },
                };
            });

        const spent = purchases.reduce((total, purchase) => total + purchase.amount, 0);

        return res.status(200).json({
            purchases,
            totals: {
                count: purchases.length,
                spent,
                currency: purchases[0]?.currency || 'usd',
                unavailable: orders.length - purchases.length,
            },
        });
    } catch (err) {
        next(err);
    }
};

const getMySales = async (req, res, next) => {
    try {
        const sellerId = objectId(req.user.userId);

        const [byCookbook, recentOrders, cookbooks, awaitingPayout] = await Promise.all([
            Order.aggregate([
                { $match: { seller: sellerId, status: PAID } },
                {
                    $group: {
                        _id: '$cookbook',
                        copiesSold: { $sum: 1 },
                        gross: { $sum: '$amount' },
                        net: { $sum: '$sellerNet' },
                        platformFees: { $sum: '$platformFee' },
                        stripeFees: { $sum: '$stripeFee' },
                        lastSoldAt: { $max: '$paidAt' },
                    },
                },
            ]),

            Order.find({ seller: sellerId, status: PAID })
                .sort({ paidAt: -1, createdAt: -1 })
                .limit(RECENT_SALES_LIMIT)
                .populate('buyer', 'name email')
                .populate('cookbook', 'title coverImage')
                .lean(),

            Cookbook.find({ author: sellerId })
                .select('title coverImage price currency isPublished createdAt')
                .sort({ createdAt: -1 })
                .lean(),

            // Settled for the buyer, but the transfer is still waiting on Stripe.
            Order.countDocuments({ seller: sellerId, status: PAID, stripeTransferId: '' }),
        ]);

        const statsFor = new Map(byCookbook.map((row) => [String(row._id), row]));

        const perCookbook = cookbooks.map((cookbook) => {
            const stats = statsFor.get(String(cookbook._id));

            return {
                ...cookbook,
                copiesSold: stats?.copiesSold || 0,
                gross: stats?.gross || 0,
                net: stats?.net || 0,
                lastSoldAt: stats?.lastSoldAt || null,
            };
        });

        const sum = (key) => byCookbook.reduce((total, row) => total + (row[key] || 0), 0);

        const recentSales = recentOrders.map((order) => ({
            orderId: order._id,
            soldAt: order.paidAt || order.createdAt,
            amount: order.amount,
            net: order.sellerNet,
            currency: order.currency,
            buyer: order.buyer ? { name: order.buyer.name, email: order.buyer.email } : null,
            cookbook: order.cookbook
                ? { _id: order.cookbook._id, title: order.cookbook.title, coverImage: order.cookbook.coverImage }
                : null,
        }));

        return res.status(200).json({
            totals: {
                copiesSold: sum('copiesSold'),
                gross: sum('gross'),
                net: sum('net'),
                platformFees: sum('platformFees'),
                stripeFees: sum('stripeFees'),
                currency: recentOrders[0]?.currency || cookbooks[0]?.currency || 'usd',
                cookbooksSelling: byCookbook.length,
                awaitingPayout,
            },
            cookbooks: perCookbook,
            recentSales,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getMyPurchases, getMySales };
