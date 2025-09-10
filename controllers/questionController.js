// controllers/questionController.js
import Question from "../models/Question.js";

/**
 * Crea una nuova domanda
 */
export const createQuestion = async (req, res) => {
  try {
    const { nome, cognome, email, tipo, messaggio } = req.body;

    if (!nome || !email || !tipo || !messaggio) {
      return res.status(400).json({ success: false, message: "Dati incompleti" });
    }

    const newQuestion = new Question({
      paziente: { nome, cognome, email },
      tipo,
      messaggio
    });

    await newQuestion.save();

    res.status(201).json({
      success: true,
      message: "Domanda inviata con successo",
      data: newQuestion
    });
  } catch (error) {
    console.error("❌ Errore creazione domanda:", error);
    res.status(500).json({ success: false, message: "Errore server" });
  }
};

/**
 * Recupera tutte le domande
 */
export const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    res.json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Errore server" });
  }
};

/**
 * Recupera domanda per ID
 */
export const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: "Domanda non trovata" });
    }
    res.json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: "Errore server" });
  }
};

/**
 * Aggiorna stato/risposta
 */
export const updateQuestion = async (req, res) => {
  try {
    const { stato, risposta } = req.body;

    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { stato, risposta },
      { new: true }
    );

    if (!question) {
      return res.status(404).json({ success: false, message: "Domanda non trovata" });
    }

    res.json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: "Errore server" });
  }
};

/**
 * Cancella domanda
 */
export const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: "Domanda non trovata" });
    }
    res.json({ success: true, message: "Domanda eliminata" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Errore server" });
  }
};
