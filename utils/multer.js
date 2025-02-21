//handle file uploads
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage(); // Store in memory for processing RAM

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function(req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype); //img/jpg or im/jpeg
     
    if (extname && mimetype) {
      return cb(null, true);    // Accept the file (no error, file is valid)
    } else {
      cb(new Error('Only image files are allowed!'));// Reject the file with an error
    }
  }
});

module.exports = upload;
