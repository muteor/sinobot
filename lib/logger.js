import winston from 'winston';

export class LoggerFactory {

    static factory(path, logLevel) {
        const levels = [ 'error', 'warn', 'info', 'verbose', 'debug', 'silly'];
        const level = levels[logLevel] || 'error';
        return new (winston.Logger)({
            transports: [
                new (winston.transports.Console)({level: level}),
                new (winston.transports.File)({filename: path, level: level})
            ]
        });
    }
}

export default LoggerFactory;