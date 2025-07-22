// ==================== ASSISTENTE DIGITALE - AI CHAT ENGINE ====================
// Chat 100% AI-driven con dati da assistente-digitale.json

/* ==================== CONFIGURAZIONE E VARIABILI GLOBALI ==================== */

let assistenteConfig = {};
let conversationHistory = [];
let isAiProcessing = false;
let debugMode = true;

// Stato lead generation
let leadGenState = {
    active: false,
    currentField: null,
    fieldIndex: 0,
    collectedData: {},
    requiredFields: [
        { key: 'nome_completo', label: 'Nome e Cognome', validation: 'fullName' },
        { key: 'email', label: 'Email aziendale', validation: 'email' },
        { key: 'telefono', label: 'Numero di telefono', validation: 'required' },
        { key: 'azienda', label: 'Nome della tua azienda', validation: 'required' },
        { key: 'qualifica', label: 'Il tuo ruolo in azienda', validation: 'required' },
        { key: 'settore', label: 'Settore di attività', validation: 'required' },
        { key: 'sito_web', label: 'Sito web aziendale', validation: 'optional' },
        { key: 'messaggio', label: 'Descrivi brevemente la tua esigenza', validation: 'required' }
    ]
};

// Configurazione OpenAI
const openAiConfig = {
    apiKey: null,
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    maxTokens: 1200,
    temperature: 0.8,
    systemPromptTemplate: null
};

/* ==================== SISTEMA DI DEBUG ==================== */

function debugLog(category, message, data = null) {
    if (!debugMode) return;
    const timestamp = new Date().toISOString().substr(11, 8);
    const styles = { INIT: '🚀', AI: '🤖', CONFIG: '⚙️', LEAD: '📋', ERROR: '❌', SUCCESS: '✅' };
    console.log(`${styles[category] || '🔍'} [${timestamp}] ${category}: ${message}`);
    if (data) console.log(data);
}

/* ==================== INIZIALIZZAZIONE ==================== */

async function initializeAssistente() {
    try {
        debugLog('INIT', 'Avvio Assistente Digitale AI Chat');
        
        await loadConfiguration();
        await loadEnvironmentVariables();
        await generateSystemPrompt();
        setupEventListeners();
        showWelcomeMessage();
        
        // Aggiungi controllo HubSpot
        setTimeout(checkHubSpotStatus, 2000);
        
        debugLog('SUCCESS', 'Assistente inizializzato con successo');
        
    } catch (error) {
        debugLog('ERROR', 'Errore inizializzazione', error);
        showErrorState();
    }
}

async function loadConfiguration() {
    const response = await fetch('./assistente-digitale.json');
    if (!response.ok) throw new Error(`Errore caricamento JSON: ${response.status}`);
    assistenteConfig = await response.json();
    debugLog('SUCCESS', 'Configurazione JSON caricata');
}

async function loadEnvironmentVariables() {
    try {
        // Prova server Express
        const configResponse = await fetch('/api/config');
        if (configResponse.ok) {
            const serverConfig = await configResponse.json();
            if (serverConfig.openai_api_key) {
                openAiConfig.apiKey = serverConfig.openai_api_key;
                debugLog('SUCCESS', 'OpenAI API Key caricata dal server');
                return;
            }
        }
    } catch (error) {
        debugLog('ERROR', 'Server non disponibile', error);
    }
    
    // Fallback variabili globali
    if (window.OPENAI_API_KEY) {
        openAiConfig.apiKey = window.OPENAI_API_KEY;
        debugLog('SUCCESS', 'API Key da variabile globale');
    } else {
        debugLog('ERROR', 'Nessuna API Key trovata');
    }
}

async function generateSystemPrompt() {
    const oggi = new Date().toLocaleDateString('it-IT');
    
    // Controllo di sicurezza per evitare l'errore "Cannot convert undefined or null to object"
    if (!assistenteConfig || typeof assistenteConfig !== 'object') {
        debugLog('ERROR', 'assistenteConfig non disponibile per generateSystemPrompt');
        throw new Error('Configurazione assistente non caricata');
    }
    
    const { 
        assistente, 
        settori_sviluppati = {}, 
        contatti = {}, 
        pricing = {}, 
        processo_implementazione = [], 
        faq = [] 
    } = assistenteConfig;
    
    // Controllo che assistente esista
    if (!assistente) {
        debugLog('ERROR', 'Sezione assistente mancante nella configurazione');
        throw new Error('Configurazione assistente incompleta');
    }
    
    openAiConfig.systemPromptTemplate = `
Sei l'${assistente.nome}, consulente AI professionale per PMI.

=== INFORMAZIONI AZIENDA ===
Data: ${oggi}
Nome: ${assistente.nome}
Descrizione: ${assistente.descrizione}
Sviluppatore: ${assistente.sviluppatore?.nome || 'DIGITAL&MORE'} - ${assistente.sviluppatore?.specializzazione || 'Soluzioni digitali innovative per PMI'}

=== SERVIZI CON DEMO LIVE DISPONIBILI ===
${Object.entries(settori_sviluppati)
    .filter(([key, servizio]) => servizio.status === 'Demo Disponibile')
    .map(([key, servizio]) => `
🟢 ${servizio.nome}:
- ${servizio.descrizione}  
- Demo LIVE: ${servizio.demo_url || 'N/A'}
- Funzionalità: ${servizio.funzionalita?.join(', ') || 'Non specificate'}
- Benefici: ${servizio.benefici?.join(', ') || 'Non specificati'}
`).join('')}

=== SERVIZI IN SVILUPPO (DEMO NON DISPONIBILI) ===
${Object.entries(settori_sviluppati)
    .filter(([key, servizio]) => servizio.status === 'In Sviluppo')
    .map(([key, servizio]) => `
🟡 ${servizio.nome}:
- ${servizio.descrizione}
- Settori target: ${servizio.settori_target?.join(', ') || 'Non specificati'}
- Funzionalità: ${servizio.funzionalita?.join(', ') || 'Non specificate'}
`).join('')}

=== PRICING E SERVIZI ===
${pricing.policy || 'Preventivo personalizzato'}
Consulenza gratuita: ${pricing.consulenza_gratuita ? 'SÌ - SEMPRE GRATUITA' : 'No'}
Trial disponibile: ${pricing.trial_disponibile || 'Non specificato'}

=== PROCESSO IMPLEMENTAZIONE ===
${processo_implementazione.length > 0 
    ? processo_implementazione.map((fase, i) => `${i+1}. ${fase.fase}: ${fase.descrizione} (${fase.durata})`).join('\n')
    : 'Processo personalizzato basato sulle esigenze'
}

=== FAQ COMPLETE ===
${faq.length > 0 
    ? faq.map((item, i) => `Q${i+1}: ${item.domanda}\nR${i+1}: ${item.risposta}`).join('\n\n')
    : 'FAQ in aggiornamento'
}

=== CONTATTI ===
Email: ${contatti.email_commerciale || 'info@assistente-digitale.it'}
Telefono: ${contatti.telefono || '+39 0983 535253'}
WhatsApp: ${contatti.whatsapp_business || '+39 0983 535253'}

=== LEAD GENERATION ===
Avvia raccolta dati SOLO quando l'utente chiede esplicitamente:
- "preventivo"
- "consulenza"  
- "interessato"
- "sono interessato"
- "richiedo"

Per tutto il resto, fornisci informazioni sui servizi.

=== REGOLE ASSOLUTE ===
1. USA SEMPRE HTML nelle risposte: <h3>, <h4>, <strong>, <ul><li>, <p>
2. Link demo: <a href="URL" target="_blank"><strong>Testo Link</strong></a>  
3. Dati utente evidenziati: <strong>nome@email.com</strong>
4. SOLO dati dal JSON - MAI inventare informazioni
5. Comunicazione professionale e concisa - MASSIMO 1 emoji per risposta
6. SEMPRE concludere con INVITO all'azione: "Se desideri una consulenza gratuita personalizzata, fammelo sapere!"
7. Tono aziendale serio, moderno e innovativo

IMPORTANTE: In OGNI risposta sui servizi, invita SEMPRE l'utente a richiedere una consulenza gratuita.

ESEMPI CORRETTI di chiusura risposte:
- "Vuoi scoprire come possiamo aiutare la tua azienda? Richiedi una consulenza gratuita!"
- "Per una valutazione personalizzata, organizziamo una consulenza gratuita - fammi sapere!"
- "Se ti interessa approfondire, posso organizzare una consulenza gratuita per te!"
`;

    debugLog('SUCCESS', 'System prompt professionale generato');
}


function setupEventListeners() {
    const sendButton = document.getElementById('sendButton');
    const userInput = document.getElementById('userInput');
    
    sendButton?.addEventListener('click', handleUserMessage);
    userInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleUserMessage();
        }
    });
    
    // AGGIUNGERE: Event listener per chiusura mobile
    const closeButton = document.getElementById('closeChatBtn');
    closeButton?.addEventListener('click', function() {
        // Funzione per chiudere la chat su mobile
        if (typeof closeChatWidget === 'function') {
            closeChatWidget();
        } else if (typeof window.parent !== 'undefined') {
            // Se in iframe, comunica al parent
            window.parent.postMessage('closeChatWidget', '*');
        } else {
            // Fallback: nascondi container
            const container = document.querySelector('.chat-container');
            if (container) {
                container.style.display = 'none';
            }
        }
    });
    
    userInput?.focus();
    debugLog('SUCCESS', 'Event listeners configurati');
}

/* ==================== GESTIONE MESSAGGI AI ==================== */

async function handleUserMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput?.value?.trim();
    
    if (!message || isAiProcessing) return;
    
    addMessageToChat(message, 'user');
    userInput.value = '';
    
    if (leadGenState.active) {
        await handleLeadGenResponse(message);
    } else {
        await processWithOpenAI(message);
    }
}

let userContext = { nome: null, azienda: null, settore: null };

async function processWithOpenAI(userMessage) {
    if (isAiProcessing) return;
    
    isAiProcessing = true;
    showTypingIndicator();
    
    try {
        // PRIMA: Valuta l'intento con AI
        const intentAnalysis = await analyzeUserIntent(userMessage);
        
        if (intentAnalysis.wantsConsultation && !leadGenState.active) {
            // Se vuole consulenza, vai diretto al lead generation
            hideTypingIndicator();
            setTimeout(() => {
                startLeadGeneration();
            }, 500);
            return;
        }
        
        // Altrimenti risposta normale
        const aiResponse = await callOpenAI(userMessage);
        hideTypingIndicator();
        addMessageToChat(aiResponse, 'assistant');
        
    } catch (error) {
        debugLog('ERROR', 'Errore AI', error);
        hideTypingIndicator();
        addMessageToChat(`
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px;">
                <p><strong>Problema tecnico temporaneo</strong></p>
                <p>Riprova tra poco o ricarica la pagina per continuare la conversazione.</p>
            </div>
        `, 'assistant');
    } finally {
        isAiProcessing = false;
    }
}

// NUOVA FUNZIONE: Analizza intento utente
async function analyzeUserIntent(userMessage) {
    try {
        const intentPrompt = `
Analizza questo messaggio utente e determina se vuole richiedere una consulenza/preventivo:

MESSAGGIO: "${userMessage}"

ESEMPI DI RICHIESTE CONSULENZA:
- "vorrei un preventivo"
- "sono interessato"  
- "facciamo una consulenza"
- "posso avere più informazioni sui prezzi?"
- "mi serve aiuto per il mio business"
- "come posso procedere?"

ESEMPI DI SEMPLICI DOMANDE:
- "come funziona?"
- "che servizi offrite?"
- "avete demo?"
- "che settori seguite?"

Rispondi SOLO con:
CONSULENZA: se vuole procedere con richiesta/preventivo/consulenza
INFORMAZIONI: se vuole solo informazioni

Risposta:`;

        const response = await fetch(openAiConfig.endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: openAiConfig.model,
                messages: [{ role: 'user', content: intentPrompt }],
                max_tokens: 50,
                temperature: 0.1 // Molto deterministico
            })
        });

        if (!response.ok) {
            debugLog('WARN', 'Errore analisi intento, uso fallback');
            return { wantsConsultation: false };
        }

        const data = await response.json();
        const result = data.choices[0].message.content.trim().toUpperCase();
        
        const wantsConsultation = result.includes('CONSULENZA');
        
        debugLog('INTENT', `Messaggio: "${userMessage}" → Intento: ${result} → Consulenza: ${wantsConsultation}`);
        
        return { wantsConsultation };
        
    } catch (error) {
        debugLog('ERROR', 'Errore analisi intento', error);
        return { wantsConsultation: false }; // Fallback sicuro
    }
}


async function callOpenAI(userMessage) {
    if (!openAiConfig.apiKey) {
        throw new Error('API Key non configurata');
    }
    
    const messages = [
        { 
            role: 'system', 
            content: openAiConfig.systemPromptTemplate + `\n\nUSA SEMPRE HTML: <h3>, <strong>, <ul><li>`
        },
        ...conversationHistory.slice(-6).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content.replace(/<[^>]*>/g, '')
        })),
        { role: 'user', content: userMessage }
    ];
    
    const response = await fetch(openAiConfig.endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openAiConfig.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: openAiConfig.model,
            messages: messages,
            max_tokens: openAiConfig.maxTokens,
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        throw new Error(`OpenAI Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

/* ==================== LEAD GENERATION ==================== */

async function startLeadGeneration() {
    if (leadGenState.active) {
        debugLog('LEAD', 'Lead generation già attiva - IGNORATO');
        return;
    }
    
    leadGenState.active = true;
    leadGenState.fieldIndex = 0;
    leadGenState.collectedData = {};
    leadGenState.currentField = leadGenState.requiredFields[0];
    
    // CERCA EMAIL REALE NELLA CONVERSAZIONE (non "nome@email.com")
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const recentMessages = conversationHistory.slice(-10).map(msg => msg.content).join(' ');
    const foundEmails = recentMessages.match(emailPattern);
    
    if (foundEmails && foundEmails.length > 0) {
        // FILTRA email generiche/false
        const realEmail = foundEmails.find(email => 
            !email.includes('nome@email.com') && 
            !email.includes('mario@azienda.it') && 
            !email.includes('example.com') &&
            !email.includes('@test.') &&
            email.length > 5
        );
        
        if (realEmail) {
            leadGenState.collectedData.email = realEmail;
            debugLog('LEAD', '📧 Email REALE trovata:', realEmail);
        }
    }
    
    debugLog('LEAD', 'AVVIO Lead generation - Campo 1:', leadGenState.currentField.label);
    
    // Messaggio PROFESSIONALE senza emoji
    addMessageToChat(`
        <div style="background: linear-gradient(135deg, #f8fafc, #e2e8f0); border: 2px solid #3b82f6; border-radius: 12px; padding: 25px; margin: 15px 0;">
            <h4 style="color: #1e40af; margin-top: 0;">Richiesta Consulenza Gratuita</h4>
            <p>Per organizzare una <strong>consulenza personalizzata gratuita</strong> e fornirti una proposta su misura, raccogliamo alcune informazioni essenziali.</p>
            ${leadGenState.collectedData.email ? 
                `<div style="background: #dbeafe; padding: 12px; border-radius: 8px; font-size: 14px; margin: 15px 0;">
                    <strong>Email già disponibile:</strong> ${leadGenState.collectedData.email}
                </div>` : ''
            }
            <p style="margin-bottom: 0;">Iniziamo con il tuo <strong style="color: #dc2626;">${leadGenState.currentField.label}</strong>:</p>
        </div>
    `, 'assistant');
}

async function handleLeadGenResponse(userMessage) {
    if (!leadGenState.active) {
        debugLog('LEAD', 'Lead generation NON attiva - ignorato');
        return;
    }
    
    const currentField = leadGenState.currentField;
    const validation = validateLeadField(currentField, userMessage);
    
    debugLog('LEAD', `Campo ${currentField.key} (${leadGenState.fieldIndex + 1}/${leadGenState.requiredFields.length}):`, {
        input: userMessage,
        valid: validation.valid,
        reason: validation.reason || 'OK'
    });
    
    if (!validation.valid) {
        addMessageToChat(`
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h4 style="color: #856404; margin-top: 0;">⚠️ ${validation.reason}</h4>
                <p>Inserisci il tuo <strong style="color: #dc2626;">${currentField.label}</strong> corretto.</p>
                <p><em>Esempio: ${getFieldExample(currentField)}</em></p>
            </div>
        `, 'assistant');
        return;
    }
    
    // Salva dato
    leadGenState.collectedData[currentField.key] = userMessage.trim();
    leadGenState.fieldIndex++;
    
    debugLog('LEAD', `✅ Salvato ${currentField.key} = "${userMessage.trim()}"`);
    debugLog('LEAD', `Progresso: ${leadGenState.fieldIndex}/${leadGenState.requiredFields.length}`);
    
    // Controllo completamento
    if (leadGenState.fieldIndex >= leadGenState.requiredFields.length) {
        debugLog('LEAD', '🎯 TUTTI I CAMPI COMPLETATI - Mostro GDPR');
        await showGDPRAndRecap();
        return;
    }
    
    // Prossimo campo - SALTA SE GIÀ PRESENTE
    let nextField = leadGenState.requiredFields[leadGenState.fieldIndex];
    
    // Se abbiamo già questo dato (es. email dalla conversazione), salta
    while (nextField && leadGenState.collectedData[nextField.key] && leadGenState.fieldIndex < leadGenState.requiredFields.length) {
        debugLog('LEAD', `⏭️ Saltando ${nextField.key} - già presente: ${leadGenState.collectedData[nextField.key]}`);
        leadGenState.fieldIndex++;
        nextField = leadGenState.requiredFields[leadGenState.fieldIndex];
    }
    
    // Se finiti tutti i campi dopo i salti
    if (leadGenState.fieldIndex >= leadGenState.requiredFields.length) {
        debugLog('LEAD', '🎯 TUTTI I CAMPI COMPLETATI (dopo salti) - Mostro GDPR');
        await showGDPRAndRecap();
        return;
    }
    
    leadGenState.currentField = nextField;
    
    debugLog('LEAD', `➡️ Prossimo campo: ${nextField.key} (${nextField.label})`);
    
   
    // MESSAGGI PROFESSIONALI per ogni campo specifico
    setTimeout(() => {
        const userName = leadGenState.collectedData.nome_completo ? 
            leadGenState.collectedData.nome_completo.split(' ')[0] : '';
            
        let fieldMessage = '';
        let headerMessage = 'Informazione ricevuta';
        
        switch(nextField.key) {
            case 'email':
                fieldMessage = `Ho bisogno della tua <strong>${nextField.label}</strong> per inviarti la documentazione e organizzare la consulenza:`;
                break;
            case 'telefono':
                fieldMessage = `Per fissare la chiamata di consulenza, forniscimi il tuo <strong>${nextField.label}</strong>:`;
                break;
            case 'azienda':
                fieldMessage = `Dimmi il <strong>${nextField.label}</strong> per personalizzare la nostra proposta:`;
                break;
            case 'qualifica':
                fieldMessage = `Qual è <strong>${nextField.label}</strong>? Mi aiuta a comprendere meglio le tue esigenze:`;
                break;
            case 'settore':
                fieldMessage = `In quale <strong>${nextField.label}</strong> opera la tua azienda?`;
                break;
            case 'sito_web':
                fieldMessage = `Se hai un <strong>${nextField.label}</strong>, condividilo per un'analisi preliminare ${nextField.validation === 'optional' ? '(opzionale)' : ''}:`;
                break;
            case 'messaggio':
                fieldMessage = `<strong>${nextField.label}</strong> specifica così da prepararmi al meglio per la consulenza:`;
                break;
            default:
                fieldMessage = `Inserisci <strong>${nextField.label}</strong>:`;
        }
        
        addMessageToChat(`
            <div style="background: #f8fafc; padding: 18px; border-radius: 10px; border-left: 4px solid #3b82f6;">
                <h4 style="color: #1e40af; margin-top: 0;">${headerMessage}</h4>
                <p style="margin: 0;">${fieldMessage}</p>
            </div>
        `, 'assistant');
    }, 800);
 }

// Funzione helper per esempi
function getFieldExample(field) {
    switch (field.validation) {
        case 'fullName': return 'Mario Rossi';
        case 'email': return 'mario@azienda.it';
        default: return 'Inserisci il dato richiesto';
    }
}

function validateLeadField(field, value) {
    const trimmed = value.trim();
    
    // Risposte generiche da rifiutare
    const generic = ['si', 'ok', 'va bene', 'certo', 'perfetto', 'bene', 'grazie', 'ottimo'];
    if (generic.includes(trimmed.toLowerCase())) {
        return { valid: false, reason: `"${trimmed}" non è un valore valido per ${field.label}` };
    }
    
    // Evita risposte duplicate
    const alreadyUsed = Object.values(leadGenState.collectedData).some(existingValue => 
        existingValue && existingValue.toLowerCase() === trimmed.toLowerCase()
    );
    
    if (alreadyUsed) {
        return { valid: false, reason: 'Questo valore è già stato inserito' };
    }
    
    switch (field.validation) {
        case 'fullName':
            if (trimmed.length < 5) return { valid: false, reason: 'Nome troppo corto' };
            const nameParts = trimmed.split(' ').filter(p => p.length > 1);
            return nameParts.length >= 2 
                ? { valid: true } 
                : { valid: false, reason: 'Inserisci nome e cognome completi (es: Mario Rossi)' };
                
        case 'email':
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) 
                ? { valid: true } 
                : { valid: false, reason: 'Formato email non valido (es: mario@azienda.it)' };
                
        case 'optional':
            // Per campi opzionali, accetta anche "nessuno", "non ho", etc.
            if (trimmed.toLowerCase().match(/^(nessuno|non ho|niente|skip|salta)$/)) {
                return { valid: true, value: '' }; // Valore vuoto ma valido
            }
            return trimmed.length > 0 ? { valid: true } : { valid: true, value: '' };
            
        default:
            return trimmed.length >= 2 
                ? { valid: true } 
                : { valid: false, reason: `Campo ${field.label} troppo corto` };
    }
}

async function showGDPRAndRecap() {
    // Assicurati che lead gen sia ancora attivo
    if (!leadGenState.active) {
        debugLog('ERROR', 'showGDPRAndRecap chiamato ma lead gen non attivo');
        return;
    }
    
    const data = leadGenState.collectedData;
    
    debugLog('LEAD', '🎯 GDPR E RECAP - Dati raccolti:', data);
    
    // Pulisci dati
    const cleanData = {};
    Object.keys(data).forEach(key => {
        let value = data[key]?.toString().trim() || '';
        // Rimuovi formule introduttive comuni
        value = value.replace(/^(Si mi chiamo|Sono|Mi chiamo|il mio nome è|la mia email è)\s*/i, '').trim();
        cleanData[key] = value;
    });
    
    leadGenState.collectedData = cleanData;
    
    const uniqueId = Date.now();
    const recap = `
        <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); border: 2px solid #007bff; border-radius: 12px; padding: 25px; margin: 15px 0;">
            <h3 style="color: #007bff; margin-top: 0;">Perfetto <strong>${cleanData.nome_completo}</strong>!</h3>
            <p>Ecco il riepilogo delle informazioni raccolte:</p>
            
            <div style="background: #fff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h4 style="margin-top: 0;">👤 I tuoi dati:</h4>
                <ul style="margin: 10px 0; line-height: 1.6;">
                    <li><strong>Nome:</strong> ${cleanData.nome_completo}</li>
                    <li><strong>Email:</strong> ${cleanData.email}</li>
                    <li><strong>Telefono:</strong> ${cleanData.telefono}</li>
                    <li><strong>Azienda:</strong> ${cleanData.azienda}</li>
                    <li><strong>Ruolo:</strong> ${cleanData.qualifica}</li>
                    <li><strong>Settore:</strong> ${cleanData.settore}</li>
                    ${cleanData.sito_web ? `<li><strong>Sito web:</strong> ${cleanData.sito_web}</li>` : ''}
                </ul>
                
                <h4>💡 La tua richiesta:</h4>
                <p style="background: #f8f9fa; padding: 10px; border-radius: 6px; font-style: italic;"><strong>"${cleanData.messaggio}"</strong></p>
            </div>
        </div>
        
        <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h4 style="color: #856404; margin-top: 0;">🔒 Consenso Privacy</h4>
            <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer; line-height: 1.5;">
                <input type="checkbox" id="gdpr_${uniqueId}" style="margin-top: 4px; transform: scale(1.3);" required>
                <span style="font-size: 14px; color: #333;">
                    <strong>Acconsento al trattamento</strong> dei miei dati personali secondo la 
                    <a href="/privacy-policy.html" target="_blank" style="color: #0066cc; text-decoration: underline; font-weight: bold;">Privacy Policy</a> 
                    per ricevere informazioni sui servizi richiesti.
                </span>
            </label>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
            <button id="submit_${uniqueId}" onclick="completeLead('${uniqueId}')" disabled 
                    style="padding: 18px 35px; background: #ccc; color: #666; border: none; border-radius: 10px; font-size: 17px; font-weight: bold; cursor: not-allowed; transition: all 0.3s;">
                Invia Richiesta
            </button>
        </div>
    `;
    
    addMessageToChat(recap, 'assistant');
    
    // Setup GDPR checkbox
    setTimeout(() => {
        const checkbox = document.getElementById(`gdpr_${uniqueId}`);
        const button = document.getElementById(`submit_${uniqueId}`);
        
        if (checkbox && button) {
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    button.disabled = false;
                    button.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
                    button.style.color = 'white';
                    button.style.cursor = 'pointer';
                    button.style.transform = 'translateY(-2px)';
                    button.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.4)';
                } else {
                    button.disabled = true;
                    button.style.background = '#ccc';
                    button.style.color = '#666';
                    button.style.cursor = 'not-allowed';
                    button.style.transform = 'translateY(0)';
                    button.style.boxShadow = 'none';
                }
            });
        }
    }, 300);
}

window.completeLead = async function(uniqueId) {
    const checkbox = document.getElementById(`gdpr_${uniqueId}`);
    
    if (!checkbox?.checked) {
        addMessageToChat(`
            <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; border-radius: 8px;">
                <p><strong>⚠️ Consenso Privacy richiesto</strong></p>
                <p>Devi accettare la Privacy Policy per procedere con l'invio della richiesta.</p>
            </div>
        `, 'assistant');
        return;
    }
    
    debugLog('LEAD', 'Completamento lead con AI HubSpot mapping', leadGenState.collectedData);
    showTypingIndicator();
    
    const dataToSubmit = {...leadGenState.collectedData};
    
    try {
        // Aggiungi metadati
        dataToSubmit.gdpr_consent = true;
        dataToSubmit.gdpr_timestamp = new Date().toISOString();
        dataToSubmit.lead_source = 'assistente_digitale_chat';
        dataToSubmit.user_agent = navigator.userAgent;
        
        // Reset stato
        const completedData = {...dataToSubmit};
        leadGenState.active = false;
        leadGenState.collectedData = {};
        leadGenState.fieldIndex = 0;
        leadGenState.currentField = null;
        
        // Invii in parallelo con AI mapping
        const results = await Promise.allSettled([
            submitToFormspree(dataToSubmit),
            submitToHubSpotAPI(dataToSubmit)  // Ora usa AI mapping
        ]);
        
        const formspreeResult = results[0];
        const hubspotResult = results[1];
        
        let successCount = 0;
        let hubspotSuccess = false;
        
        if (formspreeResult.status === 'fulfilled') {
            debugLog('SUCCESS', 'Formspree submission successful');
            successCount++;
        }
        
        if (hubspotResult.status === 'fulfilled' && hubspotResult.value.success) {
            debugLog('SUCCESS', 'HubSpot AI mapping successful', hubspotResult.value.contactId);
            successCount++;
            hubspotSuccess = true;
        }
        
        if (successCount === 0) {
            throw new Error('Tutti i servizi di invio hanno fallito');
        }
        
        debugLog('INFO', `Lead inviato con successo a ${successCount}/2 servizi (con AI mapping)`);
        
        hideTypingIndicator();
        
        // Messaggio successo con indicazione AI
        const successMessage = `
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 25px; border-radius: 15px; text-align: center; margin: 20px 0;">
                <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
                <h3 style="margin: 0 0 10px 0;">Richiesta Ricevuta</h3>
                <p style="margin: 0; opacity: 0.9;">Ti contatteremo entro 24 ore</p>
                ${hubspotSuccess ? '<p style="font-size: 12px; opacity: 0.8; margin: 5px 0 0 0;">🤖 Processato con AI Property Mapping</p>' : ''}
            </div>
            
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h4 style="color: #374151; margin-top: 0;">Riepilogo</h4>
                <div style="display: grid; gap: 8px;">
                    <div><strong>Cliente:</strong> ${completedData.nome_completo}</div>
                    <div><strong>Azienda:</strong> ${completedData.azienda}</div>
                    <div><strong>Settore:</strong> ${completedData.settore}</div>
                    <div><strong>Richiesta:</strong> ${completedData.messaggio}</div>
                </div>
            </div>
            
            <div style="text-align: center; background: #f9fafb; padding: 15px; border-radius: 10px; margin-top: 20px;">
                <p style="margin: 0; color: #6b7280;">
                    <strong>Hai altre domande? Continua la conversazione!</strong> 💬
                </p>
            </div>
        `;
        addMessageToChat(successMessage, 'assistant');
        
    } catch (error) {
        debugLog('ERROR', 'Errore invio lead con AI mapping', error);
        hideTypingIndicator();
        // Messaggio errore standard...
    }
};

// NUOVA FUNZIONE: HubSpot API Contacts
async function submitToHubSpotAPI(data) {
    try {
        debugLog('HUBSPOT_API', 'Tentativo creazione contatto HubSpot con AI mapping', data);
        
        // Chiamata al server con i dati RAW - il server farà il mapping con AI
        const response = await fetch('/api/hubspot/create-contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: data  // Invia dati originali, il server farà il mapping
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`Server Error: ${response.status} - ${result.error || 'Unknown error'}`);
        }
        
        debugLog('SUCCESS', `HubSpot contatto ${result.action} con AI mapping:`, result.id);
        
        return { 
            success: true, 
            contactId: result.id,
            action: result.action,
            method: 'hubspot_api_ai'
        };
        
    } catch (error) {
        debugLog('ERROR', 'Errore HubSpot API con AI mapping', error.message);
        return { 
            success: false, 
            error: error.message,
            method: 'hubspot_api_ai'
        };
    }
}

/* ==================== INTEGRAZIONI ==================== */

async function submitToFormspree(data) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
    });
    
    // Determina il subject in base al tipo di richiesta
    const isUpdateRequest = data.messaggio && (
        data.messaggio.toLowerCase().includes('aggiornato') ||
        data.messaggio.toLowerCase().includes('notifica') ||
        data.messaggio.toLowerCase().includes('avvisa')
    );
    
    const subject = isUpdateRequest 
        ? 'Richiesta Aggiornamenti - Assistente Digitale'
        : 'Nuovo Lead da Assistente Digitale';
    
    formData.append('_subject', subject);
    formData.append('lead_source', 'Assistente Digitale Chat');
    formData.append('form_type', isUpdateRequest ? 'newsletter_signup' : 'lead_generation');
    
    const response = await fetch('https://formspree.io/f/xblyagbn', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) throw new Error(`Formspree Error: ${response.status}`);
    return response.json();
}

async function submitToHubSpot(data) {
    try {
        debugLog('HUBSPOT', 'Tentativo invio HubSpot', data);
        
        // Verifica se HubSpot è disponibile
        if (typeof window._hsq === 'undefined') {
            debugLog('WARN', 'HubSpot _hsq non disponibile');
            return { success: false, reason: 'HubSpot tracking code not loaded' };
        }
        
        // CONTROLLI DI SICUREZZA per dati mancanti
        const nomeCompleto = data.nome_completo || '';
        if (!nomeCompleto) {
            debugLog('ERROR', 'Nome completo mancante');
            return { success: false, reason: 'Nome completo mancante' };
        }
        
        const [nome, ...cognomeArray] = nomeCompleto.split(' ');
        const cognome = cognomeArray.join(' ') || '';
        
        // HubSpot identify con proprietà CORRETTE
        window._hsq.push(['identify', {
            email: data.email || '',
            firstname: nome || '',
            lastname: cognome,
            company: data.azienda || '',
            phone: data.telefono || '',
            website: data.sito_web || '',
            jobtitle: data.qualifica || '',
            industry: data.settore || '',
            // PROPRIETÀ PERSONALIZZATE HUBSPOT (aggiungi nel tuo HubSpot)
            lead_status: 'NEW',
            lead_source: 'Assistente Digitale Chat',
            original_source: 'Assistente Digitale Chat',
            lead_message: data.messaggio || '',
            gdpr_consent: data.gdpr_consent ? 'Yes' : 'No',
            gdpr_timestamp: data.gdpr_timestamp || '',
            user_agent: data.user_agent || ''
        }]);
        
        // HubSpot event tracking
        window._hsq.push(['trackEvent', {
            id: 'assistente_digitale_lead_generated',
            value: {
                lead_type: 'chat_lead',
                company: data.azienda || '',
                industry: data.settore || '',
                message: data.messaggio || '',
                timestamp: new Date().toISOString(),
                email: data.email || '',
                phone: data.telefono || ''
            }
        }]);
        
        debugLog('SUCCESS', 'HubSpot tracking inviato');
        return { success: true, method: 'tracking_code' };
        
    } catch (error) {
        debugLog('ERROR', 'Errore HubSpot tracking', error);
        return { success: false, reason: error.message };
    }
}


/* ==================== UI ==================== */


function addMessageToChat(message, sender) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    // MODIFICARE: Avatar structure per compatibilità CSS
    if (sender === 'assistant') {
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        const img = document.createElement('img');
        img.src = 'https://assistente-digitale.it/images/favicon.png';
        img.alt = 'AI';
        img.className = 'avatar-image';
        avatar.appendChild(img);
        
        messageDiv.appendChild(avatar);
    } else if (sender === 'user') {
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'U'; // O iniziale nome utente
        messageDiv.appendChild(avatar);
    }
    
    // MODIFICARE: Bubble structure per compatibilità CSS
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = sender === 'assistant' ? message : message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    bubbleDiv.appendChild(contentDiv);
    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    conversationHistory.push({ content: message, sender, timestamp: new Date() });
}


function showTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'block';
        
        // AGGIUNGERE: Smooth scroll
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            setTimeout(() => {
                chatMessages.scrollTo({
                    top: chatMessages.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }
}


function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.style.display = 'none';
}

async function showWelcomeMessage() {
    if (!openAiConfig.apiKey) {
        addMessageToChat(`
            <div style="background: #fef2f2; border-left: 3px solid #ef4444; padding: 16px; border-radius: 8px; margin: 12px 0;">
                <div style="color: #dc2626; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Sistema Temporaneamente Non Disponibile</div>
                <div style="color: #7f1d1d; font-size: 13px;">Riprova più tardi o contattaci direttamente.</div>
            </div>
        `, 'assistant');
        return;
    }
    
    const welcomeMessage = `
        <div style="margin: 16px 0;">
            <!-- Header compatto -->
            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 600; color: #1f2937; text-align: left;">Benvenuto!</h3>
                <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.4; text-align: left;">
                    Sono il tuo consulente AI specializzato in <strong>soluzioni digitali per PMI</strong>. 
                    Ti aiuto ad automatizzare processi, migliorare l'efficienza e aumentare le vendite.
                </p>
            </div>
            
            <!-- Quick actions compatte -->
            <div style="margin: 18px 0;">
                <h4 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 500; color: #374151; text-align: left;">Cosa ti interessa?</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start;">
                    <button onclick="sendQuickMessage('Come funziona il vostro servizio?')" 
                            style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; border: none; border-radius: 20px; padding: 8px 14px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); font-family: 'Inter', sans-serif;">
                        Come Funziona
                    </button>
                    
                    <button onclick="sendQuickMessage('Vorrei vedere le demo disponibili')" 
                            style="background: linear-gradient(135deg, #059669, #10b981); color: white; border: none; border-radius: 20px; padding: 8px 14px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2); font-family: 'Inter', sans-serif;">
                        Vedi Demo
                    </button>
                    
                    <button onclick="sendQuickMessage('Richiedo una consulenza gratuita')" 
                            style="background: linear-gradient(135deg, #dc2626, #ef4444); color: white; border: none; border-radius: 20px; padding: 8px 14px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2); font-family: 'Inter', sans-serif;">
                        Consulenza Gratuita
                    </button>
                    
                    <button onclick="sendQuickMessage('Che settori seguite?')" 
                            style="background: linear-gradient(135deg, #7c3aed, #8b5cf6); color: white; border: none; border-radius: 20px; padding: 8px 14px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(124, 58, 237, 0.2); font-family: 'Inter', sans-serif;">
                        Settori
                    </button>
                    
                    <button onclick="sendQuickMessage('Quali sono i costi?')" 
                            style="background: linear-gradient(135deg, #0891b2, #06b6d4); color: white; border: none; border-radius: 20px; padding: 8px 14px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(8, 145, 178, 0.2); font-family: 'Inter', sans-serif;">
                        Prezzi
                    </button>
                    
                    <button onclick="sendQuickMessage('Integrazione con i miei strumenti')" 
                            style="background: linear-gradient(135deg, #ea580c, #f97316); color: white; border: none; border-radius: 20px; padding: 8px 14px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(234, 88, 12, 0.2); font-family: 'Inter', sans-serif;">
                        Integrazioni
                    </button>
                </div>
            </div>
            
            <!-- CTA finale discreta -->
            <div style="margin: 20px 0 8px 0; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; text-align: left;">
                <p style="margin: 0; font-size: 13px; color: #64748b; font-style: italic;">
                    💬 Oppure scrivi direttamente la tua domanda qui sotto
                </p>
            </div>
        </div>
    `;
    
    addMessageToChat(welcomeMessage, 'assistant');
}

// Aggiorna anche la funzione addModernStyles per i pulsanti:

function addModernStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Welcome message button styles aggiornati */
        button[onclick*="sendQuickMessage"] {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            white-space: nowrap;
            flex-shrink: 0;
        }
        
        button[onclick*="sendQuickMessage"]:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }
        
        button[onclick*="sendQuickMessage"]:active {
            transform: translateY(0);
        }
        
        button[onclick*="sendQuickMessage"]:focus {
            outline: 2px solid rgba(37, 99, 235, 0.3);
            outline-offset: 1px;
        }
        
        /* Message structure compatibility */
        .message {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin-bottom: 16px;
            animation: fadeInUp 0.3s ease-out;
        }
        
        .message.user {
            flex-direction: row-reverse;
        }
        
        .message-avatar {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        
        .message.assistant .message-avatar {
            background: rgba(255, 255, 255, 0.9);
            padding: 4px;
        }
        
        .message-avatar .avatar-image {
            width: 20px;
            height: 20px;
            border-radius: 3px;
            object-fit: contain;
        }
        
        .message-bubble {
            max-width: 80%;
            padding: 12px 16px;
            border-radius: 16px;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .message.assistant .message-bubble {
            background: var(--white);
            border: 1px solid var(--border-light);
            box-shadow: var(--shadow-sm);
            color: var(--text-dark);
        }
        
        .message.user .message-bubble {
            background: linear-gradient(135deg, var(--primary-blue), var(--primary-dark));
            color: var(--white);
        }
        
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @media (max-width: 768px) {
            /* Pulsanti su mobile: stack verticale o wrap */
            div[style*="display: flex; flex-wrap: wrap"] {
                gap: 6px !important;
            }
            
            button[onclick*="sendQuickMessage"] {
                padding: 7px 12px !important;
                font-size: 11px !important;
                border-radius: 18px !important;
            }
            
            .message-bubble {
                max-width: 85%;
                font-size: 13px;
                padding: 10px 14px;
            }
            
            /* Header compatto su mobile */
            h3 {
                font-size: 16px !important;
            }
            
            h4 {
                font-size: 14px !important;
            }
        }
    `;
    document.head.appendChild(style);
}


// Funzione globale per i pulsanti
window.sendQuickMessage = function(message) {
    const userInput = document.getElementById('userInput');
    if (userInput) {
        userInput.value = message;
        handleUserMessage();
    }
};


function showErrorState() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="message assistant">
                <div class="message-avatar">
                    <img src="https://assistente-digitale.it/images/favicon.png" alt="AI" class="avatar-image">
                </div>
                <div class="message-bubble">
                    <div class="message-content">
                        <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 20px; border-radius: 8px;">
                            <h4 style="color: #721c24; margin-top: 0;">Errore di Caricamento</h4>
                            <p>Si è verificato un problema nel caricamento dell'assistente.</p>
                            
                            <div style="margin-top: 20px;">
                                <h4>Contattaci Direttamente:</h4>
                                <p>📧 <a href="mailto:info@assistente-digitale.it">info@assistente-digitale.it</a></p>
                                <p>📞 <a href="tel:+390983535253">+39 0983 535253</a></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}


function checkHubSpotStatus() {
    debugLog('HUBSPOT', 'Controllo stato HubSpot');
    
    if (typeof window._hsq !== 'undefined') {
        debugLog('SUCCESS', 'HubSpot _hsq disponibile', window._hsq.length);
        
        // Test tracking
        window._hsq.push(['trackPageView']);
        debugLog('INFO', 'Test pageview inviato');
    } else {
        debugLog('ERROR', 'HubSpot _hsq NON disponibile');
        debugLog('INFO', 'Script HubSpot caricato?', !!document.querySelector('script[src*="hubspot"]'));
    }
}

// Aggiungi alla fine del file prima di initializeAssistente:
function addModernStyles() {
    const style = document.createElement('style');
    style.textContent = `
        button[onclick*="sendQuickMessage"]:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.15) !important;
        }
        
        button[onclick*="sendQuickMessage"]:active {
            transform: translateY(0);
        }
        
        @media (max-width: 768px) {
            div[style*="grid-template-columns"] {
                grid-template-columns: 1fr !important;
                gap: 10px !important;
            }
        }
    `;
    document.head.appendChild(style);
}

// E aggiorna initializeAssistente:
async function initializeAssistente() {
    try {
        debugLog('INIT', 'Avvio Assistente Digitale AI Chat');
        
        await loadConfiguration();
        await loadEnvironmentVariables();
        await generateSystemPrompt();
        setupEventListeners();
        addModernStyles(); // AGGIUNGI QUESTA RIGA
        showWelcomeMessage();
        
        setTimeout(checkHubSpotStatus, 2000);
        
        debugLog('SUCCESS', 'Assistente inizializzato con successo');
        
    } catch (error) {
        debugLog('ERROR', 'Errore inizializzazione', error);
        showErrorState();
    }
}

/* ==================== INIZIALIZZAZIONE ==================== */

document.addEventListener('DOMContentLoaded', initializeAssistente);

// Utility globali
window.setOpenAIKey = (key) => { openAiConfig.apiKey = key; };
window.toggleDebug = () => { debugMode = !debugMode; };
