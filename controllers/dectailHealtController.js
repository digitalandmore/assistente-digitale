const dectailHealtController = (req, res) => {
    const status = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
            openai: !!process.env.OPENAI_API_KEY,
            hubspot: !!process.env.HUBSPOT_API_KEY,
            ai_property_mapping: !!(process.env.OPENAI_API_KEY && process.env.HUBSPOT_API_KEY)
        },
        features: {
            hubspot_properties_cache: !!hubspotPropertiesCache,
            cached_properties_count: hubspotPropertiesCache?.length || 0,
            cache_age_minutes: cacheTimestamp ? Math.round((Date.now() - cacheTimestamp) / (1000 * 60)) : 0
        },
        backend_url: 'https://assistente-digitale.onrender.com',
        endpoints: {
            ai_chat: '/api/ai/chat',
            ai_intent: '/api/ai/analyze-intent',
            hubspot: '/api/hubspot/create-contact'
        }
    };
    
    res.status(200).json(status);
}

export default dectailHealtController;