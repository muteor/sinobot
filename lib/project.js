import 'babel-polyfill';
import Artifact from './artifact';
import {InternalError} from './errors';

const PROJECT_FAILED = 0;
const PROJECT_SUCCESS = 1;

class Project {

    constructor(config, logger, storage, bot) {
        this.config = config;
        this.logger = logger;
        this.storage = storage;
        this.bot = bot;
        this.running = false;
        this.lastState = null;
        this.parse();
    }

    parse() {
        this.id = this.config.id;
        this.name = this.config.name;
        this.command = this.factoryCommand();
        this.resource = this.factoryResource();
        this.notification = this.factoryNotification();
        this.artifact = new Artifact(this.config.artifact, this.storage, this);
    }

    getId() {
        return this.id;
    }

    getName() {
        return this.name;
    }

    getLogs() {
        return this.artifact.getAll();
    }

    markProjectStarted() {
        this.running = 1;
        this.storeState();
    }

    markProjectFinished(state) {
        this.running = 0;
        this.lastState = state;
        this.storeState();
    }

    storeState() {
        this.storage.replace('projectStat', {
            projectId: this.getId(),
            running: this.running,
            lastState: this.lastState
        });
    }

    isRunning() {
        return this.running;
    }

    getLastState() {
        return this.lastState;
    }

    async loadState() {
        const row = await this.storage.getRow('SELECT * FROM projectStat WHERE projectId=?', [this.getId()]);
        if (row) {
            this.running = row.running;
            this.lastState = row.lastState;
        }
    }

    trigger() {
        this.logger.debug('Triggered ' + this.getId());
        return new Promise(async (resolve, reject) => {
            let resource;
            let result;

            this.markProjectStarted();

            try {
                this.logger.debug('Getting resource');
                resource = await this.resource.get();
                this.logger.debug('Got resource', resource);
            } catch(err) {
                reject(err);
                this.artifact.save({error: err.message, type: "Resource"});
                this.notification.send(new InternalError(err));
                this.logger.error('Resource failed ' + err.message);
                this.markProjectFinished(PROJECT_FAILED);
                return;
            }

            try {
                this.logger.debug('Running Command', this.command.config);
                result = await this.command.execute(resource);
                this.logger.debug('Ran Command');
            } catch(err) {
                let parsedResult;
                try {
                    parsedResult = await this.runParsers({stdout: err.stdout, stderr: err.stderr});
                } catch(e) {
                    this.logger.error('Parser failed ' + e.message);
                }
                parsedResult.code = err.code;
                reject(err);
                this.artifact.save({error: (parsedResult || err.message), type: "Command"});
                this.notification.send(parsedResult || err);
                this.logger.error('Command failed ' + err.message);
                this.markProjectFinished(PROJECT_FAILED);
                return;
            } finally {
                this.resource.release(resource);
            }

            let parsedResult;
            try {
                this.logger.debug('Parsing result');
                parsedResult = await this.runParsers(result);
                this.logger.debug('Parsed result');
            } catch(err) {
                this.logger.error('Parser failed ' + err.message);
            }

            result = parsedResult || result;

            try {
                this.logger.debug('Saving artifact');
                await this.artifact.save(result);
                this.logger.debug('Artifact saved');
            } catch(err) {
                reject(err);
                this.notification.send(new InternalError(err));
                this.logger.error('Artifact failed ' + err.message);
                this.markProjectFinished(PROJECT_FAILED);
                return;
            }
            try {
                await this.notification.send(result);
            } catch (err) {
                /* istanbul ignore next */
                this.logger.error('Notification failed ' + err.message);
                /* istanbul ignore next */
                reject(err);
                this.markProjectFinished(PROJECT_FAILED);
            }
            this.markProjectFinished(PROJECT_SUCCESS);
            resolve(true);
        });
    }

    factoryCommand() {
        const Command = this._resolvePlugin(this.config.command.type, __dirname + "/command/");
        return new Command(this.config.command.config, this);
    }

    factoryResource() {
        const Resource = this._resolvePlugin(this.config.resource.type, __dirname + "/resource/");
        return new Resource(this.config.resource.config, this);
    }

    factoryNotification() {
        const Notification = this._resolvePlugin(this.config.notification.type, __dirname + "/notification/");
        return new Notification(this.config.notification.config, this);
    }

    runParsers(result) {
        return new Promise(async (resolve) => {
            if (this.config.result && this.config.result.parsers) {
                let currentResult = result;
                for (let parserName of this.config.result.parsers) {
                    let parserImp = this._resolvePlugin(parserName, __dirname + "/parsers/");
                    if (parserImp.prototype.parse) {
                        let parser = new parserImp();
                        currentResult = await parser.parse(currentResult);
                    }
                }
                result = currentResult;
            }
            resolve(result);
        });
    }

    _resolvePlugin(name, localPath) {
        let path;
        try {
            // First try and load local module
            path = require.resolve(localPath + name);
        } catch(err) { /*ignore*/ }

        if (!path) {
            path = require.resolve(name);
        }

        let dep = require(path);

        return dep.default || dep;
    }

    static factory(config, logger, storage, bot) {
        const p = new Project(config, logger, storage, bot);
        p.loadState();
        return p;
    }
}

export default Project;