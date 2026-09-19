const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const packageDir = path.resolve(__dirname, '..');
const manifestPath = path.join(packageDir, 'manifest.json');

// Ensure manifest exists
if (!fs.existsSync(manifestPath)) {
    console.error('manifest.json not found');
    process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const packageId = manifest.id || 'package';
const outFileName = `${packageId}.trpkg`;
const outPath = path.join(packageDir, outFileName);

const zip = new AdmZip();

// Add manifest
zip.addLocalFile(manifestPath);

// Add dist directory if it exists
const distPath = path.join(packageDir, 'dist');
if (fs.existsSync(distPath)) {
    zip.addLocalFolder(distPath, 'dist');
} else {
    console.warn('Warning: dist/ directory not found. Did you run build first?');
}

// Write the zip file
zip.writeZip(outPath);
console.log(`Successfully built ${outFileName}`);
