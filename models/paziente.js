// models/Paziente.js
import mongoose from "mongoose";

const pazienteSchema = new mongoose.Schema({
  nome_completo: { type: String, required: true },
  email: { type: String, required: true, unique: false },
  telefono: { type: String, required: true },
  data_di_nascita: { type: String, required: false },

  motivo_della_visita: { type: String, required: false },
  sintomi_principali: { type: String, required: false },
  trattamenti_effettuati: { type: String, required: false },

  scegli_un_orario: { type: String, required: false },
  convenzioni_assicurative: { type: String, required: false },
  come_ci_hai_conosciuto: { type: String, required: false },

  gdpr_consent: { type: Boolean, default: false },
  gdpr_timestamp: { type: Date },
  lead_source: { type: String },
  user_agent: { type: String },

  conversationId: { type: String, index: true }, // per collegarlo alla chat
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Paziente", pazienteSchema);
