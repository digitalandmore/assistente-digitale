import StudioDentistico from "../models/StudioDentistico.js";

/**
 * GET studio dentale per nome
 */
export const getStudioDentistico = async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ error: "Il campo 'nome' è richiesto" });
    }

    const studio = await StudioDentistico.findOne({ nome });

    if (!studio) {
      return res.status(404).json({ error: "Studio dentistico non trovato" });
    }

    res.status(200).json(studio);
  } catch (err) {
    console.error("Errore in getStudioDentistico:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * Aggiorna contatti
 */
export const editContattiStudio = async (req, res) => {
  try {
    const { nome, contatti } = req.body;

    if (!nome || !contatti) {
      return res.status(400).json({ error: "Nome e contatti sono richiesti" });
    }

    const updated = await StudioDentistico.findOneAndUpdate(
      { nome },
      { $set: { contatti } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Studio dentistico non trovato" });
    }

    res.status(200).json(updated);
  } catch (err) {
    console.error("Errore in editContattiStudio:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * Aggiorna orari di apertura
 */
export const editOrariStudio = async (req, res) => {
  try {
    const { nome, openingHours } = req.body;

    if (!nome || !openingHours) {
      return res.status(400).json({ error: "Nome e orari di apertura sono richiesti" });
    }

    const updated = await StudioDentistico.findOneAndUpdate(
      { nome },
      { $set: { openingHours } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Studio dentistico non trovato" });
    }

    res.status(200).json(updated);
  } catch (err) {
    console.error("Errore in editOrariStudio:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * Aggiorna servizi
 */
export const editServiziStudio = async (req, res) => {
  try {
    const { nome, services } = req.body;

    if (!nome || !services) {
      return res.status(400).json({ error: "Nome e servizi sono richiesti" });
    }

    const updated = await StudioDentistico.findOneAndUpdate(
      { nome },
      { $set: { services } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Studio dentistico non trovato" });
    }

    res.status(200).json(updated);
  } catch (err) {
    console.error("Errore in editServiziStudio:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

/**
 * Aggiorna slot disponibili
 */
export const editSlotsStudio = async (req, res) => {
  try {
    const { nome, availableSlots } = req.body;

    if (!nome || !availableSlots) {
      return res.status(400).json({ error: "Nome e slot sono richiesti" });
    }

    const updated = await StudioDentistico.findOneAndUpdate(
      { nome },
      { $set: { availableSlots } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Studio dentistico non trovato" });
    }

    res.status(200).json(updated);
  } catch (err) {
    console.error("Errore in editSlotsStudio:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
};
