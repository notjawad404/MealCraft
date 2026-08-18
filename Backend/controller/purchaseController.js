const Cookbook = require('../model/cookbookModel');
const Order = require('../model/orderModel');
const User = require('../model/userModel');
const {
    getStripe,
    isStripeEnabled,
    getPlatformFeePercent,
    getFrontendUrl,
} = require('../config/stripe');

const MIN_PRICE_CENTS = 100;

const toCents = (price) => Math.round(Number(price) * 100);

// Mongo uses _id, Stripe uses id, and a raw ObjectId's own .id is a Buffer.
const idOf = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;

    if (typeof value === 'object') {
        if (value._id) return String(value._id);
        if (typeof value.id === 'string') return value.id;
    }

    return String(value);
};

async function resolveStripeFee(charge) {
    const balanceTransaction = charge?.balance_transaction;
    if (!balanceTransaction) return null;

    if (typeof balanceTransaction === 'object') return balanceTransaction.fee ?? null;

    const full = await getStripe().balanceTransactions.retrieve(balanceTransaction);
    return full?.fee ?? null;
}

// Buyer access and seller payout settle on different clocks. Link and bank
// debits leave balance_transaction null on charge.succeeded, so the Stripe fee
// -- and therefore the transfer amount -- is only knowable once charge.updated
// lands, often a minute or two later. Access must never wait on that.
async function payOutSeller(order, charge) {
    if (order.stripeTransferId) return;

    const stripeFee = await resolveStripeFee(charge);
    if (stripeFee === null) return; // Retried when charge.updated carries it.

    const gross = charge.amount;
    const platformFee = Math.round((gross * getPlatformFeePercent()) / 100);
    const sellerNet = gross - platformFee - stripeFee;

    order.platformFee = platformFee;
    order.stripeFee = stripeFee;
    order.sellerNet = Math.max(0, sellerNet);

    if (sellerNet <= 0 || !order.stripeDestinationAccount) return;

    const transfer = await getStripe().transfers.create(
        {
            amount: sellerNet,
            currency: order.currency,
            destination: order.stripeDestinationAccount,
            source_transaction: charge.id,
            transfer_group: String(order._id),
            metadata: {
                orderId: String(order._id),
                cookbookId: String(order.cookbook),
            },
        },
        { idempotencyKey: `order_transfer_${order._id}` },
    );

    order.stripeTransferId = transfer.id;
}

async function settleOrder(order, charge) {
    const firstSettlement = order.status !== 'paid';

    order.stripeChargeId = charge.id;
    order.amount = charge.amount;
    order.status = 'paid';
    if (!order.paidAt) order.paidAt = new Date();

    // Saved before the payout is attempted so a transfer failure can never cost
    // the buyer the access they have already paid for.
    await order.save();

    if (firstSettlement) {
        await Cookbook.updateOne({ _id: order.cookbook }, { $inc: { salesCount: 1 } });
    }

    await payOutSeller(order, charge);
    await order.save();

    return order;
}

const claimOrder = (filter) =>
    Order.findOneAndUpdate(
        { ...filter, status: 'pending' },
        { $set: { status: 'processing' } },
        { new: true },
    );

const releaseOrder = (orderId) =>
    Order.updateOne({ _id: orderId, status: 'processing' }, { $set: { status: 'pending' } });

async function fulfillOrder(session) {
    if (!session || session.payment_status !== 'paid') return null;

    const orderId = session.metadata?.orderId || session.client_reference_id;
    const filter = orderId ? { _id: orderId } : session.id ? { stripeSessionId: session.id } : null;

    // Without one of the two, the filter would match every pending order at once.
    if (!filter) return null;

    const order = await claimOrder(filter);

    if (!order) return Order.findOne(filter);

    try {
        const paymentIntentId = idOf(session.payment_intent);
        if (!paymentIntentId) throw new Error('Checkout session has no payment intent');

        order.stripePaymentIntentId = paymentIntentId;
        if (!order.stripeSessionId) order.stripeSessionId = session.id;

        const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId, {
            expand: ['latest_charge.balance_transaction'],
        });

        const charge = paymentIntent.latest_charge;
        if (!charge || typeof charge !== 'object') {
            order.status = 'pending';
            await order.save();
            return order;
        }

        return await settleOrder(order, charge);
    } catch (err) {
        await releaseOrder(order._id);
        throw err;
    }
}

async function fulfillFromCharge(charge) {
    if (charge?.status !== 'succeeded' || !charge.paid || charge.refunded) return null;

    const paymentIntentId = idOf(charge.payment_intent);

    // charge.succeeded can beat the session handler that persists the payment
    // intent id, so prefer the order id Stripe carries on the charge itself.
    const orderId = charge.metadata?.orderId || charge.transfer_group;
    const filter = orderId
        ? { _id: orderId }
        : paymentIntentId
            ? { stripePaymentIntentId: paymentIntentId }
            : null;

    if (!filter) return null;

    const order = await claimOrder(filter);

    if (order) {
        if (!order.stripePaymentIntentId && paymentIntentId) {
            order.stripePaymentIntentId = paymentIntentId;
        }

        try {
            return await settleOrder(order, charge);
        } catch (err) {
            await releaseOrder(order._id);
            throw err;
        }
    }

    // Paid already, but still owing its transfer: this is the charge.updated
    // that finally carries the balance transaction the fee is read from.
    const owing = await Order.findOne({ ...filter, status: 'paid', stripeTransferId: '' });
    if (!owing) return null;

    await payOutSeller(owing, charge);
    await owing.save();

    return owing;
}

async function failOrder(session, reason) {
    const orderId = session?.metadata?.orderId || session?.client_reference_id;
    const filter = orderId ? { _id: orderId } : session?.id ? { stripeSessionId: session.id } : null;

    if (!filter) return;

    await Order.updateOne(
        { ...filter, status: { $in: ['pending', 'processing'] } },
        { $set: { status: 'failed', failureReason: reason } },
    );
}

const createCheckoutSession = async (req, res, next) => {
    try {
        if (!isStripeEnabled()) {
            return res.status(503).json({ message: 'Payments are not configured on this server.' });
        }

        const cookbook = await Cookbook.findById(req.params.id);
        if (!cookbook) return res.status(404).json({ message: 'Cookbook not found' });
        if (!cookbook.isPublished) {
            return res.status(400).json({ message: 'This cookbook is not on sale.' });
        }

        const amount = toCents(cookbook.price);
        if (amount <= 0) {
            return res.status(400).json({ message: 'This cookbook is free — no purchase needed.' });
        }
        if (amount < MIN_PRICE_CENTS) {
            return res.status(400).json({ message: 'This cookbook is priced below the minimum we can charge.' });
        }

        const buyerId = req.user.userId;
        if (idOf(cookbook.author) === String(buyerId)) {
            return res.status(400).json({ message: 'You already own this cookbook.' });
        }

        const existing = await Order.findOne({ buyer: buyerId, cookbook: cookbook._id, status: 'paid' });
        if (existing) {
            return res.status(400).json({ message: 'You have already bought this cookbook.' });
        }

        const seller = await User.findById(cookbook.author);
        if (!seller?.stripeAccountId || !seller.stripePayoutsEnabled) {
            return res.status(400).json({
                message: 'This creator has not finished setting up payouts, so the cookbook cannot be bought yet.',
            });
        }

        const buyer = await User.findById(buyerId).select('email');

        const order = await Order.create({
            buyer: buyerId,
            cookbook: cookbook._id,
            seller: seller._id,
            stripeDestinationAccount: seller.stripeAccountId,
            amount,
            currency: cookbook.currency || 'usd',
            status: 'pending',
        });

        const frontend = getFrontendUrl();

        try {
            const session = await getStripe().checkout.sessions.create({
                mode: 'payment',
                line_items: [{
                    quantity: 1,
                    price_data: {
                        currency: order.currency,
                        unit_amount: amount,
                        product_data: {
                            name: cookbook.title,
                            ...(cookbook.description ? { description: cookbook.description.slice(0, 500) } : {}),
                            // Stripe rejects non-http images such as inline base64 covers.
                            ...(/^https?:\/\//.test(cookbook.coverImage || '')
                                ? { images: [cookbook.coverImage] }
                                : {}),
                        },
                    },
                }],
                payment_intent_data: {
                    transfer_group: String(order._id),
                    metadata: {
                        orderId: String(order._id),
                        cookbookId: String(cookbook._id),
                        buyerId: String(buyerId),
                        sellerId: String(seller._id),
                    },
                },
                client_reference_id: String(order._id),
                ...(buyer?.email ? { customer_email: buyer.email } : {}),
                metadata: { orderId: String(order._id), cookbookId: String(cookbook._id) },
                success_url: `${frontend}/cookbooks/${cookbook._id}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${frontend}/cookbooks/${cookbook._id}?checkout=cancelled`,
            });

            order.stripeSessionId = session.id;
            await order.save();

            return res.status(200).json({ url: session.url });
        } catch (err) {
            await Order.deleteOne({ _id: order._id, status: 'pending' });
            throw err;
        }
    } catch (err) {
        next(err);
    }
};

const confirmPurchase = async (req, res, next) => {
    try {
        if (!isStripeEnabled()) {
            return res.status(503).json({ message: 'Payments are not configured on this server.' });
        }

        const { sessionId } = req.body || {};
        if (!sessionId) return res.status(400).json({ message: 'A checkout session id is required.' });

        const session = await getStripe().checkout.sessions.retrieve(sessionId);

        const orderId = session.metadata?.orderId || session.client_reference_id;
        const order = await Order.findOne(orderId ? { _id: orderId } : { stripeSessionId: session.id });

        if (!order) return res.status(404).json({ message: 'Purchase not found.' });
        if (String(order.buyer) !== String(req.user.userId)) {
            return res.status(403).json({ message: 'This purchase belongs to another account.' });
        }

        const settled = await fulfillOrder(session);
        const status = settled?.status || order.status;

        return res.status(200).json({ status, paid: status === 'paid' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createCheckoutSession,
    confirmPurchase,
    fulfillOrder,
    fulfillFromCharge,
    failOrder,
};
