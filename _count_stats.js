const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  // Get all files tracked by git
  const output = execSync('git ls-files').toString();
  const files = output.split(/\r?\n/).filter(Boolean);

  const stats = {};
  let totalFiles = 0;
  let totalLines = 0;

  // Extensions to include/exclude
  const includeExts = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.css',
    '.scss',
    '.html',
    '.prisma',
    '.sql',
    '.md',
    '.json',
  ];

  files.forEach((file) => {
    // Check if file exists (it should)
    if (!fs.existsSync(file)) return;

    // Skip if directory (shouldn't be in ls-files) or not a file
    if (!fs.statSync(file).isFile()) return;

    const ext = path.extname(file).toLowerCase();

    // Filter mainly code files
    if (!includeExts.includes(ext)) return;

    // Exclude lock files and generated json
    if (
      file.endsWith('package-lock.json') ||
      file.endsWith('pnpm-lock.yaml') ||
      file.endsWith('yarn.lock')
    )
      return;
    if (file.includes('tsconfig') && file.includes('.json')) {
      /* include configs */
    }

    // Simple line count
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split(/\r?\n/).length;

      if (!stats[ext]) stats[ext] = { files: 0, lines: 0 };
      stats[ext].files++;
      stats[ext].lines += lines;

      totalFiles++;
      totalLines += lines;
    } catch (err) {
      // Ignore binary read errors if any (though we filtered extensions)
    }
  });

  console.log('--------------------------------------------------');
  console.log(' Extension |   Files |   Lines');
  console.log('--------------------------------------------------');
  Object.keys(stats)
    .sort()
    .forEach((ext) => {
      console.log(
        ` ${ext.padEnd(9)} | ${stats[ext].files.toString().padStart(7)} | ${stats[ext].lines
          .toString()
          .padStart(7)}`,
      );
    });
  console.log('--------------------------------------------------');
  console.log(
    ` TOTAL     | ${totalFiles.toString().padStart(7)} | ${totalLines.toString().padStart(7)}`,
  );
  console.log('--------------------------------------------------');
} catch (e) {
  console.error('Error running stats:', e.message);
}
