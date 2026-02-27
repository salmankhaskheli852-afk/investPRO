
'use server';

import fs from 'fs';
import path from 'path';

/**
 * Scans the public directory and its 'plan' subfolder for images.
 * Returns an array of image objects with URLs relative to the root.
 */
export async function getPublicImages() {
  const publicDir = path.join(process.cwd(), 'public');
  const planDir = path.join(publicDir, 'plan');
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.svg', '.webp', '.gif', '.avif'];
  let allImages: any[] = [];

  try {
    // 1. Scan root public folder
    if (fs.existsSync(publicDir)) {
      const rootFiles = fs.readdirSync(publicDir);
      rootFiles.forEach(file => {
        const fullPath = path.join(publicDir, file);
        if (fs.lstatSync(fullPath).isFile() && imageExtensions.includes(path.extname(file).toLowerCase())) {
          const name = path.parse(file).name.replace(/[_-]/g, ' ');
          allImages.push({
            id: `public-${file}`,
            url: `/${file}`,
            name: name,
            isStatic: true,
          });
        }
      });
    }

    // 2. Scan public/plan subfolder specifically
    if (fs.existsSync(planDir)) {
      const planFiles = fs.readdirSync(planDir);
      planFiles.forEach(file => {
        const fullPath = path.join(planDir, file);
        if (fs.lstatSync(fullPath).isFile() && imageExtensions.includes(path.extname(file).toLowerCase())) {
          const name = path.parse(file).name.replace(/[_-]/g, ' ');
          allImages.push({
            id: `plan-${file}`,
            url: `/plan/${file}`,
            name: name, // Clean name without path
            isStatic: true,
          });
        }
      });
    }

    return allImages;
  } catch (error) {
    console.error('Error reading directories:', error);
    return [];
  }
}
