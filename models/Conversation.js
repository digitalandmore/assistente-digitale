import { Schema, model } from 'mongoose';

const messageSchema = new Schema({
  role: { type: String, enum: ["user", "assistant", "system"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const conversationSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  nome_completo: { type: String, required: false },
  email: { type: String, required: false },
  telefono: { type: String, required: false },
  azienda: { type: String, required: false },
  qualifica: { type: String, required: false },
  settore: { type: String, required: false },
  sito_web: { type: String, required: false },
  messaggio: { type: String, required: false },
  conversationId: { type: String, required: true, unique: true },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  leadGenerated: { type: Boolean, default: false },
  sourcedLeads: { type: String, required: false },
  visualized: { type: Boolean, default: false }
});

export default model("Conversation", conversationSchema);
