import Promise from 'bluebird';
import 'babel-polyfill';

class Log {
    constructor(projectId, storage) {
        this.projectId = projectId;
        this.storage = storage;
        this.date = (new Date).toISOString();
        this.uploaded = false;
        this.log = new Map();
    }

    getId() {
        return this.id;
    }

    getDate() {
        return this.date;
    }

    add(key, log) {
        this.log.set(key, log);
    }

    toString() {
        let string = "";
        for (let [key, value] of this.log) {
            string += key + "\n" + value + "\n";
        }
        return string;
    }

    toJson() {
        let log = {};
        for (let [key, value] of this.log) {
            log[key] = value;
        }
        return {
            projectId: this.projectId,
            date: this.date,
            rowid: this.id,
            uploaded: (this.uploaded || false),
            uploadedUrl: (this.uploadUrl || ''),
            log: log
        }
    }

    isUploaded() {
        return this.uploaded;
    }

    setUploaded(flag) {
        this.uploaded = flag;
    }

    setUploadUrl(url) {
        this.uploadUrl = url;
    }

    getUploadedUrl() {
        return this.uploadUrl;
    }

    store() {
        return new Promise(async (resolve, reject) => {
            try {
                const json = this.toJson();
                json.log = JSON.stringify(json.log);
                const save = await this.storage.replace('logs', json);
                this.id = save.lastID;
                resolve(true);
            } catch(err) {
                /* istanbul ignore next */
                reject(err);
            }
        });
    }

    static fetchAll(storage, projectId) {
        return new Promise(async (resolve, reject) => {
            try {
                const rows = await storage.getRows('SELECT rowid, * FROM logs WHERE projectId=?', [projectId]);
                const logs = new Map();
                for (let row of rows) {
                    logs.set(row.rowid, Log.restoreFromStored(row, storage, projectId));
                }
                return resolve(logs);
            } catch(err) {
                /* istanbul ignore next */
                reject(err);
            }
        });
    }

    static restoreFromStored(stored, storage, projectId) {
        const log = new Log(projectId, storage);
        log.projectId = stored.projectId;
        log.id = stored.rowid;
        log.date = stored.date;
        log.uploaded = stored.uploaded;
        log.uploadUrl = stored.uploadedUrl;
        const jsonLog = JSON.parse(stored.log);
        for (var key of Object.keys(jsonLog)) {
            log.add(key, jsonLog[key]);
        }
        return log;
    }

    static delete(storage, id) {
        return new Promise(async (resolve, reject) => {
            try {
                await storage.delete('logs', 'rowid=?', [id]);
                resolve(true);
            } catch(err) {
                /* istanbul ignore next */
                reject(err);
            }
        });
    }
}

export default Log;