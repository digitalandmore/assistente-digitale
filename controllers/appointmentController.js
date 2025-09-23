/**
 * Crea un nuovo appuntamento
 */
import Appointment from "../models/Appointment.js";
import Paziente from "../models/paziente.js";
import StudioDentistico from "../models/StudioDentistico.js";

export const createAppointment = async (req, res) => {
  try {
    const { nome, cognome, email, motivo, servizio, slotId, studioId } = req.body;

    if (!nome || !email || !motivo || !slotId || !studioId) {
      return res.status(400).json({ success: false, message: "Dati incompleti" });
    }

    // 1. Recupera o crea il paziente
    let paziente = await Paziente.findOne({ email });
    if (!paziente) {
      paziente = new Paziente({
        nome_completo: `${nome} ${cognome || ""}`.trim(),
        email,
        telefono: "",
        motivo_della_visita: motivo
      });
      await paziente.save();
    }

    // 2. Recupera lo studio
    const studio = await StudioDentistico.findById(studioId);
    if (!studio) {
      return res.status(404).json({ success: false, message: "Studio non trovato" });
    }

    // 3. Recupera slot dal backend (qui semplifico: potresti avere un modello Slot a parte)
    const slot = studio.availableSlots.find(s => String(s._id) === String(slotId));
    if (!slot) {
      return res.status(404).json({ success: false, message: "Slot non trovato" });
    }

    // 4. Crea appuntamento
    const newAppointment = new Appointment({
      studio: studio._id,
      paziente: paziente._id,
      data: slot.inizio,   // la data effettiva
      durata: 60,
      servizio,
      note: motivo,
      status: "prenotato",
      slot: slotId
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
