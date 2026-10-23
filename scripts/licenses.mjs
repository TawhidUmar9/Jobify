import fs from 'node:fs';
import path from 'node:path';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deps = Object.keys(packageJson.dependencies || {}).sort();

const rows = [
  '# Third-Party Licenses',
  '',
  'This file lists the third-party dependencies used by Jobify and their respective licenses.',
  '',
  '| Package | Version | License |',
  '| --- | --- | --- |',
];

for (const dep of deps) {
  const depPkgPath = path.join('node_modules', dep, 'package.json');
  let version = packageJson.dependencies[dep];
  let license = 'Unknown';
  if (fs.existsSync(depPkgPath)) {
    const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
    version = depPkg.version || version;
    license = depPkg.license || (depPkg.licenses && depPkg.licenses[0]?.type) || 'Unknown';
    if (typeof license === 'object') license = license.type || JSON.stringify(license);
  }
  rows.push(`| ${dep} | ${version} | ${license} |`);
}

rows.push('');
fs.writeFileSync('LICENSES.md', rows.join('\n'), 'utf8');
console.log('LICENSES.md written successfully.');
