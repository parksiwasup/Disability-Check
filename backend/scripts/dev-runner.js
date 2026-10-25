const { spawn, exec, execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');

console.log('=====================================================');
console.log('🏥 Hospital Disability Assessment System (สปส. 2-19)');
console.log('=====================================================');
console.log('กำลังเริ่มต้นระบบ Backend และ Frontend ในหน้าต่างเดียว...\n');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// Free ports 5000 and 5173 if currently occupied by old instances
function freePort(port) {
  if (!isWin) return;
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const lines = out.split('\n');
    lines.forEach(line => {
      if (line.includes('LISTENING') || line.includes('ESTABLISHED')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(pid) && Number(pid) !== process.pid) {
          try { execSync(`taskkill /pid ${pid} /F >nul 2>&1`); } catch (e) {}
        }
      }
    });
  } catch (e) {}
}

freePort(5000);
freePort(5173);

// 1. Copy URL to Windows clipboard
try {
  const proc = spawn('clip');
  proc.stdin.write('http://localhost:5173');
  proc.stdin.end();
} catch (e) {}

// 2. Start Backend
const backend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve(rootDir, 'backend'),
  stdio: 'pipe',
  shell: isWin
});

// 3. Start Frontend
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve(rootDir, 'frontend'),
  stdio: 'pipe',
  shell: isWin
});

let openedBrowser = false;

function prefixOutput(stream, prefix, colorCode) {
  if (!stream) return;
  stream.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) {
        console.log(`\x1b[${colorCode}m[${prefix}]\x1b[0m ${line.replace(/\r/g, '')}`);
      }
      if (!openedBrowser && (trimmed.includes('5173') || trimmed.includes('Local:'))) {
        openedBrowser = true;
        console.log('\n=====================================================');
        console.log('✨ ระบบพร้อมใช้งานแล้ว (รันในหน้าต่างนี้หน้าต่างเดียว)!');
        console.log('👉 ลิงก์เข้าใช้งาน : http://localhost:5173');
        console.log('📋 คัดลอก http://localhost:5173 ลงคลิปบอร์ดแล้ว (กด Ctrl+V ได้เลย)');
        console.log('=====================================================\n');
        setTimeout(() => {
          exec('start http://localhost:5173');
        }, 1200);
      }
    });
  });
}

prefixOutput(backend.stdout, 'Backend ', '34'); // Blue
prefixOutput(backend.stderr, 'Backend ', '33'); // Yellow
prefixOutput(frontend.stdout, 'Frontend', '36'); // Cyan
prefixOutput(frontend.stderr, 'Frontend', '33'); // Yellow

function cleanup() {
  console.log('\nกำลังปิดระบบ...');
  if (isWin) {
    if (backend && backend.pid) exec(`taskkill /pid ${backend.pid} /T /F`, () => {});
    if (frontend && frontend.pid) exec(`taskkill /pid ${frontend.pid} /T /F`, () => {});
  } else {
    try { backend.kill(); } catch (e) {}
    try { frontend.kill(); } catch (e) {}
  }
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
