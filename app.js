const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers vidéo sont acceptés!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/upload', upload.single('videoFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).render('error', { 
        message: 'Aucun fichier n\'a été uploadé' 
      });
    }
    res.redirect('/videos');
  } catch (error) {
    res.status(500).render('error', { 
      message: `Erreur lors de l'upload: ${error.message}` 
    });
  }
});

app.get('/videos', (req, res) => {
  try {
    const files = fs.readdirSync('./uploads/');
    const videos = files.filter(file => {
      const extname = path.extname(file).toLowerCase();
      return ['.mp4', '.webm', '.ogg', '.mov'].includes(extname);
    }).map(file => {
      return {
        name: file,
        path: `/uploads/${file}`,
        created: fs.statSync(`./uploads/${file}`).birthtime
      };
    });
    
    videos.sort((a, b) => b.created - a.created);
    
    res.render('video', { videos });
  } catch (error) {
    res.status(500).render('error', { 
      message: `Erreur lors de la récupération des vidéos: ${error.message}` 
    });
  }
});

app.get('/player/:filename', (req, res) => {
  const filename = req.params.filename;
  
  if (fs.existsSync(`./uploads/${filename}`)) {
    res.render('player', { video: `/uploads/${filename}`, title: filename });
  } else {
    res.status(404).render('error', { 
      message: 'Vidéo non trouvée' 
    });
  }
});

app.use((req, res) => {
  res.status(404).render('error', { message: 'Page non trouvée' });
});

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});