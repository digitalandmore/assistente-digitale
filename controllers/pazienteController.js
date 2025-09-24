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
// export const getPazienteByEmail = async (req, res) => {
//   try {
//     const paziente = await Paziente.findOne({ email: req.params.email });
//     if (!paziente) {
//       return res.status(404).json({ success: false, message: "Paziente non trovato" });
//     }
//     res.json({ success: true, data: paziente });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };
export const getPazienteByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email richiesta" });
    }

    const url = `https://app.alfadocs.com/api/v1/practices/${process.env.ALFADOCS_PRACTICE_ID}/archives/${process.env.ALFADOCS_ARCHIVE_ID}/patients?email=${encodeURIComponent(email)}`;

    const response = await fetch(url, {
      headers: {
        "X-Api-Key": process.env.ALFADOCS_KEY
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: `Errore API ${response.status}` });
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ success: false, message: "Paziente non trovato" });
    }

    res.json({ success: true, data: data.results[0] }); // ritorno il primo paziente trovato
  } catch (error) {
    console.error("Errore getPazienteByEmail:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};