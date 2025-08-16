import  { Schema, model } from 'mongoose';

const messageSchema = new Schema({
  role: { type: String, enum: ["user", "assistant", "system"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const conversationSchema = new Schema({
  userId: { type: String, required: true },
  conversationId: { type: String, required: true },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  leadGenerated: { type: Boolean, default: false },
});

export default model("Conversation", conversationSchema);
