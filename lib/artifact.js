import 'babel-polyfill';
import Log from './log';

class Artifact {

    constructor(config, storage, project) {
        this.config = config;
        this.storage = storage;
        this.project = project;
    }

    getAll() {
        return new Promise(async (resolve) => {
            this.logs = await Log.fetchAll(this.storage, this.project.getId());
            resolve(this.logs);
        });
    }

    async rotate(logs) {
        let oldest;
        /*eslint no-unused-vars: 0 */
        for (let [key, log] of logs) {
            if (!oldest) {
                oldest = log;
                continue;
            }
            /* istanbul ignore else */
            if (log.getId() < oldest.getId()) {
                oldest = log;
            }
        }
        if (oldest) {
            await Log.delete(this.storage, oldest.getId());
        }
    }

    save(commandResult) {
        return new Promise(async (resolve, reject) => {
            const all = await this.getAll();
            if (all.size >= this.config.max) {
                this.rotate(all);
            }
            try {
                const log = new Log(this.project.getId(), this.storage);
                for (let key of Object.keys(commandResult)) {
                    log.add(key, commandResult[key]);
                }
                await log.store();
                resolve(true);
            } catch(err) {
                reject(err);
            }
        });
    }
}

export default Artifact;