export const getColors = async (req, res) => {
  try {
    const url = `${process.env.ALFADOCS_API_URL}/practices/${process.env.PRACTICE_ID}/archives/${process.env.ARCHIVE_ID}/colors`;

    const response = await fetch(url, {
      headers: {
        "X-Api-Key": process.env.ALFADOCS_KEY
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: data.error || "Errore API" });
    }

    res.json({ success: true, colors: data.data });
  } catch (error) {
    console.error("❌ Errore getColors:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
