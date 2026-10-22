const fs = require('fs');
const path = require('path');
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  const rootDir = path.resolve(__dirname, '../../');
  console.log('=====================================================');
  console.log(' 🚀 GITHUB AUTO-UPLOADER & VERSION MANAGER');
  console.log('=====================================================');
  console.log(`Repository Directory: ${rootDir}\n`);

  // 1. Get Version & Commit details
  const versionInput = await ask('ป้อนเลขเวอร์ชัน (เช่น v1.1.0 หรือกด Enter เพื่อใช้ v1.1.0): ');
  const version = versionInput.trim() || 'v1.1.0';

  const defaultMsg = `Release ${version}: Hospital Disability Assessment & SSO 2-19 Auto-Filler System`;
  const commitMsgInput = await ask(`ข้อความ Commit (กด Enter เพื่อใช้ "${defaultMsg}"): `);
  const commitMsg = commitMsgInput.trim() || defaultMsg;

  // 2. GitHub Repo URL
  let repoUrl = await ask('\nป้อน GitHub Repository URL (เช่น https://github.com/username/repo.git): ');
  repoUrl = repoUrl.trim();
  if (!repoUrl) {
    console.error('❌ ไม่พบ GitHub Repository URL กรุณาระบุ URL ของ GitHub ก่อนครับ');
    rl.close();
    return;
  }

  // 3. GitHub Personal Access Token (PAT)
  console.log('\n💡 คำแนะนำ: สำหรับ GitHub ต้องใช้ Personal Access Token (ไม่ใช่รหัสผ่านทั่วไป)');
  console.log('   (Token ปกติจะขึ้นต้นด้วย ghp_... สามารถสร้างได้ที่ GitHub -> Settings -> Developer settings -> Personal access tokens)');
  const token = await ask('ป้อน GitHub Token (ghp_...): ');

  if (!token.trim()) {
    console.error('❌ จำเป็นต้องใช้ GitHub Token ในการยืนยันตัวตนสำหรับ Push');
    rl.close();
    return;
  }

  // 4. Init git repo if not present
  console.log('\n[1/4] ตรวจสอบและตั้งค่า Git Repository...');
  await git.init({ fs, dir: rootDir });

  // 5. Stage files excluding node_modules, dist, .env, .git
  console.log('[2/4] สแกนและจัดเตรียมไฟล์ (Staging)...');
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

  const files = getFiles(rootDir);
  for (const filepath of files) {
    await git.add({ fs, dir: rootDir, filepath });
  }
  console.log(`✓ รวบรวมไฟล์โปรเจกต์ทั้งหมด ${files.length} รายการ`);

  // 6. Commit
  console.log(`[3/4] สร้าง Commit เวอร์ชัน ${version}...`);
  const commitSha = await git.commit({
    fs,
    dir: rootDir,
    author: {
      name: 'Hospital System Admin',
      email: 'admin@hospital.local'
    },
    message: `${commitMsg} (${version})`
  });
  console.log(`✓ สร้าง Commit สำเร็จ: ${commitSha}`);

  // Create Tag
  try {
    await git.tag({
      fs,
      dir: rootDir,
      ref: version,
      object: commitSha
    });
    console.log(`✓ ติดป้ายกำกับเวอร์ชัน (Tag): ${version}`);
  } catch (err) {
    console.warn(`(Tag ${version} อาจมีอยู่แล้ว): ${err.message}`);
  }

  // 7. Push to GitHub
  console.log('[4/4] กำลังอัปโหลดขึ้น GitHub Repository...');
  try {
    const pushResult = await git.push({
      fs,
      http,
      dir: rootDir,
      url: repoUrl,
      remoteRef: 'refs/heads/main',
      force: true,
      onAuth: () => ({
        username: token.trim(),
        password: ''
      })
    });

    console.log('\n=====================================================');
    console.log(' 🎉 อัปโหลดขึ้น GITHUB เรียบร้อยแล้ว!');
    console.log(` 📌 เวอร์ชัน: ${version}`);
    console.log(` 🌐 URL: ${repoUrl}`);
    console.log('=====================================================\n');
  } catch (err) {
    console.error('\n❌ เกิดข้อผิดพลาดในการ Push ขึ้น GitHub:');
    console.error(err.message);
    console.log('\nข้อแนะนำ:');
    console.log('1. ตรวจสอบว่า GitHub URL ถูกต้องหรือไม่');
    console.log('2. ตรวจสอบว่า GitHub Token มีสิทธิ์ "repo" (Read and write) หรือไม่');
  }

  rl.close();
}

main().catch(err => {
  console.error(err);
  rl.close();
});
