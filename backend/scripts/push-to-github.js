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

function updateReadme(rootDir, version, commitMsg, extraNote) {
  const readmePath = path.join(rootDir, 'README.md');
  if (!fs.existsSync(readmePath)) return;
  let content = fs.readFileSync(readmePath, 'utf8');

  const today = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const changelogHeader = '## 📝 ประวัติการอัปเดตระบบ (Changelog)';
  let entryText = `### [${version}] - ${today}\n- ${commitMsg}\n`;
  if (extraNote && extraNote.trim()) {
    entryText += `- ${extraNote.trim()}\n`;
  }

  if (content.includes(changelogHeader)) {
    if (!content.includes(`[${version}]`)) {
      content = content.replace(changelogHeader, `${changelogHeader}\n\n${entryText}`);
    }
  } else {
    content += `\n\n---\n\n${changelogHeader}\n\n${entryText}`;
  }

  fs.writeFileSync(readmePath, content, 'utf8');
  console.log(`✓ อัปเดตไฟล์ README.md อัตโนมัติ (บันทึกเวอร์ชัน ${version})`);
}

async function main() {
  const rootDir = path.resolve(__dirname, '../../');
  console.log('=====================================================');
  console.log(' 🚀 GITHUB AUTO-UPLOADER & VERSION MANAGER');
  console.log('=====================================================');
  console.log(`Repository Directory: ${rootDir}\n`);

  const args = process.argv.slice(2);
  const autoYes = args.includes('--yes') || args.includes('-y');
  let cliVersion = '';
  let cliMsg = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--version' || args[i] === '-v') cliVersion = args[i + 1];
    if (args[i] === '--message' || args[i] === '-m') cliMsg = args[i + 1];
  }

  // 1. Get Version & Commit details
  let version = 'v1.3.0';
  let commitMsg = 'Release v1.3.0: เพิ่มตัวกรองวันที่/เดือนแบบไทย, จัดระเบียบการเรียงไฟล์ PDF 5 หมวด และปรับพิกัดกึ่งกลางเส้นประ';
  let extraNote = '';

  if (autoYes) {
    version = cliVersion || version;
    commitMsg = cliMsg || commitMsg;
  } else {
    const versionInput = await ask(`ป้อนเลขเวอร์ชัน (กด Enter เพื่อใช้ ${version}): `);
    version = versionInput.trim() || version;

    const defaultMsg = `Release ${version}: อัปเดตระบบแนบไฟล์ PDF เวชระเบียนถาวร, ตัวกรองวันที่/เดือนแบบไทย, จัดพิกัดแบบฟอร์มกึ่งกลางเส้นประ`;
    const commitMsgInput = await ask(`ข้อความ Commit (กด Enter เพื่อใช้ข้อความเริ่มต้น): `);
    commitMsg = commitMsgInput.trim() || defaultMsg;

    extraNote = await ask('รายละเอียดฟังก์ชันใหม่เพิ่มเติมสำหรับบันทึกลง README.md (ถ้าไม่มีกด Enter ได้เลย): ');
  }

  // อัปเดต README.md อัตโนมัติก่อน Push
  updateReadme(rootDir, version, commitMsg, extraNote);

  // 2. GitHub Repo URL (ตั้งค่าเริ่มต้นให้ตรงกับโปรเจกต์ของคุณ)
  const defaultRepo = 'https://github.com/parksiwasup/Disability-Check.git';
  let repoUrl = defaultRepo;
  if (!autoYes) {
    const repoUrlInput = await ask(`\nป้อน GitHub Repository URL (กด Enter เพื่อใช้ "${defaultRepo}"): `);
    repoUrl = repoUrlInput.trim() || defaultRepo;
  }

  // 3. GitHub Personal Access Token (PAT)
  const tokenFile = path.join(rootDir, '.git-token');
  let savedToken = '';
  if (fs.existsSync(tokenFile)) {
    try {
      savedToken = fs.readFileSync(tokenFile, 'utf8').trim();
    } catch (_) {}
  }

  let token = savedToken;
  if (!autoYes) {
    if (savedToken) {
      const useSaved = await ask(`\nพบ GitHub Token ที่บันทึกไว้ (${savedToken.slice(0, 7)}...) กด Enter เพื่อใช้งานทันที: `);
      token = useSaved.trim() || savedToken;
    } else {
      console.log('\n💡 คำแนะนำ: สำหรับ GitHub ต้องใช้ Personal Access Token (ไม่ใช่รหัสผ่านทั่วไป)');
      token = await ask('ป้อน GitHub Token (ghp_...): ');
      token = token.trim();
    }
  }

  if (!token) {
    console.error('❌ จำเป็นต้องใช้ GitHub Token ในการยืนยันตัวตนสำหรับ Push');
    rl.close();
    return;
  }

  // บันทึก Token เก็บไว้สำหรับครั้งต่อไป (อยู่ใน .gitignore ไม่ถูกอัปโหลดขึ้น GitHub)
  try {
    fs.writeFileSync(tokenFile, token, 'utf8');
  } catch (_) {}

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
      name: 'parksiwasup',
      email: 'parksiwasup@users.noreply.github.com'
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
