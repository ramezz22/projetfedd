import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';

const app = express();
const port = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'ramzuss';

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'ramez123321',
  database: process.env.DB_NAME || 'phone_store'
};

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));

// Routes API

// Connexion utilisateur
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [results] = await connection.execute("SELECT * FROM users WHERE email = ?", [email]);
    connection.end();

    if (results.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Email ou mot de passe incorrect !" 
      });
    }

    const user = results[0];
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(400).json({ 
        success: false,
        message: "Email ou mot de passe incorrect !" 
      });
    }

    const token = jwt.sign({ 
      id: user.id, 
      name: user.name,
      email: user.email 
    }, SECRET_KEY, { expiresIn: "24h" });

    res.json({ 
      success: true,
      message: "Connexion réussie !", 
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
});

// Inscription utilisateur
app.post('/register', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Les mots de passe ne correspondent pas"
    });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [existingUsers] = await connection.execute("SELECT id FROM users WHERE email = ?", [email]);
    
    if (existingUsers.length > 0) {
      connection.end();
      return res.status(400).json({
        success: false,
        message: "Cet email est déjà utilisé"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await connection.execute(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );

    connection.end();

    const user = {
      id: result.insertId,
      name,
      email
    };

    const token = jwt.sign(user, SECRET_KEY, { expiresIn: "24h" });

    res.status(201).json({
      success: true,
      message: "Inscription réussie !",
      user,
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'inscription"
    });
  }
});

// Récupérer les téléphones
app.get('/phones', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [results] = await connection.execute("SELECT * FROM phones");
    connection.end();
    
    // Conversion explicite des DECIMAL en Number
    const formattedResults = results.map(phone => ({
      ...phone,
      price: Number(phone.price) // Conversion explicite
    }));
    
    res.json({
      success: true,
      data: formattedResults
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
});

// Récupérer le panier utilisateur
app.get('/cart', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [results] = await connection.execute(
      "SELECT phone_id as id, quantity, product_name as name, price, brand FROM user_carts WHERE user_id = ?",
      [userId]
    );
    connection.end();

    res.json({
      success: true,
      cart: results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
});

// Sauvegarder le panier
app.post('/cart/save', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { cart } = req.body;

  if (!cart) {
    return res.status(400).json({ success: false, message: "Données du panier manquantes" });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Supprimer l'ancien panier
    await connection.execute("DELETE FROM user_carts WHERE user_id = ?", [userId]);

    // Insérer le nouveau panier
    if (cart.length > 0) {
      const values = cart.map(item => [
        userId, 
        item.id, 
        item.quantity,
        item.name,
        item.price,
        item.brand
      ]);
      
      await connection.query(
        `INSERT INTO user_carts 
        (user_id, phone_id, quantity, product_name, price, brand) 
        VALUES ?`,
        [values]
      );
    }

    connection.end();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la sauvegarde du panier"
    });
  }
});

// Passer commande
app.post('/orders', authenticateToken, async (req, res) => {
  const { items, total, shipping, paymentMethod, card } = req.body;
  const userId = req.user.id;
  const userEmail = req.user.email;

  // Validation
  if (!items?.length) {
      return res.status(400).json({ success: false, message: "Panier vide" });
  }

  if (typeof total !== 'number' || total <= 0) {
      return res.status(400).json({ success: false, message: "Total invalide" });
  }

  try {
      const connection = await mysql.createConnection(dbConfig);
      
      // Calcul des montants
      const subtotal = total;
      const shippingCost = 0; // Frais de livraison
      
      // Création de la commande
      const [orderResult] = await connection.execute(
          `INSERT INTO orders (
              user_id, first_name, last_name, email, phone, 
              address, city, zip, country, notes,
              payment_method, subtotal, shipping, total, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
              userId,
              shipping.shippingFirstname,
              shipping.shippingLastname,
              userEmail,
              shipping.shippingPhone,
              shipping.shippingAddress,
              shipping.shippingCity,
              shipping.shippingZip,
              shipping.shippingCountry,
              shipping.shippingNotes || null,
              paymentMethod,
              subtotal,
              shippingCost,
              total,
              'pending'
          ]
      );

      // Ajout des articles
      await connection.query(
          `INSERT INTO order_items (
              order_id, phone_id, name, brand, price, quantity
          ) VALUES ?`,
          [items.map(item => [
              orderResult.insertId,
              item.id,
              item.name,
              item.brand,
              item.price,
              item.quantity
          ])]
      );

      // Paiement par carte
      if (paymentMethod === 'card' && card) {
          await connection.execute(
              `INSERT INTO payments (
                  order_id, method, card_last4, card_exp, amount, status
              ) VALUES (?, ?, ?, ?, ?, ?)`,
              [
                  orderResult.insertId,
                  'card',
                  card.number.slice(-4),
                  card.expiry,
                  total,
                  'completed'
              ]
          );
      }

      connection.end();

      res.json({ 
          success: true,
          message: "Commande validée",
          orderId: orderResult.insertId
      });

  } catch (error) {
      console.error('Erreur commande:', error);
      res.status(500).json({
          success: false,
          message: "Erreur serveur",
          error: error.message
      });
  }
});
// Route de contact
app.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      "INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)",
      [name, email, subject, message]
    );
    connection.end();

    res.json({ success: true, message: "Message envoyé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur lors de l'envoi du message" });
  }
});

// Middleware d'authentification
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});