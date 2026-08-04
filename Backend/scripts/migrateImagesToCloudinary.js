/*
 * Moves recipe photos that are still stored inline as base64 up to Cloudinary.
 *
 *   node scripts/migrateImagesToCloudinary.js --dry-run
 *   node scripts/migrateImagesToCloudinary.js
 *
 * Recipes written before the move hold a `data:image/…;base64,…` string in
 * `image`, which is what put the collection under pressure in the first place.
 * Editing such a recipe migrates it on its own (see resolveImage in
 * controller/recipeController.js), but most recipes are never edited again, so
 * this walks the rest of them.
 *
 * Safe to stop and re-run: each document is matched on still having a data URI,
 * so anything already moved is skipped, and each is written the moment its
 * upload succeeds rather than at the end. An interrupted run leaves the
 * database consistent, just partly migrated.
 */

const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Same override index.js applies, and for the same reason: this script runs on
// a developer machine, which is exactly where a stopped Docker or VPN resolver
// leaves Node pointed at 127.0.0.1 and fails the SRV lookup a mongodb+srv://
// URI depends on. Without this the script cannot connect on the one host it
// was written to be run from.
if (process.env.DNS_SERVERS) {
    require('dns').setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

const connectDB = require('../config/connectionDB.js');
const Recipes = require('../model/recipeModel.js');
const { isCloudinaryEnabled, uploadImage } = require('../utils/imageStore.js');

const dryRun = process.argv.includes('--dry-run');

/**
 * Legacy documents hold `data:image/jpeg;base64,…`. This is the only base64 in
 * the codebase, and it is here rather than in utils/ on purpose: it decodes
 * what is already in the database, and nothing in the live request path should
 * grow a reason to call it.
 */
function decodeDataUrl(value) {
    const comma = value.indexOf(',');
    const header = value.slice('data:'.length, comma);
    if (!header.endsWith(';base64')) throw new Error('not base64-encoded');

    const buffer = Buffer.from(value.slice(comma + 1), 'base64');
    if (buffer.length === 0) throw new Error('decoded to nothing');
    return buffer;
}

// Anchored so it can use an index if one is ever added, and so it cannot match
// a URL that merely mentions "data:" somewhere in the middle.
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

    // One at a time and lean: these documents are megabytes each, and pulling a
    // page of twenty into memory to save round trips is a false economy.
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
            // Logged and stepped over rather than aborting the run: one photo
            // Cloudinary will not take should not strand the other forty-nine.
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
