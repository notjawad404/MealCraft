const User = require('../model/userModel');
const { getStripe, isStripeEnabled, getFrontendUrl } = require('../config/stripe');

const stripeDisabled = (res) =>
    res.status(503).json({ message: 'Payments are not configured on this server.' });

async function syncAccountState(user, account) {
    const payoutsEnabled = Boolean(account.payouts_enabled);
    const detailsSubmitted = Boolean(account.details_submitted);

    if (user.stripePayoutsEnabled !== payoutsEnabled
        || user.stripeDetailsSubmitted !== detailsSubmitted) {
        user.stripePayoutsEnabled = payoutsEnabled;
        user.stripeDetailsSubmitted = detailsSubmitted;
        await user.save();
    }

    return { payoutsEnabled, detailsSubmitted };
}

const startOnboarding = async (req, res, next) => {
    try {
        if (!isStripeEnabled()) return stripeDisabled(res);
        const stripe = getStripe();

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.stripeAccountId) {
            const account = await stripe.accounts.create({
                email: user.email,
                controller: {
                    stripe_dashboard: { type: 'express' },
                    fees: { payer: 'application' },
                    losses: { payments: 'application' },
                },
                capabilities: { transfers: { requested: true } },
                business_profile: {
                    product_description: 'Digital cookbooks sold on MealCraft',
                },
                metadata: { userId: String(user._id) },
            });

            user.stripeAccountId = account.id;
            await user.save();
        }

        const frontend = getFrontendUrl();
        const accountLink = await stripe.accountLinks.create({
            account: user.stripeAccountId,
            refresh_url: `${frontend}/profile?stripe=refresh`,
            return_url: `${frontend}/profile?stripe=return`,
            type: 'account_onboarding',
        });

        return res.status(200).json({ url: accountLink.url });
    } catch (err) {
        next(err);
    }
};

const getStatus = async (req, res, next) => {
    try {
        if (!isStripeEnabled()) {
            return res.status(200).json({
                configured: false,
                hasAccount: false,
                detailsSubmitted: false,
                payoutsEnabled: false,
            });
        }

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.stripeAccountId) {
            return res.status(200).json({
                configured: true,
                hasAccount: false,
                detailsSubmitted: false,
                payoutsEnabled: false,
            });
        }

        const account = await getStripe().accounts.retrieve(user.stripeAccountId);
        const state = await syncAccountState(user, account);

        return res.status(200).json({
            configured: true,
            hasAccount: true,
            ...state,
            requirementsDue: account.requirements?.currently_due ?? [],
        });
    } catch (err) {
        next(err);
    }
};

const getDashboardLink = async (req, res, next) => {
    try {
        if (!isStripeEnabled()) return stripeDisabled(res);

        const user = await User.findById(req.user.userId);
        if (!user?.stripeAccountId) {
            return res.status(400).json({ message: 'No Stripe account connected yet.' });
        }

        const link = await getStripe().accounts.createLoginLink(user.stripeAccountId);
        return res.status(200).json({ url: link.url });
    } catch (err) {
        next(err);
    }
};

module.exports = { startOnboarding, getStatus, getDashboardLink, syncAccountState };
