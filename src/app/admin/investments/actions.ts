
'use server';

import fs from 'fs';
import path from 'path';

/**
 * Scans the public directory for images and returns a list of items for the library.
 * This allows the user to just "Copy-Paste" files into the public folder and see them.
 */
export async function getPublicImages() {
  const publicDir = path.join(process.cwd(), 'public');
  try {
    if (!fs.existsSync(publicDir)) return [];
    
    const files = fs.readdirSync(publicDir);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.svg', '.webp', '.gif'];
    
    return files
      .filter(file => imageExtensions.includes(path.extname(file).toLowerCase()))
      .map(file => {
        // Clean name: remove extension and replace symbols with spaces
        const name = path.parse(file).name.replace(/[_-]/g, ' ');
        return {
          id: `public-${file}`,
          url: `/${file}`,
          name: name,
          isStatic: true, // Marked as static so it can't be deleted from the UI easily
        };
      });
  } catch (error) {
    console.error('Error reading public directory:', error);
    return [];
  }
}
