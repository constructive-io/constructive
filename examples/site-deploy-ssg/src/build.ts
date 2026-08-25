/** Builds the example site into `dist-site/`. */

import { join } from 'path';

import { buildSite } from './ssg';

const root = join(__dirname, '..');

buildSite(join(root, 'content'), join(root, 'dist-site'), { banner: process.env.BANNER })
  .then((files) => console.log(`built ${files.length} files:\n  ${files.join('\n  ')}`))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
