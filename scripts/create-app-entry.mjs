import { copyFile } from 'node:fs/promises';

await copyFile('dist/index.html', 'dist/app');
console.log('Created dist/app for the extensionless /app route.');
