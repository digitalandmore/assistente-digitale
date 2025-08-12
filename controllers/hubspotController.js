const hubespostController = async (req, res) => {
    try {
        const { properties } = req.body;
        const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
        
        if (!HUBSPOT_API_KEY) {
            return res.status(500).json({ 
                success: false, 
                error: 'HubSpot API Key non configurata nel server' 
            });
        }
        
        if (!properties || !properties.email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email richiesta per creare contatto HubSpot' 
            });
        }
        
        console.log('🔄 Inizio creazione contatto HubSpot con AI mapping');
        
        // STEP 1: Ottieni proprietà HubSpot disponibili
        const availableProperties = await getHubSpotProperties();
        
        if (availableProperties.length === 0) {
            console.log('⚠️ Nessuna proprietà HubSpot caricata, uso mapping standard');
        }
        
        // STEP 2: Usa AI per mappare proprietà (se disponibile)
        let finalProperties;
        if (availableProperties.length > 0 && process.env.OPENAI_API_KEY) {
            try {
                finalProperties = await mapPropertiesWithAI(properties, availableProperties);
                console.log('✅ AI Property Mapping completato');
            } catch (aiError) {
                console.log('⚠️ AI Mapping fallito, uso fallback:', aiError.message);
                finalProperties = mapPropertiesFallback(properties);
            }
        } else {
            finalProperties = mapPropertiesFallback(properties);
        }
        
        console.log('🔄 Proprietà finali per HubSpot:', {
            email: finalProperties.email,
            company: finalProperties.company || 'N/A',
            firstname: finalProperties.firstname || 'N/A'
        });
        
        // STEP 3: Crea contatto in HubSpot
        const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: finalProperties
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            // Gestione contatto duplicato
            if (response.status === 409) {
                console.log('⚠️ Contatto già esistente, eseguo update...');
                
                const updateResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${finalProperties.email}?idProperty=email`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        properties: finalProperties
                    })
                });
                
                if (updateResponse.ok) {
                    const updateResult = await updateResponse.json();
                    console.log('✅ Contatto HubSpot aggiornato:', updateResult.id);
                    
                    return res.status(200).json({
                        success: true,
                        id: updateResult.id,
                        action: 'updated',
                        properties: updateResult.properties
                    });
                }
            }
            
            throw new Error(`HubSpot API Error ${response.status}: ${result.message || JSON.stringify(result)}`);
        }
        
        console.log('✅ Contatto HubSpot creato:', result.id);
        
        res.status(200).json({
            success: true,
            id: result.id,
            action: 'created',
            properties: result.properties
        });
        
    } catch (error) {
        console.error('❌ Errore HubSpot API:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

export default hubespostController;