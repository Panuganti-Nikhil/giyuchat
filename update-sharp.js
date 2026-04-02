const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client/src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(srcDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace all rounded-* except maybe we want rounded-sm for a tiny bit of softness, but user wants SHARP edges. Let's use no rounding.
  content = content.replace(/rounded-(xl|2xl|3xl|full|lg|md|sm|t-xl|b-xl|br-md|bl-md|l-xl|r-xl|t-lg|t-2xl|b-2xl)/g, '');
  content = content.replace(/rounded\b/g, ''); // catch plain 'rounded'

  // Remove shadows
  content = content.replace(/shadow-(xl|2xl|lg|md|sm)/g, '');
  content = content.replace(/shadow\b/g, '');

  // Remove backdrop blur classes
  content = content.replace(/backdrop-blur-(xl|lg|md|sm)/g, '');
  content = content.replace(/backdrop-blur\b/g, '');

  // Replace gradient-btn with premium-btn
  content = content.replace(/gradient-btn/g, 'premium-btn');
  content = content.replace(/gradient-text/g, 'premium-text');

  fs.writeFileSync(file, content);
});

console.log('Fixed styling classes in JSX files for sharp premium aesthetic.');
