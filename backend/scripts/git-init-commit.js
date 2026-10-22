const fs = require('fs');
const path = require('path');
const git = require('isomorphic-git');

async function initAndCommit() {
  const dir = path.resolve(__dirname, '../../');
  console.log('Target Repo Dir:', dir);

  // 1. Git init
  await git.init({ fs, dir });
  console.log('✓ Git repository initialized.');

  // Helper to recursively get files excluding node_modules, dist, .git, .env
  function getFiles(currentDir, relativePrefix = '') {
    const list = fs.readdirSync(currentDir);
    let results = [];

    for (const item of list) {
      if (['node_modules', 'dist', '.git', '.env', '.DS_Store'].includes(item)) {
        continue;
      }
      const fullPath = path.join(currentDir, item);
      const relPath = relativePrefix ? `${relativePrefix}/${item}` : item;
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        results = results.concat(getFiles(fullPath, relPath));
      } else {
        results.push(relPath);
      }
    }
    return results;
  }

  const files = getFiles(dir);
  console.log(`Found ${files.length} project files to stage.`);

  // Stage files
  for (const filepath of files) {
    await git.add({ fs, dir, filepath });
  }
  console.log('✓ All files staged.');

  // Commit
  const sha = await git.commit({
    fs,
    dir,
    author: {
      name: 'Hospital Developer',
      email: 'dev@hospital.local'
    },
    message: 'feat: Hospital Disability Check & SSO 2-19 Auto-Fill System (React + Vite + Express + Prisma + MySQL)'
  });

  console.log('✓ Commit created successfully! SHA:', sha);
}

initAndCommit().catch(console.error);
