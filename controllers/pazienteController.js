// controllers/pazienteController.js
import Paziente from "../models/paziente.js";

// ➡️ Inserisci un nuovo paziente
export const createPaziente = async (req, res) => {
  try {
    const pazienteData = req.body;

    const nuovoPaziente = new Paziente(pazienteData);
    await nuovoPaziente.save();

    res.status(201).json({
      success: true,
      message: "Paziente salvato con successo",
      data: nuovoPaziente
    });
  } catch (error) {
    console.error("❌ Errore salvataggio paziente:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ➡️ Recupera tutti i pazienti
export const getPazienti = async (req, res) => {
  try {
    const pazienti = await Paziente.find().sort({ createdAt: -1 });
    res.json({ success: true, data: pazienti });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ➡️ Recupera un paziente singolo (per email o ID)
export const getPazienteByEmail = async (req, res) => {
  try {
    const paziente = await Paziente.findOne({ email: req.params.email });
    if (!paziente) {
      return res.status(404).json({ success: false, message: "Paziente non trovato" });
    }
    res.json({ success: true, data: paziente });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
