const globalErrorController = (err, req, res, next) => {
    console.error('Global Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
        timestamp: new Date().toISOString()
    });
}
export default globalErrorController;