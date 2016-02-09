import fs from 'fs';
import stripJsonComments from 'strip-json-comments';
import { ConfigurationError } from './errors';

class Config {
    constructor(path, loglevel) {
        this.logLevel = loglevel;
        this.read(path);
        this.parse();
    }

    read(path) {
        this.configFile = fs.readFileSync(path, { encoding: 'utf8' });
    }

    parse() {
        try {
            this.config = JSON.parse(stripJsonComments(this.configFile));
            this.validateConfig();
        } catch (err) {
            if (err instanceof SyntaxError) {
                throw new ConfigurationError('The configuration file contains invalid JSON');
            } else {
                throw err;
            }
        }
    }

    getPort() {
        return this.config.port;
    }

    getLogPath() {
        return this.config.logPath;
    }

    getProjects() {
        return this.config.projects;
    }

    getSlackApiToken() {
        return this.config.slackToken;
    }

    getStoragePath() {
        return this.config.storagePath;
    }

    getLogLevel() {
        return this.logLevel;
    }

    validateConfig() {
        if (!this.config.hasOwnProperty('projects')) {
            throw new ConfigurationError('Config must contain projects key');
        }
        if (!this.config.hasOwnProperty('port')) {
            throw new ConfigurationError('Config must contain port key');
        }
        if (!this.config.hasOwnProperty('logPath')) {
            throw new ConfigurationError('Config must contain logPath key');
        }
        if (!this.config.hasOwnProperty('slackToken')) {
            throw new ConfigurationError('Config must contain slackToken key');
        }
        if (!this.config.hasOwnProperty('storagePath')) {
            throw new ConfigurationError('Config must contain storagePath key');
        }
    }
}

export default Config