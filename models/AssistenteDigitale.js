import mongoose from "mongoose";

const { Schema, model } = mongoose;

const AssistenteSchema = new Schema({
  assistente: {
    nome: String,
    nome_azienda:String,
    descrizione: String,
    tagline: String,
    sito_web: String,
    sviluppatore: {
      nome: String,
      specializzazione: String,
      sito: String,
      social: {
        facebook: String,
        instagram: String,
        linkedin: String
      }
    },
    social: {
      linkedin: String,
      facebook: String,
      instagram: String
    }
  },

  come_funziona: {
    conversazioni_intelligenti: {
      titolo: String,
      descrizione: String,
      caratteristiche: [String]
    },
    prenotazioni_automatiche: {
      titolo: String,
      descrizione: String,
      caratteristiche: [String]
    },
    preventivi_personalizzati: {
      titolo: String,
      descrizione: String,
      caratteristiche: [String]
    },
    integrazioni_flessibili: {
      titolo: String,
      descrizione: String,
      caratteristiche: [String]
    },
    completamente_personalizzabile: {
      titolo: String,
      descrizione: String,
      caratteristiche: [String]
    },
    conformita_normativa: {
      titolo: String,
      descrizione: String,
      caratteristiche: [String],
      partner_info: String
    }
  },

  vantaggi_concreti: {
    risultati_immediati: {
      disponibilita: String,
      tempo_risposta: String,
      clienti_simultanei: String,
      conformita_normativa: String
    },
    benefici: {
      roi_immediato: {
        titolo: String,
        descrizione: String
      },
      automazione_completa: {
        titolo: String,
        descrizione: String
      },
      clienti_soddisfatti: {
        titolo: String,
        descrizione: String
      },
      scalabilita_automatica: {
        titolo: String,
        descrizione: String
      }
    }
  },

  settori_sviluppati: {
    ecommerce: {
      nome: String,
      status: String,
      descrizione: String,
      demo_url: String,
      funzionalita: [String],
      benefici: [String]
    },
    studio_dentistico: {
      nome: String,
      status: String,
      descrizione: String,
      demo_url: String,
      funzionalita: [String],
      benefici: [String]
    },
    impresa_servizi: {
      nome: String,
      status: String,
      descrizione: String,
      funzionalita: [String],
      settori_target: [String],
      notifiche_disponibili: Boolean
    },
    centro_estetico: {
      nome: String,
      status: String,
      descrizione: String,
      funzionalita: [String],
      settori_target: [String],
      notifiche_disponibili: Boolean
    },
    parrucchiere: {
      nome: String,
      status: String,
      descrizione: String,
      funzionalita: [String],
      settori_target: [String],
      notifiche_disponibili: Boolean
    },
    ristorante: {
      nome: String,
      status: String,
      descrizione: String,
      funzionalita: [String],
      settori_target: [String],
      notifiche_disponibili: Boolean
    }
  },

  demo_disponibili: {
    note: String,
    ecommerce: {
      url: String,
      descrizione: String,
      cta: String
    },
    studio_dentistico: {
      url: String,
      descrizione: String,
      cta: String
    }
  },

  integrazioni: {
    capacita_integrazione: String,
    piattaforme_supportate: [String],
    categorie: {
      crm_marketing: [String],
      ecommerce: [String],
      automazione: [String],
      comunicazione: [String],
      calendario: [String],
      gestione: [String],
      web_social: [String]
    },
    note: String
  },

  processo_implementazione: [
    {
      fase: String,
      durata: String,
      descrizione: String
    }
  ],

  contatti: {
    email_commerciale: String,
    email_supporto: String,
    telefono: String,
    whatsapp_business: String,
    orari_supporto: String,
    sede: String,
    sviluppatore_contatti: {
      telefono: String,
      whatsapp_business: String
    }
  },

  pricing: {
    policy: String,
    consulenza_gratuita: Boolean,
    demo_gratuita: Boolean,
    note: String
  },

  tecnologia: {
    ai_engine: String,
    linguaggi_supportati: [String],
    capacita_integrazione: [String],
    sicurezza: String,
    partnership: String,
    uptime: String
  },

  faq: [
    {
      domanda: String,
      risposta: String
    }
  ]
}, { timestamps: true });

export default model("AssistenteDigitale", AssistenteSchema);
