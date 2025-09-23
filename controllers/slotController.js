// controllers/slotController.js
import slot from "../models/slot.js";

export const salvaSlot = async (req, res) => {
  try {
    const { studioId, startDate, endDate } = req.body;

    if (!studioId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: "Parametri mancanti" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Genera slot disponibili
    const slots = await generaSlotDisponibili(studioId, start, end);

    const savedSlots = [];
    for (const s of slots) {
      try {
        const newSlot = await slot.findOneAndUpdate(
          { studio: studioId, inizio: s.inizio }, // chiave unica
          { studio: studioId, inizio: s.inizio, fine: s.fine },
          { upsert: true, new: true }
        );
        savedSlots.push(newSlot);
      } catch (err) {
        console.warn("Slot già presente:", s.inizio);
      }
    }

    res.json({ success: true, slots: savedSlots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
export const getProssimiSlot = async (req, res) => {
  try {
    const { studioId } = req.body;
    if (!studioId) {
      return res.status(400).json({ success: false, error: "studioId richiesto" });
    }

    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(now.getDate() + 7);

    // Recupera slot disponibili entro 7 giorni
    const slots = await slot.find({
      studio: studioId,
      prenotato: false,
      inizio: { $gte: now, $lte: sevenDaysLater }
    }).sort({ inizio: 1 }); // ordina per data

    // Filtra mattina (<13:00) e pomeriggio (>=13:00)
    const mattina = slots.filter(s => new Date(s.inizio).getHours() < 13);
    const pomeriggio = slots.filter(s => new Date(s.inizio).getHours() >= 13);

    // Prendi max 2 slot per fascia
    const result = {
      mattina: mattina.slice(0, 2),
      pomeriggio: pomeriggio.slice(0, 2)
    };

    res.json({ success: true, slots: result });
  } catch (err) {
    console.error("Errore getProssimiSlot:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
import StudioDentistico from "../models/StudioDentistico.js";

export const seedSlots = async (req, res) => {
  try {
    const { studioId } = req.body;
    const studio = await StudioDentistico.findById(studioId);
    if (!studio) {
      return res.status(404).json({ success: false, error: "Studio non trovato" });
    }

    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);

    const slots = [];

    for (let d = new Date(today); d <= sevenDaysLater; d.setDate(d.getDate() + 1)) {
      const weekday = d.toLocaleDateString("it-IT", { weekday: "long" }).toLowerCase();
      const hours = studio.openingHours[weekday]; // es. "9:00 - 18:00" o "Chiuso"
      if (!hours || hours.toLowerCase() === "chiuso") continue;

      const [startStr, endStr] = hours.split(" - ");
      const [startH, startM] = startStr.split(":").map(Number);
      const [endH, endM] = endStr.split(":").map(Number);

      const start = new Date(d);
      start.setHours(startH, startM, 0, 0);

      const end = new Date(d);
      end.setHours(endH, endM, 0, 0);

      // genera slot da 60 minuti
      let current = new Date(start);
      while (current < end) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current);
        slotEnd.setMinutes(slotEnd.getMinutes() + 60);

        if (slotEnd <= end) {
          slots.push({
            studio: studio._id,
            inizio: slotStart,
            fine: slotEnd,
            prenotato: false
          });
        }

        current.setMinutes(current.getMinutes() + 60);
      }
    }

    await Slot.insertMany(slots);

    res.json({ success: true, count: slots.length });
  } catch (err) {
    console.error("Errore seedSlots:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
