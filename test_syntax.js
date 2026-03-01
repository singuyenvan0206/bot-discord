const fs = require('fs');
const cp = require('child_process');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
let errors = [];
for (const file of files) {
    try {
        cp.execSync(`node -c "${file}"`, { stdio: 'pipe' });
    } catch (e) {
        errors.push({ file, err: e.stderr.toString() });
    }
}
fs.writeFileSync('syntax_errors.json', JSON.stringify(errors, null, 2));
console.log(`Found ${errors.length} files with syntax errors.`);
