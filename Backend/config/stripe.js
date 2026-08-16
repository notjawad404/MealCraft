const Stripe = require('stripe');

let resolved = null;

function resolveConfig() {
    if (resolved) return resolved;

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const enabled = Boolean(secretKey);

    if (!enabled) {
        console.warn(
            'Stripe is not configured — cookbook sales are disabled.\n' +
            'Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Backend/.env.',
        );
    }

    resolved = {
        enabled,
        client: enabled ? new Stripe(secretKey) : null,
    };
    return resolved;
}

function getStripe() {
    return resolveConfig().client;
}

const isStripeEnabled = () => resolveConfig().enabled;

function getPlatformFeePercent() {
    const raw = Number(process.env.PLATFORM_FEE_PERCENT);
    if (!Number.isFinite(raw) || raw < 0 || raw > 100) return 10;
    return raw;
}

function getFrontendUrl() {
    const configured = process.env.FRONTEND_URL
        || (process.env.ALLOWED_ORIGINS || '').split(',')[0]
        || 'http://localhost:5173';

    return configured.trim().replace(/\/+$/, '');
}

const getWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET || '';

module.exports = {
    getStripe,
    isStripeEnabled,
    getPlatformFeePercent,
    getFrontendUrl,
    getWebhookSecret,
};
