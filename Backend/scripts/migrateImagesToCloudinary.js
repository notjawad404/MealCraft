/*
 * Moves recipe photos still stored inline as base64 up to Cloudinary.
 * Safe to stop and re-run. See docs/OPERATIONS.md.
 *
 *   node scripts/migrateImagesToCloudinary.js --dry-run
 *   node scripts/migrateImagesToCloudinary.js
 */

const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Same DNS override index.js applies; this script only ever runs locally.
if (process.env.DNS_SERVERS) {
    require('dns').setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

const connectDB = require('../config/connectionDB.js');
const Recipes = require('../model/recipeModel.js');
const { isCloudinaryEnabled, uploadImage } = require('../utils/imageStore.js');

const dryRun = process.argv.includes('--dry-run');

/** Decodes the `data:image/jpeg;base64,…` form legacy documents hold. */
function decodeDataUrl(value) {
    const comma = value.indexOf(',');
    const header = value.slice('data:'.length, comma);
    if (!header.endsWith(';base64')) throw new Error('not base64-encoded');

    const buffer = Buffer.from(value.slice(comma + 1), 'base64');
    if (buffer.length === 0) throw new Error('decoded to nothing');
    return buffer;
}

const INLINE = { image: { $regex: '^data:' } };

const formatBytes = (bytes) =>
    bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

async function main() {
    if (!isCloudinaryEnabled()) {
        console.error('Cloudinary is not configured — nothing to migrate to. Set the credentials in Backend/.env.');
        process.exitCode = 1;
        return;
    }

    await connectDB();

    const total = await Recipes.countDocuments(INLINE);
    if (total === 0) {
        console.log('No inline images left. Nothing to do.');
        return;
    }

    console.log(`${total} recipe${total === 1 ? '' : 's'} still holding an inline image.${dryRun ? ' (dry run)' : ''}\n`);

    let migrated = 0;
    let failed = 0;
    let freed = 0;

    // One at a time and lean: these documents are megabytes each.
    const cursor = Recipes.find(INLINE).select('title image thumbnail').lean().cursor();

    for await (const recipe of cursor) {
        const before = recipe.image.length + (recipe.thumbnail?.length || 0);
        const label = `${recipe.title} (${recipe._id})`;

        if (dryRun) {
            console.log(`would migrate  ${label} — ${formatBytes(before)} inline`);
            migrated += 1;
            freed += before;
            continue;
        }

        try {
            const stored = await uploadImage(decodeDataUrl(recipe.image));
            await Recipes.updateOne(
                { _id: recipe._id },
                { image: stored.image, thumbnail: stored.thumbnail, imagePublicId: stored.publicId },
            );
            migrated += 1;
            freed += before;
            console.log(`migrated  ${label} — ${formatBytes(before)} freed`);
        } catch (err) {
            // Logged and stepped over rather than aborting the run.
            failed += 1;
            console.error(`FAILED    ${label} — ${err.message}`);
        }
    }

    console.log(
        `\n${dryRun ? 'Would migrate' : 'Migrated'} ${migrated} of ${total}` +
        `${failed ? `, ${failed} failed` : ''} — ${formatBytes(freed)} of documents.`,
    );
    if (failed) process.exitCode = 1;
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => mongoose.connection.close());
