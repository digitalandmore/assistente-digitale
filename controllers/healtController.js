const healtController = (req, res) => {
    const status = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'Assistente Digitale',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        backend_url: 'https://assistente-digitale.onrender.com'
    };
    
    res.status(200).json(status);
}

export default healtController;