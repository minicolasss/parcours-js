const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Stockage temporaire dans uploads/temp
    const dir = 'uploads/temp';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
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

// Création des dossiers nécessaires
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}
if (!fs.existsSync('./uploads/lck')) {
  fs.mkdirSync('./uploads/lck');
}
if (!fs.existsSync('./uploads/csgo')) {
  fs.mkdirSync('./uploads/csgo');
}
if (!fs.existsSync('./uploads/temp')) {
  fs.mkdirSync('./uploads/temp');
}

// Page d'accueil avec catégories
app.get('/', (req, res) => {
  res.render('home');
});

// Page upload (ancienne page d'accueil)
app.get('/upload', (req, res) => {
  res.render('upload');
});

// Traitement de l'upload
app.post('/upload', (req, res) => {
  const uploadMiddleware = upload.single('videoFile');

  uploadMiddleware(req, res, function(err) {
    if (err) {
      return res.status(400).render('error', {
        message: `Erreur lors de l'upload: ${err.message}`
      });
    }

    if (!req.file) {
      return res.status(400).render('error', {
        message: 'Aucun fichier n\'a été uploadé'
      });
    }

    const category = req.body.category;
    if (!category) {
      return res.status(400).render('error', {
        message: 'Veuillez sélectionner une catégorie'
      });
    }

    // Déplacer le fichier vers le bon dossier
    const oldPath = req.file.path;
    const newDir = `uploads/${category}`;
    const newPath = `${newDir}/${req.file.filename}`;

    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
    }

    fs.renameSync(oldPath, newPath);
    res.redirect(`/category/${category}`);
  });
});

// Affichage des vidéos par catégorie
app.get('/category/:categoryName', (req, res) => {
  try {
    const categoryName = req.params.categoryName;
    const categoryDir = `./uploads/${categoryName}/`;
    
    if (!fs.existsSync(categoryDir)) {
      return res.status(404).render('error', {
        message: 'Catégorie non trouvée'
      });
    }
    
    const files = fs.readdirSync(categoryDir);
    const videos = files.filter(file => {
      const extname = path.extname(file).toLowerCase();
      return ['.mp4', '.webm', '.ogg', '.mov'].includes(extname);
    }).map(file => {
      return {
        name: file,
        path: `/uploads/${categoryName}/${file}`,
        created: fs.statSync(`${categoryDir}${file}`).birthtime
      };
    });
    
    videos.sort((a, b) => b.created - a.created);
    
    res.render('video', { videos, category: categoryName });
  } catch (error) {
    res.status(500).render('error', {
      message: `Erreur lors de la récupération des vidéos: ${error.message}`
    });
  }
});

// Page de lecture de vidéo
app.get('/player/:category/:filename', (req, res) => {
  const { category, filename } = req.params;
  
  if (fs.existsSync(`./uploads/${category}/${filename}`)) {
    res.render('player', { 
      video: `/uploads/${category}/${filename}`, 
      title: filename,
      category
    });
  } else {
    res.status(404).render('error', {
      message: 'Vidéo non trouvée'
    });
  }
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page non trouvée' });
});

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});