const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use(express.static(path.join(__dirname)));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.get('User-Agent') || 'Unknown'}`);
    next();
});

/* ==================== CONFIGURAZIONE ==================== */
// OpenAI configuration
const openAiConfig = {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    maxTokens: 1200
};

// API endpoint per ottenere configurazione client
app.get('/api/config', (req, res) => {
    res.json({
        openai_configured: !!process.env.OPENAI_API_KEY,
        hubspot_configured: !!process.env.HUBSPOT_API_KEY,
        backend_url: 'https://assistente-digitale.onrender.com',
        environment: process.env.NODE_ENV || 'production'
    });
});

/* ==================== AI PROPERTY MAPPER ==================== */
// Cache per proprietà HubSpot (per evitare troppe chiamate)
let hubspotPropertiesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minuti

// Funzione per ottenere proprietà HubSpot
async function getHubSpotProperties() {
    try {
        const now = Date.now();
        if (hubspotPropertiesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
            console.log('📋 Usando cache proprietà HubSpot');
            return hubspotPropertiesCache;
        }
        
        const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
        if (!HUBSPOT_API_KEY) {
            throw new Error('HubSpot API Key non disponibile');
        }

        console.log('🔄 Caricamento proprietà HubSpot da API...');
        
        const response = await fetch('https://api.hubapi.com/crm/v3/properties/contacts', {
            headers: {
                'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HubSpot Properties API Error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Filtra solo proprietà scrivibili
        const writableProperties = result.results.filter(prop => 
            !prop.readOnlyValue && 
            prop.modificationMetadata?.readOnlyValue !== true
        );
        
        hubspotPropertiesCache = writableProperties;
        cacheTimestamp = now;
        
        console.log(`✅ Caricate ${writableProperties.length} proprietà HubSpot scrivibili`);
        return writableProperties;
        
    } catch (error) {
        console.error('❌ Errore caricamento proprietà HubSpot:', error.message);
        return [];
    }
}

// AI Property Mapper - Mappa dati a proprietà HubSpot con AI
async function mapPropertiesWithAI(inputData, availableProperties) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API Key non disponibile per mapping');
        }
        
        // Prepara lista proprietà per AI
        const propertyList = availableProperties.map(prop => ({
            name: prop.name,
            label: prop.label,
            type: prop.type,
            description: prop.description || ''
        }));
        
        const aiPrompt = `
Devi mappare i dati di un lead da chat a proprietà HubSpot esistenti.

DATI INPUT:
${JSON.stringify(inputData, null, 2)}

PROPRIETÀ HUBSPOT DISPONIBILI (SOLO SCRIVIBILI):
${JSON.stringify(propertyList.slice(0, 50), null, 2)}

REGOLE MAPPING AGGIORNATE:
1. Mappa SOLO a proprietà esistenti nell'elenco sopra
2. Se una proprietà non esiste, NON includerla 
3. Usa nomi esatti delle proprietà (case-sensitive)
4. Per nome completo, splitta in firstname/lastname
5. Per campi custom, cerca proprietà simili o usa "message"

MAPPING SPECIFICO PER HUBSPOT:
- nome_completo → firstname, lastname 
- email → email
- telefono → phone  
- azienda → company
- sito_web → website
- qualifica → jobtitle
- settore → industry
- messaggio → message

ATTENZIONE CAMPI CON VALORI FISSI:
- lead_source → NON mappare a hs_analytics_source (usa OTHER_CAMPAIGNS se necessario)
- hs_analytics_source → usa solo: ORGANIC_SEARCH, PAID_SEARCH, EMAIL_MARKETING, SOCIAL_MEDIA, REFERRALS, OTHER_CAMPAIGNS, DIRECT_TRAFFIC, OFFLINE, PAID_SOCIAL
- hs_lead_status → usa solo: NEW, OPEN, IN_PROGRESS, OPEN_DEAL, UNQUALIFIED, ATTEMPTED_TO_CONTACT, CONNECTED, BAD_TIMING

NON includere mai:
- Valori custom per campi enum di HubSpot
- Proprietà che non esistono nella lista disponibile
- lead_source_detail, user_agent o altri metadati

Restituisci SOLO un JSON valido con il mapping, senza spiegazioni:

{
  "firstname": "Mario",
  "lastname": "Rossi",
  "email": "mario@example.com",
  "company": "Azienda Srl",
  "phone": "+39123456789",
  "website": "example.com",
  "jobtitle": "Manager",
  "industry": "Tecnologia",
  "message": "Messaggio del lead",
  "hs_analytics_source": "OTHER_CAMPAIGNS",
  "hs_lead_status": "NEW"
}
`;

        console.log('🤖 Chiamata AI per mapping proprietà HubSpot');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: openAiConfig.model,
                messages: [{ role: 'user', content: aiPrompt }],
                max_tokens: 500,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const aiResult = data.choices[0].message.content.trim();
        
        // Parse JSON response
        let mappedProperties;
        try {
            mappedProperties = JSON.parse(aiResult);
            console.log('🤖 AI Property Mapping completato:', Object.keys(mappedProperties));
        } catch (parseError) {
            console.log('⚠️ AI response non JSON, uso fallback');
            throw new Error('AI mapping failed: ' + aiResult);
        }
        
        return mappedProperties;
        
    } catch (error) {
        console.error('❌ Errore AI Property Mapping:', error.message);
        // Fallback con mapping manuale
        return mapPropertiesFallback(inputData);
    }
}

// Fallback mapping senza AI
function mapPropertiesFallback(inputData) {
    const [firstName, ...lastNameArray] = (inputData.nome_completo || '').split(' ');
    
    return {
        firstname: firstName || '',
        lastname: lastNameArray.join(' ') || '',
        email: inputData.email || '',
        company: inputData.azienda || '',
        phone: inputData.telefono || '',
        website: inputData.sito_web || '',
        jobtitle: inputData.qualifica || '',
        industry: inputData.settore || '',
        message: inputData.messaggio || '',
        hs_lead_status: 'NEW',
        lifecyclestage: 'lead'
    };
}

/* ==================== OPENAI PROXY ENDPOINTS ==================== */

// Endpoint per analisi intento tramite backend
app.post('/api/ai/analyze-intent', async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;
        
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ 
                success: false, 
                error: 'OpenAI non configurato sul server' 
            });
        }
        
        const intentPrompt = `
Analizza questo messaggio e determina l'intento dell'utente:

MESSAGGIO: "${message}"

CONTESTO CONVERSAZIONE (ultimi messaggi):
${conversationHistory ? conversationHistory.map(msg => `${msg.sender}: ${msg.content}`).join('\n') : 'Nessun contesto'}

POSSIBILI INTENTI:
1. consultation_request - Vuole consulenza/preventivo/informazioni commerciali
2. general_info - Chiede informazioni sui servizi
3. demo_request - Vuole vedere demo
4. pricing_info - Chiede costi/prezzi
5. technical_info - Domande tecniche
6. sector_specific - Domande su settori specifici

PAROLE CHIAVE CONSULENZA: "preventivo", "consulenza", "interessato", "richiedo", "vorrei", "contatto", "chiamata"

Restituisci SOLO un JSON:
{
  "category": "consultation_request|general_info|demo_request|pricing_info|technical_info|sector_specific",
  "intent": "descrizione_breve",
  "wantsConsultation": true/false,
  "confidence": 0.0-1.0
}
`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: openAiConfig.model,
                messages: [{ role: 'user', content: intentPrompt }],
                max_tokens: 200,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI Intent Analysis Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const intentResult = data.choices[0].message.content.trim();
        
        try {
            const intent = JSON.parse(intentResult);
            res.status(200).json({
                success: true,
                intent: intent
            });
        } catch (parseError) {
            // Fallback intent se parsing JSON fallisce
            res.status(200).json({
                success: true,
                intent: {
                    category: 'general_info',
                    intent: 'general_question',
                    wantsConsultation: false,
                    confidence: 0.5
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Errore Intent Analysis:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            intent: {
                category: 'general_info',
                intent: 'fallback',
                wantsConsultation: false,
                confidence: 0.0
            }
        });
    }
});

// Endpoint principale per chat AI tramite backend
app.post('/api/ai/chat', async (req, res) => {
    try {
        const { messages, maxTokens, temperature } = req.body;
        
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ 
                success: false, 
                error: 'OpenAI non configurato sul server' 
            });
        }
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Messages array richiesto' 
            });
        }
        
        console.log('🤖 OpenAI Chat Request:', {
            messagesCount: messages.length,
            maxTokens: maxTokens || openAiConfig.maxTokens,
            model: openAiConfig.model
        });
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: openAiConfig.model,
                messages: messages,
                max_tokens: maxTokens || openAiConfig.maxTokens,
                temperature: temperature || 0.8,
                presence_penalty: 0.1,
                frequency_penalty: 0.1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ OpenAI API Error:', response.status, errorText);
            throw new Error(`OpenAI Chat Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        // Log utilizzo token per monitoring
        if (data.usage) {
            console.log('📊 Token Usage:', {
                prompt: data.usage.prompt_tokens,
                completion: data.usage.completion_tokens,
                total: data.usage.total_tokens
            });
        }
        
        res.status(200).json({
            success: true,
            choices: data.choices,
            usage: data.usage || null
        });
        
    } catch (error) {
        console.error('❌ Errore OpenAI Chat:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/* ==================== HUBSPOT INTEGRATION ==================== */

// Endpoint per creare contatto HubSpot con AI Property Mapping
app.post('/api/hubspot/create-contact', async (req, res) => {
    try {
        const { properties } = req.body;
        const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
        
        if (!HUBSPOT_API_KEY) {
            return res.status(500).json({ 
                success: false, 
                error: 'HubSpot API Key non configurata nel server' 
            });
        }
        
        if (!properties || !properties.email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email richiesta per creare contatto HubSpot' 
            });
        }
        
        console.log('🔄 Inizio creazione contatto HubSpot con AI mapping');
        
        // STEP 1: Ottieni proprietà HubSpot disponibili
        const availableProperties = await getHubSpotProperties();
        
        if (availableProperties.length === 0) {
            console.log('⚠️ Nessuna proprietà HubSpot caricata, uso mapping standard');
        }
        
        // STEP 2: Usa AI per mappare proprietà (se disponibile)
        let finalProperties;
        if (availableProperties.length > 0 && process.env.OPENAI_API_KEY) {
            try {
                finalProperties = await mapPropertiesWithAI(properties, availableProperties);
                console.log('✅ AI Property Mapping completato');
            } catch (aiError) {
                console.log('⚠️ AI Mapping fallito, uso fallback:', aiError.message);
                finalProperties = mapPropertiesFallback(properties);
            }
        } else {
            finalProperties = mapPropertiesFallback(properties);
        }
        
        console.log('🔄 Proprietà finali per HubSpot:', {
            email: finalProperties.email,
            company: finalProperties.company || 'N/A',
            firstname: finalProperties.firstname || 'N/A'
        });
        
        // STEP 3: Crea contatto in HubSpot
        const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: finalProperties
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            // Gestione contatto duplicato
            if (response.status === 409) {
                console.log('⚠️ Contatto già esistente, eseguo update...');
                
                const updateResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${finalProperties.email}?idProperty=email`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        properties: finalProperties
                    })
                });
                
                if (updateResponse.ok) {
                    const updateResult = await updateResponse.json();
                    console.log('✅ Contatto HubSpot aggiornato:', updateResult.id);
                    
                    return res.status(200).json({
                        success: true,
                        id: updateResult.id,
                        action: 'updated',
                        properties: updateResult.properties
                    });
                }
            }
            
            throw new Error(`HubSpot API Error ${response.status}: ${result.message || JSON.stringify(result)}`);
        }
        
        console.log('✅ Contatto HubSpot creato:', result.id);
        
        res.status(200).json({
            success: true,
            id: result.id,
            action: 'created',
            properties: result.properties
        });
        
    } catch (error) {
        console.error('❌ Errore HubSpot API:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/* ==================== HEALTH CHECK E API ROUTES ==================== */

// Health check completo
app.get('/health', (req, res) => {
    const status = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'Assistente Digitale',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        backend_url: 'https://assistente-digitale.onrender.com'
    };
    
    res.status(200).json(status);
});

// API Health check dettagliato
app.get('/api/health', (req, res) => {
    const status = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
            openai: !!process.env.OPENAI_API_KEY,
            hubspot: !!process.env.HUBSPOT_API_KEY,
            ai_property_mapping: !!(process.env.OPENAI_API_KEY && process.env.HUBSPOT_API_KEY)
        },
        features: {
            hubspot_properties_cache: !!hubspotPropertiesCache,
            cached_properties_count: hubspotPropertiesCache?.length || 0,
            cache_age_minutes: cacheTimestamp ? Math.round((Date.now() - cacheTimestamp) / (1000 * 60)) : 0
        },
        backend_url: 'https://assistente-digitale.onrender.com',
        endpoints: {
            ai_chat: '/api/ai/chat',
            ai_intent: '/api/ai/analyze-intent',
            hubspot: '/api/hubspot/create-contact'
        }
    };
    
    res.status(200).json(status);
});

// API status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'active',
        message: 'Assistente Digitale API is running',
        backend: 'https://assistente-digitale.onrender.com',
        endpoints: {
            config: '/api/config',
            health: '/api/health',
            ai_chat: '/api/ai/chat',
            ai_intent: '/api/ai/analyze-intent',
            hubspot: '/api/hubspot/create-contact'
        }
    });
});

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
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        path: req.path,
        method: req.method,
        availableEndpoints: [
            'GET /api/config',
            'GET /api/health',
            'GET /api/status',
            'POST /api/ai/chat',
            'POST /api/ai/analyze-intent',
            'POST /api/hubspot/create-contact'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
        timestamp: new Date().toISOString()
    });
});

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
│  /api/hubspot/create-contact - CRM      │
╰─────────────────────────────────────────╯
    `);
});