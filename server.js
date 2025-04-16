require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// Configuration CORS avancée
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuration MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'ramez123321',
  database: process.env.DB_NAME || 'phone_store',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Vérification connexion MySQL
pool.getConnection()
  .then(conn => {
    console.log('Connecté à MySQL avec succès');
    conn.release();
  })
  .catch(err => {
    console.error('Erreur de connexion MySQL:', err.message);
    process.exit(1);
  });

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes API

// HEALTH CHECK
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// USER ROUTES
// Route d'inscription
app.post('/register', async (req, res) => {
    try {
      const { name, email, password, confirmPassword } = req.body;
  
      // Validation
      if (!name || !email || !password || !confirmPassword) {
        return res.status(400).json({
          success: false,
          error: "Tous les champs sont obligatoires"
        });
      }
  
      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: "Les mots de passe ne correspondent pas"
        });
      }
  
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error: "Le mot de passe doit contenir au moins 8 caractères"
        });
      }
  
      // Vérification si l'email existe déjà
      const [existingUser] = await pool.query(
        'SELECT id FROM users WHERE email = ?', 
        [email]
      );
  
      if (existingUser.length > 0) {
        return res.status(409).json({
          success: false,
          error: "Cet email est déjà utilisé"
        });
      }
  
      // Hash du mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Création de l'utilisateur
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPassword]
      );
  
      // Génération du token JWT
      const user = {
        id: result.insertId,
        name,
        email
      };
  
      const token = jwt.sign(
        user,
        process.env.JWT_SECRET || 'your_secret_key',
        { expiresIn: '24h' }
      );
  
      res.status(201).json({
        success: true,
        message: "Inscription réussie!",
        user,
        token
      });
  
    } catch (err) {
      console.error("Erreur lors de l'inscription:", err);
      res.status(500).json({
        success: false,
        error: "Erreur serveur lors de l'inscription"
      });
    }
  });

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email et mot de passe requis' 
      });
    }
    
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?', 
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Email ou mot de passe incorrect' 
      });
    }
    
    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false,
        error: 'Email ou mot de passe incorrect' 
      });
    }
    
    const token = jwt.sign(
      { 
        id: user.id, 
        name: user.name, 
        email: user.email 
      },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '24h' }
    );
    
    res.json({ 
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token
    });
    
  } catch (err) {
    console.error('Erreur connexion:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// PHONE ROUTES
app.get('/phones', async (req, res) => {
  try {
    const [phones] = await pool.query('SELECT * FROM phones');
    res.json({ 
      success: true,
      data: phones 
    });
  } catch (err) {
    console.error('Erreur récupération téléphones:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// Détails d'un téléphone
app.get('/phone/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [phones] = await pool.query('SELECT * FROM phones WHERE id = ?', [id]);
    
    if (phones.length === 0) {
      return res.status(404).json({ error: 'Téléphone non trouvé' });
    }
    
    res.json(phones[0]);
  } catch (err) {
    console.error('Erreur lors de la récupération du téléphone:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// -------- API Panier --------

// Sauvegarde du panier (pour utilisateur connecté)
app.post('/cart/save', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cart } = req.body;
    
    // Suppression de l'ancien panier
    await pool.query('DELETE FROM user_carts WHERE user_id = ?', [userId]);
    
    // Insertion du nouveau panier
    if (cart && cart.length > 0) {
      const cartItems = cart.map(item => [userId, item.id, item.quantity]);
      await pool.query('INSERT INTO user_carts (user_id, phone_id, quantity) VALUES ?', [cartItems]);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur lors de la sauvegarde du panier:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupération du panier (pour utilisateur connecté)
app.get('/cart', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [cartItems] = await pool.query(`
      SELECT p.id, p.name, p.brand, p.price, p.image, uc.quantity 
      FROM user_carts uc
      JOIN phones p ON uc.phone_id = p.id
      WHERE uc.user_id = ?
    `, [userId]);
    
    res.json(cartItems);
  } catch (err) {
    console.error('Erreur lors de la récupération du panier:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// -------- API Commande --------

// Passer une commande
// Route pour confirmer une commande
app.post('/confirm-order', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { cart, shippingInfo, paymentMethod } = req.body;
  
      // Validation des données
      if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Panier invalide ou vide"
        });
      }
  
      if (!shippingInfo || !paymentMethod) {
        return res.status(400).json({
          success: false,
          error: "Informations de livraison et paiement requises"
        });
      }
  
      // Calcul du total
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const shippingCost = 15; // Frais de livraison fixes
      const total = subtotal + shippingCost;
  
      // Création de la commande dans la base de données
      const [orderResult] = await pool.query(
        `INSERT INTO orders 
        (user_id, name, email, phone, address, city, state, zip, payment_method, subtotal, shipping, total) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          shippingInfo.name,
          shippingInfo.email,
          shippingInfo.phone,
          shippingInfo.address,
          shippingInfo.city,
          shippingInfo.state,
          shippingInfo.zip,
          paymentMethod,
          subtotal,
          shippingCost,
          total
        ]
      );
  
      const orderId = orderResult.insertId;
  
      // Ajout des articles de la commande
      const orderItems = cart.map(item => [
        orderId,
        item.id,
        item.name,
        item.price,
        item.quantity,
        new Date() // created_at
      ]);
  
      await pool.query(
        `INSERT INTO order_items 
        (order_id, product_id, product_name, price, quantity, created_at) 
        VALUES ?`,
        [orderItems]
      );
  
      // Vider le panier (si stocké en base)
      await pool.query('DELETE FROM cart WHERE user_id = ?', [userId]);
  
      // Réponse avec les détails de la commande
      res.status(201).json({
        success: true,
        orderId,
        orderNumber: `CMD-${orderId.toString().padStart(6, '0')}`,
        total,
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // +3 jours
      });
  
    } catch (err) {
      console.error("Erreur confirmation commande:", err);
      res.status(500).json({
        success: false,
        error: "Erreur serveur lors de la confirmation"
      });
    }
  });

// -------- API Contact --------

app.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // Validation des données
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
    }
    
    // Enregistrement du message
    await pool.query(
      'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
      [name, email, subject, message]
    );
    
    // Ici vous pourriez ajouter l'envoi d'un email réel
    console.log('Message de contact reçu:', { name, email, subject, message });
    
    res.json({ success: true });
    
  } catch (err) {
    console.error('Erreur lors de l\'envoi du message:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// -------- Gestion des erreurs 404 --------
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint non trouvé' });
});

// -------- Lancement du serveur --------
app.listen(port, () => {
  console.log(`Serveur backend Phone Store démarré sur http://localhost:${port}`);
});

/* SQL COMPLET :
CREATE DATABASE IF NOT EXISTS phone_store;
USE phone_store;

-- Table utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table téléphones
CREATE TABLE IF NOT EXISTS phones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  brand VARCHAR(50) NOT NULL,
  price INT NOT NULL,
  image TEXT,
  description TEXT,
  stock INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table paniers utilisateurs
CREATE TABLE IF NOT EXISTS user_carts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  phone_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (phone_id) REFERENCES phones(id) ON DELETE CASCADE,
  UNIQUE KEY (user_id, phone_id)
);

-- Table commandes
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(50) NOT NULL,
  state VARCHAR(50) NOT NULL,
  zip VARCHAR(20) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  total INT NOT NULL,
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table articles de commande
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  phone_id INT,
  name VARCHAR(100) NOT NULL,
  brand VARCHAR(50),
  price INT NOT NULL,
  quantity INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (phone_id) REFERENCES phones(id) ON DELETE SET NULL
);

-- Table messages de contact
CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE
);

-- Données initiales (exemple)
-- Insertion des téléphones Apple
INSERT INTO phones (name, brand, price, image, description, stock) VALUES
('iPhone 14', 'apple', 4299, 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-14-model-unselect-gallery-1-202209?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1660691652450', 'iPhone 14 avec écran Super Retina XDR', 50),
('iPhone 13', 'apple', 3999, 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-13-model-unselect-gallery-1-202207?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1654893619853', 'iPhone 13 avec puce A15 Bionic', 45),
('iPhone 12', 'apple', 3499, 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-12-purple-select-2021?wid=940&hei=1112&fmt=png-alpha&.v=1617130317000', 'iPhone 12 avec écran OLED', 40);

-- Insertion des téléphones Samsung
INSERT INTO phones (name, brand, price, image, description, stock) VALUES
('Galaxy S23', 'samsung', 3799, 'https://images.samsung.com/is/image/samsung/p6pim/levant/sm-s911blgcmea/gallery/levant-galaxy-s23-s911-sm-s911blgcmea-534878469?$720_576_PNG$', 'Galaxy S23 avec processeur Snapdragon 8 Gen 2', 35),
('Galaxy S22', 'samsung', 3399, 'https://images.samsung.com/is/image/samsung/p6pim/ie/sm-s901biddeub/gallery/ie-galaxy-s22-s901-sm-s901biddeub-531389627?$720_576_PNG$', 'Galaxy S22 avec écran Dynamic AMOLED 2X', 30);

-- Insertion des téléphones Huawei
INSERT INTO phones (name, brand, price, image, description, stock) VALUES
('P60 Pro', 'huawei', 3499, 'https://consumer.huawei.com/content/dam/huawei-cbg-site/common/mkt/pdp/phones/p60-pro/img/pc/huawei-p60-pro-black.png', 'Huawei P60 Pro avec appareil photo ultra-lumineux', 25),
('Nova 10', 'huawei', 2299, 'https://consumer.huawei.com/content/dam/huawei-cbg-site/common/mkt/pdp/phones/nova10/list/silver.png', 'Huawei Nova 10 avec écran OLED incurvé', 20),
('Y70', 'huawei', 899, 'https://consumer.huawei.com/content/dam/huawei-cbg-site/common/mkt/pdp/phones/y70/list/y70-black.png', 'Huawei Y70 avec grande batterie', 15);

-- Insertion des téléphones Xiaomi
INSERT INTO phones (name, brand, price, image, description, stock) VALUES
('Xiaomi 13', 'xiaomi', 2999, 'https://i01.appmifile.com/v1/MI_18455B3E4DA706226CF7535A58E875F0267/pms_1670745783.06029001.png', 'Xiaomi 13 avec processeur Snapdragon 8 Gen 2', 40),
('Xiaomi 12T', 'xiaomi', 2499, 'https://i01.appmifile.com/v1/MI_18455B3E4DA706226CF7535A58E875F0267/pms_1662464247.35319007.png', 'Xiaomi 12T avec capteur photo de 108MP', 35),
('Redmi Note 12', 'xiaomi', 1199, 'https://i01.appmifile.com/v1/MI_18455B3E4DA706226CF7535A58E875F0267/pms_1680528198.03359238.png', 'Redmi Note 12 avec écran AMOLED 120Hz', 30);
*/