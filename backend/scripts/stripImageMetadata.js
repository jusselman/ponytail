// stripImageMetadata.js
// One-off clean-up for images uploaded before SR-15 was fixed. New uploads are
// cleaned automatically in verifyUploads (utils/uploads.js); this runs the same
// cleanImage step over every image already in assets/uploads, removing EXIF
// data (camera, time taken, GPS location), turning phone photos upright and
// capping their size. Filenames don't change, so saved URLs keep working.
//
// Usage: node scripts/stripImageMetadata.js           (report which images carry metadata)
//        node scripts/stripImageMetadata.js --apply   (clean every image)

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { UPLOAD_DIR, cleanImage } = require("../src/utils/uploads");

const APPLY = process.argv.includes("--apply");
const IMAGE_EXTS = new Set([".jpg", ".png", ".webp", ".gif"]);

const main = async () => {
  const images = fs.readdirSync(UPLOAD_DIR).filter((n) => IMAGE_EXTS.has(path.extname(n).toLowerCase()));
  let withMetadata = 0;
  let failed = 0;

  for (const name of images) {
    const filePath = path.join(UPLOAD_DIR, name);
    try {
      const meta = await sharp(filePath).metadata();
      const hasMeta = Boolean(meta.exif || meta.xmp || meta.iptc);
      if (hasMeta) {
        withMetadata += 1;
        console.log(`  ${name}${meta.exif ? " (EXIF)" : ""}`);
      }
      if (APPLY) await cleanImage(filePath);
    } catch (err) {
      failed += 1;
      console.log(`  could not read ${name}: ${err.message}`);
    }
  }

  console.log(`\n${images.length} images, ${withMetadata} with hidden metadata${failed ? `, ${failed} unreadable` : ""}`);
  console.log(APPLY ? "All images cleaned." : "Report only. Run again with --apply to clean every image.");
};

main().catch((err) => {
  console.error("Clean-up failed:", err);
  process.exitCode = 1;
});
