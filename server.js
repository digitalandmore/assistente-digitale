import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import dotenv from 'dotenv';
import  session from 'express-session';
import { fileURLToPath } from 'url';
import {chat} from './controllers/chatController.js';
import analizeIntent from './controllers/analizeIntentController.js';
import hubespostController from './controllers/hubspotController.js';
import healtController from './controllers/healtController.js';
import dectailHealtController from './controllers/dectailHealtController.js';
import { getHubSpotProperties } from './services/hubespostService.js';
import statusController from './controllers/statusController.js';
import errorController from './controllers/errorController.js';
import globalErrorController from './controllers/globalErrorController.js';
import spaBehaviorController from './controllers/spabehaviorController.js';
import getChatController from './controllers/getChatcontroller.js';
// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
/* ==================== CONFIGURAZIONE MONGO DB E SESSION STOARAGE ==================== */
mongoose.connect(`mongodb+srv://assistente-digitale:${process.env.DB_PASS}@cluster0.zkeifcp.mongodb.net/`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // true solo se HTTPS
}));
/* ==================== MIDDLEWARE ==================== */
// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://connect.facebook.net", "https://js-eu1.hs-scripts.com", "https://cs.iubenda.com", "https://cdn.iubenda.com"],
            connectSrc: ["'self'", "https://www.google-analytics.com", "https://www.facebook.com", "https://formspree.io", "https://api.openai.com", "https://api.hubapi.com"],
            frameSrc: ["'self'"]
        }
    }
}));

app.use(compression());

// CORS configuration - AGGIORNATO per Render
app.use(cors({
    origin: [
        'https://assistente-digitale.it',
        'https://www.assistente-digitale.it',
        'https://assistente-digitale.onrender.com',
        'http://localhost:3000',
        'http://127.0.0.1:5500',
        'http://localhost:5500'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Serve static files from current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname)));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.get('User-Agent') || 'Unknown'}`);
    next();
});


// API endpoint per ottenere configurazione client
app.get('/api/config', (req, res) => {
    res.json({
        openai_configured: !!process.env.OPENAI_API_KEY,
        hubspot_configured: !!process.env.HUBSPOT_API_KEY,
        backend_url: 'https://assistente-digitale.onrender.com',
        environment: process.env.NODE_ENV || 'production'
    });
});


/* ==================== OPENAI PROXY ENDPOINTS ==================== */

// Endpoint per analisi intento tramite backend
app.post('/api/ai/analyze-intent', analizeIntent  
);

// // Endpoint principale per chat AI tramite backend
app.post('/api/ai/chat',chat);

/* ==================== HUBSPOT INTEGRATION ==================== */

// Endpoint per creare contatto HubSpot con AI Property Mapping
app.post('/api/hubspot/create-contact', hubespostController );

/* ==================== HEALTH CHECK E API ROUTES ==================== */

// Health check completo
app.get('/health', healtController);

// API Health check dettagliato
app.get('/api/health',dectailHealtController);

// API status endpoint
app.get('/api/status', statusController);

/* ==================== API REST ANDPOINT ==================== */
app.get('/api/conversations', getChatController);

/* ==================== STATIC FILES & SPA ROUTING ==================== */

// Serve index.html for all non-API routes (SPA behavior)
app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return next();
    }
    
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(404).send('File not found');
        }
    });
});
/* ==================== ERROR HANDLING ==================== */

// 404 handler for API routes
app.use('/api/*', errorController);

// Global error handler
app.use(globalErrorController);





function listRoutes(app) {
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Route diretta
      const methods = Object.keys(middleware.route.methods)
        .map((m) => m.toUpperCase())
        .join(', ');
      console.log(`${methods} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      // Router montato
      middleware.handle.stack.forEach((handler) => {
        const route = handler.route;
        if (route) {
          const methods = Object.keys(route.methods)
            .map((m) => m.toUpperCase())
            .join(', ');
          console.log(`${methods} ${route.path}`);
        }
      });
    }
  });
}

// Dopo aver registrato tutte le rotte:
listRoutes(app);
/* ==================== SERVER STARTUP ==================== */

// Pre-carica proprietà HubSpot al startup se configurato
if (process.env.HUBSPOT_API_KEY) {
    console.log('🔄 Pre-caricamento proprietà HubSpot...');
    getHubSpotProperties()
        .then(properties => {
            console.log(`✅ Pre-caricate ${properties.length} proprietà HubSpot`);
        })
        .catch(error => {
            console.log('⚠️ Pre-caricamento HubSpot fallito:', error.message);
        });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╭─────────────────────────────────────────╮
│  🚀 Assistente Digitale Server + AI    │
├─────────────────────────────────────────┤
│  Port: ${PORT}                           │
│  URL:  http://localhost:${PORT}          │
│  Backend: assistente-digitale.onrender.com │
├─────────────────────────────────────────┤
│  Services Status:                       │
│  OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configurato' : '❌ Non configurato'}     │
│  HubSpot: ${process.env.HUBSPOT_API_KEY ? '✅ Configurato' : '❌ Non configurato'}    │
│  AI Mapping: ${process.env.OPENAI_API_KEY && process.env.HUBSPOT_API_KEY ? '✅ Attivo' : '❌ Inattivo'}        │
│  CORS: ✅ Configurato per Render        │
├─────────────────────────────────────────┤
│  Endpoints:                             │
│  /health - Health check                 │
│  /api/status - API status               │
│  /api/ai/chat - Chat principale         │
│  /api/ai/analyze-intent - Analisi AI    │
│  /api/hubspot/create-contact - CRM 
|  /api/conversations                     │
╰─────────────────────────────────────────╯
    `);
});