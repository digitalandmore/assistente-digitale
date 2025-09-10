// models/Question.js
import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  paziente: {
    nome: { type: String, required: true },
    cognome: { type: String, required: true },
    email: { type: String, required: true }
  },
  tipo: { 
    type: String, 
    enum: ["dottori", "segreteria"], 
    required: true 
  },
  messaggio: { type: String, required: true },
  stato: { 
    type: String, 
    enum: ["in_attesa", "letto", "risposto"], 
    default: "in_attesa" 
  },
  risposta: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Question = mongoose.model("Question", questionSchema);
export default Question;
