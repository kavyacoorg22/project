const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const processImage = async (buffer, filename) => {
    try {
        // Generate unique filename
        const uniqueFilename = `${Date.now()}-${crypto.randomBytes(6).hexSlice()}-${filename}`;
        const outputPath = path.join('public', 'img', 'categories', uniqueFilename);

        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // Process image with sharp
        await sharp(buffer)
            .resize(500, 500, { // Max dimensions 500x500
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({ quality: 80 })
            .toFile(outputPath);

        return uniqueFilename;
    } catch (error) {
        
        throw new Error('Failed to process image');
    }
};

module.exports = { processImage };