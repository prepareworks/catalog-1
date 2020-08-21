// https://github.com/electron/electron-apps/blob/master/script/pack.js
const Queue = require('promise-queue');
const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const yaml = require('yamljs');
const { exec } = require('child_process');
const tmp = require('tmp');

const apps = [];
const appPath = path.join(__dirname, '../apps');
const distPath = path.join(__dirname, '../dist');

// Process each app one by one
const maxConcurrent = 1;
const maxQueue = Infinity;
const queue = new Queue(maxConcurrent, maxQueue);

const maskIconPyPath = path.join(__dirname, 'maskicon.py');

const maskIconAsync = (iconPath, iconDestPath) => new Promise((resolve, reject) => {
  exec(`python3 ${maskIconPyPath} "${iconPath}" "${iconDestPath}"`, (e, stdout, stderr) => {
    if (e instanceof Error) {
      reject(e);
      return;
    }

    resolve({ stdout, stderr });
  });
});

const slugs = fs.readdirSync(appPath)
  .filter((filename) => fs.statSync(path.join(appPath, filename)).isDirectory());

let done = 0;

slugs
  .forEach((slug) => {
    const yamlFile = path.join(appPath, `${slug}/${slug}.yml`);
    const s3Url = 'https://storage.atomery.com/webcatalog/catalog';
    const app = {
      id: slug,
      objectID: slug,
      ...yaml.load(yamlFile),
      icon: `${s3Url}/${slug}/${slug}-icon.png`,
      icon128: `${s3Url}/${slug}/${slug}-icon-128.webp`,
      icon128Png: `${s3Url}/${slug}/${slug}-icon-128.png`,
      icon256: `${s3Url}/${slug}/${slug}-icon-256.webp`,
      icon256Png: `${s3Url}/${slug}/${slug}-icon-256.png`,
      iconFilled: `${s3Url}/${slug}/${slug}-icon-filled.png`,
      iconFilled128: `${s3Url}/${slug}/${slug}-icon-filled-128.webp`,
    };

    const iconName = `${slug}-icon.png`;
    const iconFile = path.join(appPath, slug, iconName);
    // filled icon (original)
    const filledCopiedIconFile = path.join(distPath, slug, `${slug}-icon-filled.png`);
    // masked icon
    const tmpMaskedCopiedIconFile = tmp.tmpNameSync();
    const maskedCopiedIconFile = path.join(distPath, slug, `${slug}-icon.png`);

    queue.add(() => Promise.resolve()
      .then(() => fs.ensureDir(path.join(distPath, slug)))
      .then(() => sharp(iconFile)
        .png()
        .resize({
          width: 128,
          height: 128,
          withoutEnlargement: true,
        })
        // reprocessed to ensure file size is optimized
        .toFile(filledCopiedIconFile))
      .then(() => sharp(filledCopiedIconFile)
        // generate thumbnail
        .resize(128, 128)
        .webp()
        .toFile(path.join(distPath, `${slug}/${slug}-icon-filled-128.webp`)))
      .then(() => maskIconAsync(iconFile, tmpMaskedCopiedIconFile))
      .then(() => sharp(tmpMaskedCopiedIconFile)
        .png()
        // reprocessed to ensure file size is optimized
        .toFile(maskedCopiedIconFile))
      .then(() => sharp(maskedCopiedIconFile)
        .resize(128, 128)
        .webp()
        .toFile(path.join(distPath, `${slug}/${slug}-icon-128.webp`)))
      .then(() => sharp(maskedCopiedIconFile)
        .resize(128, 128)
        .png()
        .toFile(path.join(distPath, `${slug}/${slug}-icon-128.png`)))
      .then(() => sharp(maskedCopiedIconFile)
        .resize(128, 128)
        .webp()
        .toFile(path.join(distPath, `${slug}/${slug}-icon-256.webp`)))
      .then(() => sharp(maskedCopiedIconFile)
        .resize(128, 128)
        .png()
        .toFile(path.join(distPath, `${slug}/${slug}-icon-256.png`)))
      .then(() => {
        done += 1;
        // eslint-disable-next-line no-console
        console.log(`Done ${slug} (${done}/${slugs.length})`);
      })
      .catch((e) => {
        // eslint-disable-next-line
        console.log(e);
        process.exit(1);
      }));

    apps.push(app);
  });

fs.ensureDirSync(distPath);

fs.writeFileSync(
  path.join(distPath, 'index.json'),
  JSON.stringify(apps, null, 2),
);
