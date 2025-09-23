


// models/Appointment.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const appointmentSchema = new Schema({
  studio: {
    type: Schema.Types.ObjectId,
    ref: "StudioDentistico",
    required: true
  },
  paziente: {
    type: Schema.Types.ObjectId,
    ref: "Paziente",
    required: true
  },
  // giorno e ora esatti dell'appuntamento
  data: { type: Date, required: true },

  durata: { type: Number, default: 60 }, // durata in minuti (default 1 ora)

  servizio: { type: String, required: false }, // es. "Igiene dentale"

  // stato dell'appuntamento
  status: {
    type: String,
    enum: ["prenotato", "confermato", "cancellato", "completato"],
    default: "prenotato"
  },

  // eventuali note interne
  note: { type: String },

  // metadati
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Aggiorna sempre updatedAt
appointmentSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default model("Appointment", appointmentSchema);
