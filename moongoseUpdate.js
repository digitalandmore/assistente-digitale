// updateChatNumbers.mjs
import mongoose from "mongoose";
import StudioDentistico from "./models/StudioDentistico.js";

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
    const studio = new StudioDentistico({
      nome: "Studio Dentistico Sorriso Perfetto",
      descrizione: "Assistente AI per gestire prenotazioni e pazienti",
      tagline: "Il tuo sorriso sempre al centro",
      sito_web: "https://sorrisoperfetto.it",

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
      ],

      services: [
        "Igiene dentale",
        "Impianti dentali",
        "Estetica dentale",
        "Sbiancamento",
      ],

      contatti: {
        email_commerciale: "info@sorrisoperfetto.it",
        email_supporto: "support@sorrisoperfetto.it",
        telefono: "+39 02 1234567",
        whatsapp_business: "+39 345 6789012",
        orari_supporto: "Lun-Ven 9:00-18:00",
        sede: "Milano, Italia",
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
        capacita_integrazione: ["CRM", "Email Marketing", "Calendari"],
        sicurezza: "GDPR compliant",
        partnership: "Silver Partner Iubenda",
        uptime: "99.9%",
      },

      faq: [
        {
          domanda: "I pazienti possono prenotare online?",
          risposta: "Sì, l’assistente consente di scegliere giorno e ora disponibili.",
        },
      ],
    });

    await studio.save();
    console.log("🌱 Seed completato con successo!");
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Errore seed:", err);
    mongoose.connection.close();
  }
}

seed();
