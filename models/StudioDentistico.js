import mongoose from "mongoose";

const { Schema, model } = mongoose;

const StudioDentisticoSchema = new Schema({
  nome: { type: String, required: true }, // es. "Studio Dentistico Sorriso Perfetto"
  descrizione: String,
  tagline: String,
  sito_web: String,

  openingHours: {
    lunedi: { type: String, default: "9:00 - 18:00" },
    martedi: { type: String, default: "9:00 - 18:00" },
    mercoledi: { type: String, default: "9:00 - 18:00" },
    giovedi: { type: String, default: "9:00 - 18:00" },
    venerdi: { type: String, default: "9:00 - 17:00" },
    sabato: { type: String, default: "Chiuso" },
    domenica: { type: String, default: "Chiuso" },
  },

  availableSlots: [String], // es. "Lunedì 15-09 9:00 - 10:00"

  services: [String], // es. ["Igiene dentale", "Impianti dentali"]

  contatti: {
    email_commerciale: String,
    email_supporto: String,
    telefono: String,
    whatsapp_business: String,
    orari_supporto: String, // "Lun-Ven 9:00-18:00"
    sede: String,
  },

  pricing: {
    policy: String,
    consulenza_gratuita: Boolean,
    demo_gratuita: Boolean,
    note: String,
  },

  tecnologia: {
    ai_engine: String,
    linguaggi_supportati: [String],
    capacita_integrazione: [String],
    sicurezza: String,
    partnership: String,
    uptime: String,
  },

  faq: [
    {
      domanda: String,
      risposta: String,
    },
  ],
}, { timestamps: true });

export default model("StudioDentistico", StudioDentisticoSchema);
