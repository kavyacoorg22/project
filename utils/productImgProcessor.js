
// // The code you've provided is a function that processes images using the
// //  Sharp library, which is a popular image processing library for Node.js. 
// //  It resizes the image to specific dimensions, ensures the image is saved with
// //   a unique filename, and then saves it to a specified directory.
// const sharp = require('sharp');
// const path = require('path');
// const fs = require('fs').promises;
// const crypto = require('crypto');

// const processImage = async (buffer, filename) => {
//     try {
//         // Generate unique filename
//         const uniqueFilename = `${Date.now()}-${crypto.randomBytes(6).hexSlice()}-${filename}`;
//         const relativePath = `/img/productsimg/${uniqueFilename}`;
//         const outputPath = path.join('public', 'img', 'productsimg', uniqueFilename);

//         await fs.mkdir(path.dirname(outputPath), { recursive: true });

//         // Process image with sharp
//         await sharp(buffer)
//             .resize(500, 500, { // Max dimensions 500x500
//                 fit:'fill',
//                 background: { r: 255, g: 255, b: 255, alpha: 1 }
//             })
//             .jpeg({ quality: 80 })
//             .toFile(outputPath);

//         return uniqueFilename;
//     } catch (error) {
//         console.error('Image processing error:', error);
//         throw new Error('Failed to process image');
//     }
// };

// module.exports = { processImage };

// // buffer: The raw image data (binary data) that will be processed.
// // filename: The original name of the uploaded image, used to generate a 
// //        unique filename for the processed image.

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const processImage = async (buffer, filename) => {
    try {
        // Generate unique filename
        const uniqueFilename = `${Date.now()}-${crypto.randomBytes(6).hexSlice()}-${filename}`;
        const outputPath = path.join('public', 'img', 'productsimg', uniqueFilename);

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
        console.error('Image processing error:', error);
        throw new Error('Failed to process image');
    }
};

module.exports = { processImage };