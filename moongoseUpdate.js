// updateChatNumbers.mjs
import mongoose from "mongoose";
import AssistenteDigitale from "./models/AssistenteDigitale.js"; // 👈 importa il tuo modello

// Connessione al DB
const MONGO_URI =
  "mongodb+srv://assistente-digitale:mq3qEAuzlfCxeVAP@cluster0.zkeifcp.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";

await mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

console.log("✅ Connesso a MongoDB");


async function seed() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connessione a MongoDB riuscita");

    // Non svuotiamo, aggiungiamo
    const assistente = new AssistenteDigitale({
      assistente: {
        nome: "Assistente Digitale Studio Dentistico",
        nome_azienda: "Studio Dentistico Sorriso Perfetto",
        descrizione: "Assistente AI per gestire prenotazioni e pazienti",
        tagline: "Il tuo sorriso sempre al centro",
        sito_web: "https://sorrisoperfetto.it",
        sviluppatore: {
          nome: "DIGITAL&MORE",
          specializzazione: "Soluzioni AI per studi dentistici",
          sito: "https://digitalandmore.it/",
          social: {
            facebook: "https://facebook.com/digitalandmoreIT",
            instagram: "https://instagram.com/digitalandmoreit",
            linkedin: "https://linkedin.com/company/digitalandmoreit",
          },
        },
        social: {
          linkedin: "https://linkedin.com/showcase/assistente-digitale",
          facebook: "https://facebook.com/assistente.digitale",
          instagram: "https://instagram.com/assistente.digitale",
        },
      },

      studio_dentistico: {
        openingHours: {
          lunedi: "9:00 - 18:00",
          martedi: "9:00 - 18:00",
          mercoledi: "9:00 - 18:00",
          giovedi: "9:00 - 18:00",
          venerdi: "9:00 - 17:00",
          sabato: "Chiuso",
          domenica: "Chiuso",
        },
        availableSlots: [
          "Lunedì 15-09 9:00 - 10:00",
          "Martedì 16-09 16:00 - 17:00",
          "Mercoledì 17-09 9:30 - 10:30",
          "Giovedì 18-09 17:00 - 18:00",
          "Venerdì 19-09 15:30 - 16:30",
        ],
        services: [
          "Igiene dentale",
          "Impianti dentali",
          "Estetica dentale",
          "Otturazioni",
          "Sbiancamento",
          "Ortodonzia",
          "Parodontologia",
          "Pedodonzia",
        ],
      },

      contatti: {
        email_commerciale: "info@sorrisoperfetto.it",
        email_supporto: "support@sorrisoperfetto.it",
        telefono: "+39 02 1234567",
        whatsapp_business: "+39 345 6789012",
        orari_supporto: "Lun-Ven 9:00-18:00",
        sede: "Milano, Italia",
        sviluppatore_contatti: {
          telefono: "+39 0983 535253",
          whatsapp_business: "+39 0983 535253",
        },
      },

      pricing: {
        policy: "Preventivo personalizzato",
        consulenza_gratuita: true,
        demo_gratuita: true,
        note: "Prezzi competitivi per studi dentistici",
      },

      tecnologia: {
        ai_engine: "GPT-4o",
        linguaggi_supportati: ["Italiano", "Inglese"],
        capacita_integrazione: [
          "CRM",
          "Email Marketing",
          "Calendari",
          "Social Media",
          "WhatsApp Business",
        ],
        sicurezza: "GDPR compliant",
        partnership: "Silver Partner Iubenda",
        uptime: "99.9%",
      },

      faq: [
        {
          domanda: "I pazienti possono prenotare online?",
          risposta:
            "Sì, l’assistente consente di scegliere giorno e ora disponibili senza chiamare lo studio.",
        },
        {
          domanda: "Come riducete i no-show?",
          risposta:
            "Con promemoria automatici via SMS/Email che ricordano l’appuntamento.",
        },
      ],
    });

    await assistente.save();

    console.log("🌱 Nuovo documento per studio dentistico aggiunto con successo!");
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Errore durante il seed:", err);
    mongoose.connection.close();
  }
}

seed();