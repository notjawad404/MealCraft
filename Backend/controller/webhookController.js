const User = require('../model/userModel');
const { getStripe, isStripeEnabled, getWebhookSecret } = require('../config/stripe');
const { fulfillOrder, fulfillFromCharge, failOrder } = require('./purchaseController');
const { syncAccountState } = require('./connectController');

function readRawBody(req) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8');
    return null;
}

const handleStripeWebhook = async (req, res) => {
    if (!isStripeEnabled() || !getWebhookSecret()) {
        return res.status(503).json({ message: 'Stripe webhooks are not configured.' });
    }

    const raw = readRawBody(req);
    if (!raw) {
        console.error(
            'Stripe webhook body was parsed before it could be verified. Ensure '
            + "express.raw() is mounted on /stripe/webhook before express.json().",
        );
        return res.status(400).json({ message: 'Webhook body was not readable.' });
    }

    let event;
    try {
        event = getStripe().webhooks.constructEvent(
            raw,
            req.headers['stripe-signature'],
            getWebhookSecret(),
        );
    } catch (err) {
        console.error(`Stripe webhook signature verification failed: ${err.message}`);
        return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
            case 'checkout.session.async_payment_succeeded':
                await fulfillOrder(event.data.object);
                break;

            case 'checkout.session.expired':
                await failOrder(event.data.object, 'Checkout session expired');
                break;

            case 'checkout.session.async_payment_failed':
                await failOrder(event.data.object, 'Payment failed');
                break;

            case 'charge.succeeded':
                await fulfillFromCharge(event.data.object);
                break;

            case 'account.updated': {
                const account = event.data.object;
                const user = await User.findOne({ stripeAccountId: account.id });
                if (user) await syncAccountState(user, account);
                break;
            }

            default:
                break;
        }
    } catch (err) {
        // A non-2xx makes Stripe redeliver; every handler above is safe to run twice.
        console.error(`Stripe webhook handler failed for ${event.type}: ${err.message}`);
        return res.status(500).json({ received: false });
    }

    return res.status(200).json({ received: true });
};

module.exports = { handleStripeWebhook };
