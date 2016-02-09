export class ConfigurationError extends Error {
    constructor(message = 'Invalid configuration') {
        super(message);
        this.name = 'ConfigurationError';
    }
}

export class InternalError extends Error {
    constructor(errObj) {
        super(errObj.message);
        this.name = 'InternalError';
        this.errObj = errObj;
    }
}
