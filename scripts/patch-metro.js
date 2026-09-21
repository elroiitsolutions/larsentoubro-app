const fs = require('fs');
const path = require('path');

const nodeModulesPath = path.resolve(__dirname, '../node_modules');

try {
  if (fs.existsSync(nodeModulesPath)) {
    // 1. Patch Metro package.json exports on Node 24
    const entries = fs.readdirSync(nodeModulesPath);
    for (const entry of entries) {
      if (entry.startsWith('metro')) {
        const pkgPath = path.join(nodeModulesPath, entry, 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          if (pkg.exports) {
            delete pkg.exports;
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
            console.log(`Removed restrictive exports for ${entry} on Node 24`);
          }
        }
      }
    }

    // 2. Patch @expo/ngrok client.js undefined response error
    const ngrokClientPath = path.join(nodeModulesPath, '@expo', 'ngrok', 'src', 'client.js');
    if (fs.existsSync(ngrokClientPath)) {
      let clientContent = fs.readFileSync(ngrokClientPath, 'utf8');
      if (clientContent.includes('error.response.body')) {
        clientContent = clientContent.replace(
          /const response = JSON\.parse\(error\.response\.body\);/g,
          'const response = error.response && error.response.body ? JSON.parse(error.response.body) : { msg: error.message };'
        ).replace(
          /error\.response\.body/g,
          '(error.response ? error.response.body : error.message)'
        );
        fs.writeFileSync(ngrokClientPath, clientContent);
        console.log('Patched @expo/ngrok client.js for safe error handling');
      }
    }
  }
} catch (e) {
  // Silent or non-fatal
}
