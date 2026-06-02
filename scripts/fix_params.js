const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src/app/api', (filePath) => {
  if (filePath.endsWith('route.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Fix the signature
    content = content.replace(/{ params }: { params: { ([^}]+) } }/g, (match, inner) => {
      changed = true;
      return `{ params }: { params: Promise<{ ${inner.trim()} }> }`;
    });

    // Fix usages like params.id -> (await params).id
    // First, let's find what variables are usually used: id, expenseId, userId
    const vars = ['id', 'expenseId', 'userId'];
    for (const v of vars) {
      if (content.includes(`params.${v}`)) {
        content = content.replace(new RegExp(`params\\.${v}`, 'g'), `(await params).${v}`);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated params signature in: ${filePath}`);
    }
  }
});
