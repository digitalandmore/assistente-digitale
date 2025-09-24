import mongoose from "mongoose";

const { Schema, model } = mongoose;

const slotSchema = new Schema({
  studio: { type: Schema.Types.ObjectId, ref: "StudioDentistico", required: true },
  inizio: { type: Date, required: true },
  fine: { type: Date, required: true },
  prenotato: { type: Boolean, default: false }, // se qualcuno lo ha prenotato
  createdAt: { type: Date, default: Date.now }
});

// Evita slot duplicati (per lo stesso studio + ora inizio)
slotSchema.index({ studio: 1, inizio: 1 }, { unique: true });

export default model("slot", slotSchema);