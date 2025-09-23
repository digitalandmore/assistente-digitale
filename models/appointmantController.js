import Appointment from "../models/Appointment.js";
import StudioDentistico from "../models/StudioDentistico.js";

/**
 * Genera slot disponibili da openingHours dello studio
 * @param {String} studioId - _id dello studio
 * @param {Date} startDate - data di inizio range
 * @param {Date} endDate - data di fine range
 * @returns {Array} lista slot disponibili
 */
export async function generaSlotDisponibili(studioId, startDate, endDate) {
  const studio = await StudioDentistico.findById(studioId);
  if (!studio) throw new Error("Studio non trovato");

  // Recupera appuntamenti già prenotati nel range
  const appuntamenti = await Appointment.find({
    studio: studioId,
    data: { $gte: startDate, $lte: endDate },
    status: { $ne: "cancellato" }
  });

  // Indici rapidi per slot occupati
  const occupati = appuntamenti.map(app => app.data.getTime());

  const giorni = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];
  const slotsDisponibili = [];

  // Loop su ogni giorno del range
  let current = new Date(startDate);
  while (current <= endDate) {
    const giornoSettimana = giorni[current.getDay()];
    const orario = studio.openingHours[giornoSettimana];

    if (orario && orario.toLowerCase() !== "chiuso") {
      // es: "9:00 - 18:00"
      const [startStr, endStr] = orario.split(" - ");
      const [startH, startM] = startStr.split(":").map(Number);
      const [endH, endM] = endStr.split(":").map(Number);

      // Ora di inizio/fine
      const giornoInizio = new Date(current);
      giornoInizio.setHours(startH, startM, 0, 0);
      const giornoFine = new Date(current);
      giornoFine.setHours(endH, endM, 0, 0);

      // Genera slot da 1h
      let slot = new Date(giornoInizio);
      while (slot < giornoFine) {
        const slotTime = slot.getTime();

        if (!occupati.includes(slotTime)) {
          slotsDisponibili.push({
            inizio: new Date(slot),
            fine: new Date(slot.getTime() + 60 * 60000) // +1 ora
          });
        }
        slot = new Date(slot.getTime() + 60 * 60000);
      }
    }
    // giorno successivo
    current.setDate(current.getDate() + 1);
  }

  return slotsDisponibili;
}
