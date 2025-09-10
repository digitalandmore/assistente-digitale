// controllers/appointmentController.js
import Appointment from "../models/Appointment.js";

/**
 * Crea un nuovo appuntamento
 */
export const createAppointment = async (req, res) => {
  try {
    const { nome, cognome, email, motivo, servizio, slot } = req.body;

    if (!nome || !email || !motivo || !slot) {
      return res.status(400).json({ success: false, message: "Dati incompleti" });
    }

    const newAppointment = new Appointment({
      paziente: { nome, cognome, email },
      motivo,
      servizio,
      slot
    });

    await newAppointment.save();

    res.status(201).json({
      success: true,
      message: "Appuntamento creato con successo",
      data: newAppointment
    });
  } catch (error) {
    console.error("❌ Errore creazione appuntamento:", error);
    res.status(500).json({ success: false, message: "Errore server" });
  }
};

/**
 * Recupera tutti gli appuntamenti
 */
export const getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });
    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: "Errore server" });
  }
};

/**
 * Recupera un singolo appuntamento per ID
 */
export const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appuntamento non trovato" });
    }
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Errore server" });
  }
};

/**
 * Aggiorna lo stato dell’appuntamento
 */
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { stato } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { stato },
      { new: true }
    );
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appuntamento non trovato" });
    }
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: "Errore server" });
  }
};

/**
 * Cancella un appuntamento
 */
export const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appuntamento non trovato" });
    }
    res.json({ success: true, message: "Appuntamento eliminato" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Errore server" });
  }
};
