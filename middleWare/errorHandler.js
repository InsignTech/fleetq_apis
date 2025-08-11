const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || "An error occurred",
        code: statusCode || 400,
        errors: err.errors || "server error"
    });
};

export default errorHandler;