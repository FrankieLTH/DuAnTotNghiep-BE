const path = require('node:path');
require('tsconfig-paths').register({
  baseUrl: path.join(__dirname, 'dist'),
  paths: { '@shared/*': ['shared/*'] },
});
