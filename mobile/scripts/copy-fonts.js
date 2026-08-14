const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'node_modules', 'react-native-vector-icons', 'Fonts');
const dstDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'fonts');

try {
  if (fs.existsSync(srcDir)) {
    if (!fs.existsSync(dstDir)) {
      fs.mkdirSync(dstDir, { recursive: true });
    }
    const files = fs.readdirSync(srcDir);
    let count = 0;
    for (const f of files) {
      if (f.endsWith('.ttf')) {
        fs.copyFileSync(path.join(srcDir, f), path.join(dstDir, f));
        count++;
      }
    }
    console.log(`[copy-fonts] Copied ${count} font files to Android assets/fonts`);
  }
} catch (e) {
  console.warn('[copy-fonts] Warning:', e.message);
}
