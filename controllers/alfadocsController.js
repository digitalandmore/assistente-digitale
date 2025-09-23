export const getAlfaAppointments = async (req, res) => {
  try {
    // Recupera parametri dinamici dal frontend (mese/anno)
    const { dateStart, dateEnd } = req.query;

    // Fallback → mese corrente
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const start = dateStart || `${y}-${m}-01`;
    const end = dateEnd || `${y}-${m}-30`;

    const url = `${process.env.ALFADOCS_API_URL}/practices/${process.env.PRACTICE_ID}/archives/${process.env.ARCHIVE_ID}/appointments?dateStart=${start}&dateEnd=${end}`;

    const response = await fetch(url, {
      headers: {
        "X-Api-Key": process.env.ALFADOCS_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Errore chiamata API AlfaDocs" });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error("❌ Errore getAppointments:", err);
    return res.status(500).json({ error: "Errore interno server" });
  }
};
