import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  paziente: {
    nome: { type: String, required: true },
    cognome: { type: String, required: true },
    email: { type: String, required: true }
  },
  motivo: { type: String, required: true },
  servizio: { type: String, default: "Visita Generale" },
  slot: { type: String, required: true }, // esempio: "Lunedì 9:00 - 10:00"
  stato: { 
    type: String, 
    enum: ["in_attesa", "confermato", "cancellato"], 
    default: "in_attesa" 
  },
  createdAt: { type: Date, default: Date.now }
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;