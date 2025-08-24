import  supabase  from "../services/supabaseService.js";
 export const getUsersController = async (req, res) => {
    try {
        const { data, error } = await supabase.auth.admin.listUsers();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};



export const updateUserDisplayName = async (req, res) => {
  try {
    const { id, displayName } = req.body;

    const { data, error } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: {
        display_name: displayName
      }
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error("Errore update display_name:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createUser = async (req, res) => {
  try {
    const { email, displayName, password } = req.body;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password, // obbligatorio
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  } catch (err) {
    console.error("Errore creazione utente:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

