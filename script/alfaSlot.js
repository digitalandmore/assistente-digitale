
import Slot from "../models/slot.js";
import mongoose from "mongoose";

const MONGO_URI =
    "mongodb+srv://assistente-digitale:mq3qEAuzlfCxeVAP@cluster0.zkeifcp.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0";
const STUDIO_ID = '68cad2b2ec21f225dcfc5a6a'
const PRACTICE_ID = 14673;
const ARCHIVE_ID = 24323;
const API_KEY ='MERS93WSks2oSVZc5yfpeqDUPo5boFo7';

async function generaSlotBase(startDate, endDate) {
  const apertura = 9; // ora di inizio
  const chiusura = 18; // ora di fine
  const durata = 30; // minuti per slot

  let current = new Date(startDate);

  while (current <= endDate) {
    for (let h = apertura; h < chiusura; h++) {
      for (let m = 0; m < 60; m += durata) {
        const inizio = new Date(current);
        inizio.setHours(h, m, 0, 0);
        const fine = new Date(inizio.getTime() + durata * 60000);

        // evita duplicati grazie all'index (studio+inizio)
        await Slot.updateOne(
          { studio: STUDIO_ID, inizio },
          { studio: STUDIO_ID, inizio, fine, prenotato: false },
          { upsert: true }
        );
      }
    }
    current.setDate(current.getDate() + 1);
  }

  console.log("✅ Slot base generati");
}

async function syncSlotsWithAlfaDocs() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connesso a MongoDB");

    // range date (7 giorni da oggi)
    const today = new Date();
    const dateStart = today.toISOString().split("T")[0];
    const end = new Date(today);
    end.setDate(today.getDate() + 7);
    const dateEnd = end.toISOString().split("T")[0];

    // 🔹 Genera slot liberi nel DB
    await generaSlotBase(today, end);

    // 🔹 Fetch appuntamenti da AlfaDocs
    const url = `https://app.alfadocs.com/api/v1/practices/${PRACTICE_ID}/archives/${ARCHIVE_ID}/appointments?dateStart=${dateStart}&dateEnd=${dateEnd}`;

    const res = await fetch(url, {
      headers: { "X-Api-Key": API_KEY },
    });

    if (!res.ok) throw new Error(`Errore API AlfaDocs: ${res.status}`);
    const data = await res.json();

    if (!Array.isArray(data.data)) {
      console.log("⚠️ Nessun appuntamento trovato");
      return;
    }

    // 🔹 Marca occupati
    for (const appt of data.data) {
      const start = new Date(appt.date);
      const fine = new Date(start.getTime() + (appt.duration || 30) * 60000);

      const result = await Slot.updateMany(
        {
          studio: STUDIO_ID,
          inizio: { $lt: fine },
          fine: { $gt: start },
        },
        { $set: { prenotato: true } }
      );

      if (result.modifiedCount > 0) {
        console.log(`📌 Slot occupati aggiornati per ${start}`);
      } else {
        console.log(`⚠️ Nessuno slot da marcare per ${start}`);
      }
    }

    console.log("✅ Sincronizzazione completata");
    process.exit();
  } catch (err) {
    console.error("❌ Errore sync:", err);
    process.exit(1);
  }
}

syncSlotsWithAlfaDocs();