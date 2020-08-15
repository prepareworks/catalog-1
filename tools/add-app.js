/* eslint-disable no-console */
const path = require('path');
const fetch = require('node-fetch');
const download = require('download');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const yaml = require('yamljs');

const categories = require('../constants/categories');

inquirer
  .prompt([
    {
      name: 'id',
      type: 'input',
    },
    {
      name: 'name',
      type: 'input',
    },
    {
      name: 'url',
      type: 'input',
    },
    {
      name: 'icon',
      type: 'input',
    },
    {
      name: 'category',
      type: 'rawlist',
      choices: categories,
    },
  ])
  .then((answers) => {
    const name = answers.name.trim();
    const url = answers.url.trim();
    const category = answers.category.trim();
    const icon = answers.icon.trim();
    const id = answers.id.trim() || answers.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    (async () => {
      const destDirPath = path.resolve(__dirname, '..', 'apps', id);
      const destIconPath = path.join(destDirPath, `${id}-icon.png`);
      const destYamlPath = path.join(destDirPath, `${id}.yml`);

      if (fs.existsSync(destIconPath) && fs.existsSync(destYamlPath)) {
        console.log(`${id} already exists`);
        process.exit(1);
      }

      fs.ensureDirSync(destDirPath);
      if (icon.startsWith('http')) {
        let iconUrl = icon;
        if (icon.startsWith('https://apps.apple.com')) {
          const appStoreId = parseInt(icon.match(/(\d+)/)[0], 10);
          const appStoreData = await fetch(`https://itunes.apple.com/lookup?id=${appStoreId}`)
            .then((res) => res.json());
          iconUrl = appStoreData.results[0].artworkUrl512
            .replace('jpg', 'png');
        }
        fs.writeFileSync(destIconPath, await download(iconUrl));
      } else {
        fs.ensureDirSync(destDirPath);
        fs.copyFileSync(icon, destIconPath);
      }

      const yamlContent = yaml.stringify({
        name, url, category,
      });
      fs.writeFileSync(destYamlPath, yamlContent);
      console.log('Added app to', path.join('apps', id));
    })();
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
