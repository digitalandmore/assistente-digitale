import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import dotenv from 'dotenv';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
// Import controllers
/* ==================== Controllers principali ==================== */
import { chat, archiveChat, markAsVisualized, deleteChat, saveMessages, saveMessagesFb } from './controllers/chatController.js';
import { getChatController, getArchiviedChatController, DeleteChatContoller, restoreChat, getChatToThisMonth } from './controllers/getChatcontroller.js';
import { saveToDbChatController, setLeadGenerationTrue } from './controllers/saveToDbChatController.js';

/* ====================Meta Controllers  ==================== */
/* ==================== Controllers ==================== */
import analizeIntent from './controllers/analizeIntentController.js';
import hubespostController from './controllers/hubspotController.js';
import healtController from './controllers/healtController.js';
import dectailHealtController from './controllers/dectailHealtController.js';
import { getHubSpotProperties, mapPropertiesWithAI } from './services/hubespostService.js';
import statusController from './controllers/statusController.js';
import errorController from './controllers/errorController.js';
import globalErrorController from './controllers/globalErrorController.js';
import { getUsersController, updateUserDisplayName, createUser, } from './controllers/usersController.js';
import { editContact, getKnowledge } from './controllers/KnowledgeController.js'
// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
/* ==================== CONFIGURAZIONE MONGO DB E SESSION STOARAGE ==================== */
mongoose.connect(`mongodb+srv://assistente-digitale:${process.env.DB_PASS}@cluster0.zkeifcp.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tls: true,
  tlsAllowInvalidCertificates: true
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
    'http://localhost:5500',
    'http://localhost:5173'
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
/* ==================== INTEGRAZIONE META ==================== */
async function getOpenAIResponse(messages) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 150,
      temperature: 0.8
    })
  });

  const data = await response.json();

  return data.choices?.[0]?.message?.content || "🤖 Risposta non disponibile";
}
/* ==================== INTEGRAZIONE MESSENGER ==================== */
const msgToken = process.env.MSG_TOKEN
async function sendMessengerMessage(to, text) {
  const res = await fetch(`https://graph.facebook.com/v17.0/me/messages?access_token=${msgToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: to },
      message: { text }
    })
  });
  return res.json();
}
async function sendMessengerButton(to, text, buttons = []) {
  const res = await fetch(`https://graph.facebook.com/v17.0/me/messages?access_token=${msgToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: to },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: text,      // testo del messaggio
            buttons: buttons // array di pulsanti
          }
        }
      }
    })
  });

  return res.json();
}
const igToken = process.env.IG_TOKEN;
const igUserId = process.env.IG_USER_ID;
async function sendInstagramMessage(to, text) {
  try {
    const res = await fetch(`https://graph.facebook.com/v17.0/me/messages?access_token=${igToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "instagram",  // Obbligatorio per IG
        recipient: { id: to },           // Instagram User ID del destinatario
        message: { text }
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("❌ Errore invio messaggio Instagram:", data);
    }
    return data;

  } catch (err) {
    console.error("❌ Fetch error Instagram:", err);
    throw err;
  }
}

const userSessions = new Map();

// Definisci le domande e le proprietà HubSpot corrispondenti
const HUBSPOT_QUESTIONS = [
  { key: 'nome', question: 'Qual è il tuo nome?' },
  { key: 'cognome', question: 'Qual è il tuo cognome?' },
  { key: 'email', question: 'Qual è la tua email aziendale?' },
  { key: 'telefono', question: 'Il tuo numero di telefono?' },
  { key: 'azienda', question: 'Qual è il nome della tua azienda?' },
  { key: 'sito_web', question: 'Qual è il sito web della tua azienda?' },
  { key: 'qualifica', question: 'Qual è il tuo ruolo in azienda?' },
  { key: 'settore', question: 'In quale settore operi?' },
  { key: 'messaggio', question: 'Descrivi brevemente le tue esigenze o richieste.' }
];

// async function handleHubSpotQuestions(senderId, messageText) {
//   if (!userSessions.has(senderId)) {
//     userSessions.set(senderId, { data: {}, currentQuestion: 0 });
//   }

//   const session = userSessions.get(senderId);

//   // Salva la risposta precedente
//   if (session.currentQuestion > 0) {
//     const prevKey = HUBSPOT_QUESTIONS[session.currentQuestion - 1].key;
//     session.data[prevKey] = messageText;
//   }

//   // Se ci sono altre domande → invia la prossima
//   if (session.currentQuestion < HUBSPOT_QUESTIONS.length) {
//     const currentQuestionText = HUBSPOT_QUESTIONS[session.currentQuestion].question;
//     session.currentQuestion += 1;
//     await sendMessengerMessage(senderId, currentQuestionText);  
//     return;
//   }

//   // Tutte le domande completate → processa il lead
//   try {
//     await sendMessengerButton(senderId, 
//       `Ecco i dati che hai inserito:\n\n${summary}\n\nVuoi confermare l'invio?`,
//       [
//         { type: "postback", title: "✅ Conferma", payload: "CONFIRM_LEAD" },
//         { type: "postback", title: "❌ Annulla", payload: "CANCEL_LEAD" }
//       ]
//     );

//     const result = await response.json();

//     if (result.success) {
//       await sendMessengerMessage(senderId, "✅ Grazie! La tua richiesta è stata inviata con successo.");
//     } else {
//       await sendMessengerMessage(senderId, "❌ C'è stato un problema nell'invio della richiesta. Riprova più tardi.");
//     }
//   } catch (err) {
//     await sendMessengerMessage(senderId, `❌ Errore: ${err.message}`);
//   } finally {
//     userSessions.delete(senderId);
//   }
// }
// async function handleHubSpotQuestions(senderId, messageText) {
//   if (!userSessions.has(senderId)) {
//     userSessions.set(senderId, { data: {}, currentQuestion: 0 });
//   }

//   const session = userSessions.get(senderId);

//   // Salva risposta precedente
//   if (session.currentQuestion > 0) {
//     const prevKey = HUBSPOT_QUESTIONS[session.currentQuestion - 1].key;
//     session.data[prevKey] = messageText;
//   }

//   // Se ci sono altre domande → invia la prossima
//   if (session.currentQuestion < HUBSPOT_QUESTIONS.length) {
//     const currentQuestionText = HUBSPOT_QUESTIONS[session.currentQuestion].question;
//     session.currentQuestion += 1;
//     await sendMessengerMessage(senderId, currentQuestionText);
//     return;
//   }

//   // Tutte le domande completate → mostra riepilogo e chiedi conferma
//   const summary = Object.entries(session.data)
//     .map(([k, v]) => `• ${k}: ${v}`)
//     .join("\n");

//   await sendMessengerButton(senderId,
//     `Ecco i dati che hai inserito:\n\n${summary}\n\nVuoi confermare l'invio?`,
//     [
//       { type: "postback", title: "✅ Conferma", payload: "CONFIRM_LEAD" },
//       { type: "postback", title: "❌ Annulla", payload: "CANCEL_LEAD" }
//     ]
//   );
// }
export async function handleHubSpotQuestions(senderId, messageText) {
  // Crea sessione se non esiste
  if (!userSessions.has(senderId)) {
    const conversationId = uuidv4();
    userSessions.set(senderId, { data: {}, currentQuestion: 0, conversationId, leadCompleted: false });
  }

  const session = userSessions.get(senderId);

  // Salva risposta precedente
  if (session.currentQuestion > 0) {
    const prevKey = HUBSPOT_QUESTIONS[session.currentQuestion - 1].key;
    session.data[prevKey] = messageText;
  }

  // Invia prossima domanda se ci sono ancora domande
  if (session.currentQuestion < HUBSPOT_QUESTIONS.length) {
    const currentQuestionText = HUBSPOT_QUESTIONS[session.currentQuestion].question;
    session.currentQuestion += 1;
    await sendMessengerMessage(senderId, currentQuestionText);
    return;
  }

  // Tutte le domande completate → mostra riepilogo e chiedi conferma
  const summary = Object.entries(session.data)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  await sendMessengerButton(senderId,
    `Ecco i dati che hai inserito:\n\n${summary}\n\nVuoi confermare l'invio?`,
    [
      { type: "postback", title: "✅ Conferma", payload: "CONFIRM_LEAD" },
      { type: "postback", title: "❌ Annulla", payload: "CANCEL_LEAD" }
    ]
  );
}
//||-------------------------------FACEBOOK----------------------------||\\
// async function handleIncomingMessageMessanger(from, text, req, res) {
//   try {
//     const messages = [
//       { role: "system", content: SYSTEM_PROMPT_FB },
//       { role: "user", content: text }
//     ];
//     let conversationId;
//     if (userSessions.has(from)) {
//       conversationId = userSessions.get(from).conversationId;
//     }
//     const assistantHtml = await getOpenAIResponse(messages);
//     const assistantText = htmlToWhatsappText(assistantHtml) || "🤖 Risposta non disponibile";
//     await saveMessagesFb(from, text, assistantText, conversationId || uuidv4());
//     const welcomeMessage = `Benvenuto!
// Sono il tuo consulente AI specializzato in soluzioni digitali per PMI.
// Cosa ti interessa?`;

//     const welcomeButtons = [
//       { type: "postback", title: "Come funziona", payload: "Come funziona il vostro servizio?" },
//       { type: "postback", title: "Vedi Demo", payload: "Vorrei vedere le demo disponibili" },
//       { type: "postback", title: "Consulenza Gratuita", payload: "Richiedo informazioni per una consulenza" },
//       { type: "postback", title: "Settori", payload: "Che settori seguite?" },
//       { type: "postback", title: "Prezzi", payload: "Quali sono i costi?" },
//       { type: "postback", title: "Integrazioni", payload: "Integrazione con i miei strumenti" },
//     ];

//     const buttons = [
//       { type: "web_url", url: "https://assistente-digitale.it/e-commerce-demo/", title: "E-commerce Demo" },
//       { type: "web_url", url: "https://assistente-digitale.it/studio-dentistico-demo/", title: "Studio Dentistico Demo" }
//     ];
//     const hubspot = [
//       { type: "web_url", url: "https://assistente-digitale.it/#contact", title: 'Consulenza' }
//     ]


//     if (assistantText === 'DEMO_CONFIRMED') {
//       await sendMessengerButton(from, "Certo! Scegli un'opzione:", buttons);
//       return;
//     }

//     // Se inizia lead generation o l'utente è già in sessione
//     else if (assistantText === 'LEAD_GENERATION_START' || userSessions.has(from)) {
//       await handleHubSpotQuestions(from, text); // qui text è la risposta dell'utente
//       return;
//     }
//     else if (payload === "CONFIRM_LEAD") {
//       const session = userSessions.get(from);
//       if (session) {
//         await sendMessengerMessage(from, "⏳ Invio in corso...");
//         try {
//           const response = await fetch('https://assistente-digitale.onrender.com/api/hubspot/create-contact', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//               properties: session.data,
//               conversationId: session.conversationId
//             })
//           });
//           const result = await response.json();
//           if (result.success) {
//             await sendMessengerMessage(from, "✅ Grazie! La tua richiesta è stata inviata con successo.");
//           } else {
//             await sendMessengerMessage(from, "❌ C'è stato un problema nell'invio della richiesta.");
//           }
//         } catch (err) {
//           await sendMessengerMessage(from, `❌ Errore: ${err.message}`);
//         } finally {
//           userSessions.delete(from);
//         }
//       }
//     }

//     else if (payload === "CANCEL_LEAD") {
//       await sendMessengerMessage(from, "❌ Invio annullato. I tuoi dati non sono stati salvati.");
//       userSessions.delete(from);
//     }
//     else {
//       await sendMessengerMessage(from, assistantText);
//     }

//   } catch (err) {
//     console.error("Errore gestione messaggio entrante:", err);
//     await sendMessengerMessage(from, "❌ Errore interno, riprova più tardi.");
//   }
// }
export async function handleIncomingMessageMessanger(from, text, payload) {
  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT_FB },
      { role: "user", content: text }
    ];

    // Ottieni sessione se esiste
    let session = userSessions.get(from);

    const assistantHtml = await getOpenAIResponse(messages);
    const assistantText = htmlToWhatsappText(assistantHtml) || "🤖 Risposta non disponibile";

    // Salva messaggio con conversationId esistente o nuovo
    await saveMessagesFb(from, text, assistantText, session?.conversationId || uuidv4());

    // Flow DEMO
    if (assistantText === 'DEMO_CONFIRMED') {
      const buttons = [
        { type: "web_url", url: "https://assistente-digitale.it/e-commerce-demo/", title: "E-commerce Demo" },
        { type: "web_url", url: "https://assistente-digitale.it/studio-dentistico-demo/", title: "Studio Dentistico Demo" }
      ];
      await sendMessengerButton(from, "Certo! Scegli un'opzione:", buttons);
      return;
    }

    // Flow LEAD GENERATION
    if ((assistantText === 'LEAD_GENERATION_START' || session) && !session?.leadCompleted) {
      await handleHubSpotQuestions(from, text);
      return;
    }

    // Conferma lead
    if (payload === "CONFIRM_LEAD" && session) {
      await sendMessengerMessage(from, "⏳ Invio in corso...");
      try {
        const response = await fetch('https://assistente-digitale.onrender.com/api/hubspot/create-contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            properties: session.data,
            conversationId: session.conversationId
          })
        });
        const result = await response.json();
        if (result.success) {
          session.leadCompleted = true; // il lead è completato, ma la sessione resta
          await sendMessengerMessage(from, "✅ Grazie! La tua richiesta è stata inviata con successo.");
        } else {
          await sendMessengerMessage(from, "❌ C'è stato un problema nell'invio della richiesta.");
        }
      } catch (err) {
        await sendMessengerMessage(from, `❌ Errore: ${err.message}`);
      }
      return;
    }

    // Annulla lead
    if (payload === "CANCEL_LEAD" && session) {
      await sendMessengerMessage(from, "❌ Invio annullato. I tuoi dati non sono stati salvati.");
      userSessions.delete(from);
      return;
    }

    // Risposta normale
    await sendMessengerMessage(from, assistantText);

  } catch (err) {
    console.error("Errore gestione messaggio entrante:", err);
    await sendMessengerMessage(from, "❌ Errore interno, riprova più tardi.");
  }
}

/* ==================== INTEGRAZIONE INSTAGRAM ==================== */

// Funzione gestione messaggio in arrivo Instagram con OpenAI
async function handleIncomingMessageInstagram(from, text, req, res) {
  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text }
    ];

    const assistantHtml = await getOpenAIResponse(messages);
    const assistantText = htmlToWhatsappText(assistantHtml) || "🤖 Risposta non disponibile";

    await sendInstagramMessage(from, assistantText);

  } catch (err) {
    console.error("❌ Errore gestione messaggio IG:", err);
    await sendInstagramMessage(from, "❌ Errore interno, riprova più tardi.");
  }
}

// Webhook solo Instagram
app.post("/webhookIgInstagram", async (req, res) => {
  try {
    const entry = req.body.entry || [];
    console.log("🔹 Webhook Instagram ricevuto:", JSON.stringify(req.body, null, 2));

    for (const e of entry) {
      const changes = e.changes || [];

      for (const change of changes) {
        const value = change.value;
        const messages = value.messages || [];

        if (messages.length > 0) {
          for (const msg of messages) {
            const from = msg.from;
            const text = msg.text?.body || msg.text;
            const type = msg.type || "unknown";

            console.log("📩 Messaggio Instagram ricevuto:");
            console.log("Mittente:", from);
            console.log("Tipo:", type);
            console.log("Testo:", text);

            if (from && text) {
              await sendInstagramMessage(from, `Ciao 👋 Sto rispondendo: ${text}`);
              // Se vuoi integrare OpenAI:
              await handleIncomingMessageInstagram(from, text, req, res);
            }
          }
        } else {
          console.log("⚠️ Nessun messaggio trovato in questo evento IG:", JSON.stringify(value, null, 2));
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Errore webhook Instagram:", err);
    res.sendStatus(500);
  }
});

/* ==================== INTEGRAZIONE WHATSAPP ==================== */
const SYSTEM_PROMPT_WHATSAPP = `
Sei l'Assistente Digitale, consulente AI professionale per PMI su WhatsApp Business.

=== INFORMAZIONI AZIENDA ===
Nome: Assistente Digitale
Descrizione: Soluzioni di automazione e ottimizzazione per PMI
Sviluppatore: DIGITAL&MORE - Soluzioni digitali innovative per PMI

=== SERVIZI DISPONIBILI ===
🟢 E-commerce: Demo LIVE https://assistente-digitale.it/e-commerce-demo/
🟢 Studio Dentistico: Demo LIVE https://assistente-digitale.it/studio-dentistico-demo/

=== PRICING ===
Preventivo personalizzato  
Consulenza gratuita: SÌ - SEMPRE GRATUITA  

=== PROCESSO IMPLEMENTAZIONE ===
1. Analisi iniziale (1 settimana)
2. Setup demo (2 settimane)
3. Personalizzazione (3 settimane)
4. Go-live (1 settimana)

=== FAQ ===
Q1: Quanto costa?  
R1: Dipende dalle funzionalità, offriamo preventivi personalizzati.

=== CONTATTI ===
Email: info@assistente-digitale.it  
Telefono: +39 0983 535253  
WhatsApp: https://wa.me/390983535253  
Sito Web: https://assistente-digitale.it  

=== LEAD GENERATION ===
STRATEGIA COMMERCIALE:
1. Fornisci SEMPRE informazioni sui NOSTRI servizi specifici
2. NON dare consigli generici su argomenti esterni
3. RIPORTA sempre la conversazione ai nostri servizi
4. CONCLUDI SEMPRE con l'invito alla consulenza sui nostri servizi

ESEMPI INVITI SPECIFICI:
- "Ti interessa una consulenza gratuita per vedere come il nostro Assistente Digitale può aiutare il tuo business?"
- "Vuoi che organizziamo una consulenza per implementare queste funzionalità sul tuo sito?"
- "Posso aiutarti con una consulenza gratuita per integrare questi sistemi nella tua azienda?"

QUANDO l'utente chiede di servizi esterni ai nostri:
RIPORTA la conversazione ai nostri servizi con esempi concreti.

SOLO quando l'utente conferma ESPLICITAMENTE l'interesse per la consulenza:
- Risposte affermative chiare dopo il tuo invito
- Conferme dirette come "Sì", "Mi interessa", "Procediamo"

ALLORA rispondi ESATTAMENTE: "LEAD_GENERATION_START"

IMPORTANTE: NON interpretare domande o richieste di info come conferme.
Lascia che sia l'utente a confermare esplicitamente.

QUANDO l'utente chiede demo:
- ALLORA rispondi esattamente DEMO_CONFIRMED
- OGNI volta che nella risposta inserisci le demo rispondi esattamente DEMO_CONFIRMED
+ NON fornire nessun altro testo oltre a DEMO_CONFIRMED
+ NON includere link, frasi aggiuntive o spiegazioni
+ Rispondi SOLO con la stringa DEMO_CONFIRMED

QUANDO l'utente conferma esplicitamente l'interesse:
- Rispondi invitando l'utente a prenotare una consulenza compilando il form di contatto
- Includi ESATTAMENTE il link: https://assistente-digitale.it/form-contatti

=== COMPORTAMENTO ===
Sii professionale, competente e orientato alla soluzione. Usa un tono cordiale ma non troppo informale.
Evidenzia sempre i benefici concreti e i risultati misurabili.
Non promettere mai risultati irrealistici.

=== FOCUS SERVIZI ===
IMPORTANTE: Rispondi SOLO sui nostri servizi e soluzioni.

SE l'utente chiede consigli su:
- Altri siti web, domini, progetti esterni
- Servizi che non offriamo
- Consulenze generiche non nostre
- Competitors o alternative

RISPONDI SEMPRE COSÌ:
"Grazie per la domanda! Io sono specializzato nelle soluzioni di automazione e ottimizzazione per PMI offerte da Assistente Digitale.

Per il tuo progetto, posso aiutarti con:
• Assistenti AI per siti web
• Automazione gestione clienti  
• Sistemi di prenotazione automatica
• Preventivi personalizzati
• Integrazioni HubSpot e CRM

Ti interessa una consulenza gratuita per vedere come possiamo supportare il tuo business specifico?"

NON dare mai consigli generici su SEO, design, hosting o servizi che non offriamo.
RIMANDA SEMPRE alle nostre soluzioni specifiche.
`;
const SYSTEM_PROMPT_FB = `
Sei l'Assistente Digitale, consulente AI professionale per PMI su WhatsApp Business.

=== INFORMAZIONI AZIENDA ===
Nome: Assistente Digitale
Descrizione: Soluzioni di automazione e ottimizzazione per PMI
Sviluppatore: DIGITAL&MORE - Soluzioni digitali innovative per PMI

=== SERVIZI DISPONIBILI ===
🟢 E-commerce: Demo LIVE https://assistente-digitale.it/e-commerce-demo/
🟢 Studio Dentistico: Demo LIVE https://assistente-digitale.it/studio-dentistico-demo/

=== PRICING ===
Preventivo personalizzato  
Consulenza gratuita: SÌ - SEMPRE GRATUITA  

=== PROCESSO IMPLEMENTAZIONE ===
1. Analisi iniziale (1 settimana)
2. Setup demo (2 settimane)
3. Personalizzazione (3 settimane)
4. Go-live (1 settimana)

=== FAQ ===
Q1: Quanto costa?  
R1: Dipende dalle funzionalità, offriamo preventivi personalizzati.

=== CONTATTI ===
Email: info@assistente-digitale.it  
Telefono: +39 0983 535253  
WhatsApp: https://wa.me/390983535253  
Sito Web: https://assistente-digitale.it  

=== LEAD GENERATION ===
STRATEGIA COMMERCIALE:
1. Fornisci SEMPRE informazioni sui NOSTRI servizi specifici
2. NON dare consigli generici su argomenti esterni
3. RIPORTA sempre la conversazione ai nostri servizi
4. CONCLUDI SEMPRE con l'invito alla consulenza sui nostri servizi

ESEMPI INVITI SPECIFICI:
- "Ti interessa una consulenza gratuita per vedere come il nostro Assistente Digitale può aiutare il tuo business?"
- "Vuoi che organizziamo una consulenza per implementare queste funzionalità sul tuo sito?"
- "Posso aiutarti con una consulenza gratuita per integrare questi sistemi nella tua azienda?"

QUANDO l'utente chiede di servizi esterni ai nostri:
RIPORTA la conversazione ai nostri servizi con esempi concreti.

SOLO quando l'utente conferma ESPLICITAMENTE l'interesse per la consulenza:
- Risposte affermative chiare dopo il tuo invito
- Conferme dirette come "Sì", "Mi interessa", "Procediamo"

ALLORA rispondi ESATTAMENTE: "LEAD_GENERATION_START"

IMPORTANTE: NON interpretare domande o richieste di info come conferme.
Lascia che sia l'utente a confermare esplicitamente.

QUANDO l'utente chiede demo:
- ALLORA rispondi esattamente DEMO_CONFIRMED
- OGNI volta che nella risposta inserisci le demo rispondi esattamente DEMO_CONFIRMED
+ NON fornire nessun altro testo oltre a DEMO_CONFIRMED
+ NON includere link, frasi aggiuntive o spiegazioni
+ Rispondi SOLO con la stringa DEMO_CONFIRMED

QUANDO l'utente conferma esplicitamente l'interesse:
- Rispondi invitando l'utente a prenotare una consulenza compilando il form di contatto
- Includi ESATTAMENTE il link: https://assistente-digitale.it/form-contatti

=== COMPORTAMENTO ===
Sii professionale, competente e orientato alla soluzione. Usa un tono cordiale ma non troppo informale.
Evidenzia sempre i benefici concreti e i risultati misurabili.
Non promettere mai risultati irrealistici.

=== FOCUS SERVIZI ===
IMPORTANTE: Rispondi SOLO sui nostri servizi e soluzioni.

SE l'utente chiede consigli su:
- Altri siti web, domini, progetti esterni
- Servizi che non offriamo
- Consulenze generiche non nostre
- Competitors o alternative

RISPONDI SEMPRE COSÌ:
"Grazie per la domanda! Io sono specializzato nelle soluzioni di automazione e ottimizzazione per PMI offerte da Assistente Digitale.

Per il tuo progetto, posso aiutarti con:
• Assistenti AI per siti web
• Automazione gestione clienti  
• Sistemi di prenotazione automatica
• Preventivi personalizzati
• Integrazioni HubSpot e CRM

Ti interessa una consulenza gratuita per vedere come possiamo supportare il tuo business specifico?"

NON dare mai consigli generici su SEO, design, hosting o servizi che non offriamo.
RIMANDA SEMPRE alle nostre soluzioni specifiche.
`;

const SYSTEM_PROMPT = `
Sei l'Assistente Digitale, consulente AI professionale per PMI.

=== INFORMAZIONI AZIENDA ===
Nome: Assistente Digitale
Descrizione: Soluzioni di automazione e ottimizzazione per PMI
Sviluppatore: DIGITAL&MORE - Soluzioni digitali innovative per PMI

=== SERVIZI DISPONIBILI ===
🟢 E-commerce: Demo LIVE https://assistente-digitale.it/e-commerce-demo/
🟢 Studio Dentistico: Demo LIVE https://assistente-digitale.it/studio-dentistico-demo/

=== PRICING ===
Preventivo personalizzato  
Consulenza gratuita: SÌ - SEMPRE GRATUITA  

=== PROCESSO IMPLEMENTAZIONE ===
1. Analisi iniziale (1 settimana)
2. Setup demo (2 settimane)
3. Personalizzazione (3 settimane)
4. Go-live (1 settimana)

=== FAQ ===
Q1: Quanto costa?  
R1: Dipende dalle funzionalità, offriamo preventivi personalizzati.

=== CONTATTI ===
Email: info@assistente-digitale.it  
Telefono: +39 0983 535253  
WhatsApp: https://wa.me/390983535253  
Sito Web: https://assistente-digitale.it  

=== LEAD GENERATION ===
- Fornisci SEMPRE info sui nostri servizi
- NON dare consigli generici
- Riporta sempre la conversazione ai nostri servizi
- Concludi con un invito alla consulenza

QUANDO l'utente conferma esplicitamente l'interesse: rispondi spingendo l'utente a prenotare una consulenza compilando il form di contatto
 su https://assistente-digitale.it/form-contatti, nella risposta includi ESATTAMENTE il link al form dei contatti

=== FORMATTAZIONE RISPOSTA ===
- Usa SOLO HTML
- Titoli con <h3>, liste con <ul>/<ol>, grassetto con <strong>, link con <a href="..." target="_blank" rel="noopener noreferrer">
- No markdown, no testo semplice

=== COMPORTAMENTO ===
- Professionale, competente, cordiale
- Focalizzato sui benefici concreti
- Non promettere mai risultati irrealistici
`;

function htmlToWhatsappText(html) {
  if (!html) return '';
  // conversione semplice e safe: titoli -> newline, <li> -> •, <br>/<p> -> newline, strip tag
  return html
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<li>\s*/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '') // rimuove gli altri tag
    .replace(/\n{3,}/g, '\n\n') // compatta newline
    .trim();
}
async function sendButtonMessage(to, bodyText, buttonTitle, url) {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const data = JSON.stringify({
    messaging_product: "whatsapp",
    to: to,
    type: "button",
    interactive: {
      type: "cta_url",
      body: {
        text: bodyText
      },
      action: {
        name: "cta_url",
        parameters: {
          display_text: buttonTitle,
          url: url
        }
      }
    }
  });

  try {
    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: data
    });

    const result = await response.json();
    console.log("Pulsante inviato:", result);
    return result;
  } catch (error) {
    console.error("Errore nell'invio del pulsante:", error);
    throw error;
  }
}
async function handleIncomingMessage(from, text, req, res) {
  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT_WHATSAPP },
      { role: "user", content: text }
    ];

    const assistantHtml = await getOpenAIResponse(messages);
    // Converti HTML → testo leggibile da WhatsApp
    const assistantText = htmlToWhatsappText(assistantHtml) || "🤖 Risposta non disponibile";
    await saveMessages(from, text, assistantText);
    // 🔹 Se AI ha confermato un lead
    if (assistantText === "LEAD_GENERATION_START") {
      const properties = {
        email: `${from}@wa-lead.temp`,
        telefono: from,
        message: text,
        source: "WhatsApp"
      };
      // Fingi una req/res per riusare il controller
      await hubespostController(
        { body: { properties, conversationId: req.body.conversationId } },
        { status: (code) => ({ json: (obj) => console.log('HubSpot res', code, obj) }) }
      );
      // if (assistantText === "DEMO_CONFIRMED") {
      //   await sendWhatsAppMessage(from, "Ecco il link alla demo E-commerce: https://assistente-digitale.it/e-commerce-demo/");
      // }

      await sendMessageSafe(from, "🎉 Perfetto! Ti ho registrato come lead. Ti contatteremo entro 24 ore.");
      return;
    }

    // 🔹 Flusso normale
    if (assistantText == 'DEMO_CONFIRMED') {

      await sendButtonMessage(
        from,
        "Ecco il link alla demo E-commerce:",
        "🚀 Vai alla Demo",
        "https://assistente-digitale.it/e-commerce-demo/"
      );
      // await sendButtonMessage(
      //   from,
      //   "Ecco il link alla demo Assistente studio dentistico:",
      //   "🚀 Vai alla Demo",
      //   "https://assistente-digitale.it/studio-dentistico-demo/"
      // );
    }
    else if (assistantText === "LEAD_GENERATION_START") {
      await sendButtonMessage(
        from,
        "Ecco il link per prenotare una consulenza grauita:",
        "🚀 Vai alla Demo",
        "https://assistente-digitale.it/register-hub-form/"
      );
    }
    else {

      await sendMessageSafe(from, assistantText);
    }

  } catch (err) {
    console.error("Errore gestione messaggio entrante:", err);
    await sendMessageSafe(from, "❌ Errore interno, riprova più tardi.");
  }
}
// deve coincidere con quello che hai messo su Meta
const VERIFY_TOKEN = "lamiaverificaclientIP";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "";
// 1️⃣ Verifica del webhook (GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificato ✅");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});
app.get("/webhookIg", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  console.log(VERIFY_TOKEN)
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificato ✅");
    res.status(200).send(challenge);
  } else {
    console.log("Verifica webhook fallita ❌", { mode, token, VERIFY_TOKEN });
    res.sendStatus(403);
  }
});
app.get("/webhookIgInstagram", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  console.log(VERIFY_TOKEN)
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificato ✅");
    res.status(200).send(challenge);
  } else {
    console.log("Verifica webhook fallita ❌", { mode, token, VERIFY_TOKEN });
    res.sendStatus(403);
  }
});

async function sendMessage(to, text) {
  const phoneNumberId = process.env.PHONE_NUMBER_ID; // ID del numero WhatsApp sandbox
  const token = process.env.WHATSAPP_TOKEN; // Token generato da Meta

  const res = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: text }
    })
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(JSON.stringify(errorData));
  }

  const data = await res.json();
  console.log("Messaggio inviato con successo:", data);
  return data;
}

const sandboxNumbers = [
  "15556387167", // numero sandbox di test
  "393516064089",
  "393408447827"
];

async function sendMessageSafe(to, text) {
  if (!sandboxNumbers.includes(to)) {
    console.warn(`⚠️ Numero non registrato in sandbox: ${to}`);
    return;
  }

  try {
    // Qui chiami la tua API WhatsApp
    // Esempio placeholder:
    console.log(`[API] Messaggio inviato a ${to}: "${text}"`);
    await sendMessage(to, text);
  } catch (err) {
    console.error("Errore invio messaggio:", err);
  }
}

app.post("/webhook", async (req, res) => {
  const entry = req.body.entry || [];

  for (const e of entry) {
    const changes = e.changes || [];

    for (const change of changes) {
      const value = change.value;

      // Legge i contatti
      const contacts = value.contacts || [];
      const contact = contacts[0];
      const contactName = contact?.profile?.name;
      const contactWaId = contact?.wa_id;

      // Legge i messaggi
      const messages = value.messages || [];
      const msg = messages[0];
      const from = msg?.from;
      const text = msg?.text?.body;
      const type = msg?.type;

      if (from && text) {
        console.log("📩 Messaggio ricevuto!");
        console.log("tipo:", type);
        console.log("Mittente (from):", from);
        console.log("Nome contatto:", contactName);
        console.log("wa_id:", contactWaId);
        console.log("Testo:", text);

        await sendMessageSafe(from, "Ciao 👋 Sto rispondendo!");
        // Gestisci il messaggio nel sistema (se necessario)
        await handleIncomingMessage(from, text, req, res);


      } else {
        console.log("Evento ricevuto ma senza messaggio:", JSON.stringify(msg, null, 2));
      }
    }
  }

  res.sendStatus(200);
});
app.post("/webhookIg", async (req, res) => {
  try {
    const entry = req.body.entry || [];
    console.log("🔹 Webhook Instagram ricevuto:", JSON.stringify(req.body, null, 2));

    for (const e of entry) {
      // 👉 Caso 1: MESSENGER (usa e.messaging)
      if (e.messaging) {
        for (const msg of e.messaging) {
          const from = msg.sender?.id;
          const text = msg.message?.text;

          console.log("📩 Messaggio Messenger ricevuto:");
          console.log("Mittente:", from);
          console.log("Testo:", text);
          const welcomeMessage = `Benvenuto!
              Sono il tuo consulente AI specializzato in soluzioni digitali per PMI.
              Cosa ti interessa?`;

          const welcomeButtons = [
            { type: "postback", title: "Come funziona", payload: "Come funziona il vostro servizio?" },
            { type: "postback", title: "Vedi Demo", payload: "Vorrei vedere le demo disponibili" },
            { type: "postback", title: "Consulenza Gratuita", payload: "Richiedo informazioni per una consulenza" },
            { type: "postback", title: "Settori", payload: "Che settori seguite?" },
            { type: "postback", title: "Prezzi", payload: "Quali sono i costi?" },
            { type: "postback", title: "Integrazioni", payload: "Integrazione con i miei strumenti" },
          ];
          if (from && text) {
            try {


              await handleIncomingMessageMessanger(from, text, req, res);


            } catch (err) {
              console.error("❌ Errore invio risposta Messenger:", err);
            }
          }
        }
      }


      // invio messaggio con pulsanti

      // 👉 Caso 2: INSTAGRAM (usa e.changes)
      if (e.changes) {
        for (const change of e.changes) {
          if (change.field === "messages") {
            const from = change.value?.from?.id;
            const text = change.value?.message;

            console.log("📩 Messaggio Instagram ricevuto:");
            console.log("Mittente:", from);
            console.log("Testo:", text);

            if (from && text) {
              try {
                await sendInstagramMessage(from, 'ciao sono instagram')
                await sendMessengerMessage(from, `Ciao 👋 Sto rispondendo da Instagram:`);

                await handleIncomingMessageMessanger(from, text, req, res);
              } catch (err) {
                console.error("❌ Errore invio risposta Instagram:", err);
              }
            }
          }
        }
      }
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("❌ Errore webhook Messenger:", err);
    res.sendStatus(500);
  }
});

app.post("/webhookIgInstagram", async (req, res) => {
  try {
    const entry = req.body.entry || [];
    console.log("🔹 Webhook Instagram ricevuto:", JSON.stringify(req.body, null, 2));

    for (const e of entry) {
      const messagingEvents = e.messaging || []; // NOT changes
      console.log(messagingEvents)
      for (const msg of messagingEvents) {
        const from = msg.sender?.id;
        const text = msg.message?.text;

        console.log("📩 Messaggio Instagram ricevuto:");
        console.log("Mittente:", from);
        console.log("Testo:", text);

        if (from && text) {
          try {
            await sendInstagramMessage(from, `Ciao 👋 Sto rispondendo (IG): ${text}`);
            // oppure integra OpenAI qui
          } catch (err) {
            console.error("❌ Errore invio risposta Instagram:", err);
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Errore webhook Instagram:", err);
    res.sendStatus(500);
  }
});

// Endpoint per analisi intento tramite backend
app.post('/api/ai/analyze-intent', analizeIntent
);

// // Endpoint principale per chat AI tramite backend
app.post('/api/ai/chat', chat);
app.post('/api/ai/saveChat', saveToDbChatController);
app.post('/api/ai/archive', archiveChat);
app.post('/api/ai/visualized', markAsVisualized);
app.post('/api/ai/deleteChat', deleteChat);
app.post('/api/ai/deleteChatArchived', DeleteChatContoller);
app.post('/api/ai/restorechat', restoreChat);

//ROTTE GESTIONE KNOWLEDGE
app.post('/api/ai/getknowledge', getKnowledge)
app.post('/api/ai/editContact', editContact)
// app.post('/api/ai/editCompanyData', editCompanyData)

//ROTTE DI GESTIONE DEGLI UTENTI
app.get('/api/usersGet', getUsersController);
app.post('/api/usersUpdate', updateUserDisplayName);
app.post('/api/createUsers', createUser);
/* ==================== HUBSPOT INTEGRATION ==================== */

// Endpoint per creare contatto HubSpot con AI Property Mapping
app.post('/api/hubspot/create-contact', hubespostController);



/* ==================== HEALTH CHECK E API ROUTES ==================== */

// Health check completo
app.get('/health', healtController);

// API Health check dettagliato
app.get('/api/health', dectailHealtController);

// API status endpoint
app.get('/api/status', statusController);

/* ==================== API REST ANDPOINT ==================== */
// app.get('/api/conversations', getChatController);
app.post('/api/conversations', getChatController);
app.get('/api/chatcount', getChatToThisMonth)
app.get('/api/archivedconversations', getArchiviedChatController);
app.get('/api/deleteChat', DeleteChatContoller)
app.put('/api/lead', setLeadGenerationTrue);
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
  console.log('Node version:', process.version);
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