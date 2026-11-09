const router = require('express').Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const auth = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
  },
});

// POST /api/uploads/image   (multipart/form-data, campo "image")
router.post('/image', auth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera los 5 MB' : err.message;
      return res.status(400).json({ message });
    }
    if (!req.file) return res.status(400).json({ message: 'Falta el archivo (campo "image")' });

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'plazas',
        resource_type: 'image',
        transformation: [{ width: 1600, crop: 'limit' }, { quality: 'auto' }],
      },
      (error, result) => {
        if (error) return res.status(500).json({ message: 'Error al subir la imagen' });
        res.status(201).json({ url: result.secure_url });
      }
    );
    stream.end(req.file.buffer);
  });
});

module.exports = router;
