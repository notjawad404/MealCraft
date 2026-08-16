const mongoose = require('mongoose');

// One row per purchase attempt. Amounts are integer minor units.
const orderSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    cookbook: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cookbook',
        required: true,
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    // No default: the unique index below is sparse, which skips absent fields but not ''.
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String, default: '' },
    stripeChargeId: { type: String, default: '' },
    stripeTransferId: { type: String, default: '' },
    stripeDestinationAccount: { type: String, default: '' },

    amount: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, default: 0, min: 0 },
    stripeFee: { type: Number, default: 0, min: 0 },
    sellerNet: { type: Number, default: 0, min: 0 },

    currency: { type: String, default: 'usd' },

    status: {
        type: String,
        enum: ['pending', 'processing', 'paid', 'failed'],
        default: 'pending',
    },

    failureReason: { type: String, default: '' },
    paidAt: { type: Date, default: null },
}, { timestamps: true });

orderSchema.index({ stripeSessionId: 1 }, { unique: true, sparse: true });

// Partial: only settled purchases collide, so abandoned attempts can be retried.
orderSchema.index(
    { buyer: 1, cookbook: 1 },
    { unique: true, partialFilterExpression: { status: 'paid' } },
);

orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ seller: 1, status: 1 });
orderSchema.index({ cookbook: 1 });

module.exports = mongoose.model('Order', orderSchema);
