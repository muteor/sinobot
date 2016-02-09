import fs from 'fs';
import Promise from 'bluebird';
import 'babel-polyfill';
import sqlite3 from 'sqlite3';

class Storage {
    constructor(path) {
        this.path = path;
    }

    init() {
        return new Promise(async (resolve, reject) => {
            // Make the data dir
            const mkdir = Promise.promisify(fs.mkdir);
            try {
                await mkdir(this.path);
            } catch(err) {
                if (err.code != 'EEXIST') {
                    reject(err);
                    return;
                }
            }
            try {
                const db = this._connection();
                db.exec('CREATE TABLE IF NOT EXISTS logs (' +
                    ' projectId TEXT NOT NULL,' +
                    ' date TEXT NOT NULL,' +
                    ' uploaded INTEGER NOT NULL,' +
                    ' uploadedUrl TEXT default "",' +
                    ' log TEXT default ""' +
                    ');' +
                    '' +
                    'CREATE TABLE IF NOT EXISTS projectStat (' +
                    ' projectId TEXT NOT NULL PRIMARY KEY,' +
                    ' running INTEGER default 0,' +
                    ' lastState INTEGER' +
                    ');' +
                    '', (err) => {
                    db.close();
                    /* istanbul ignore if */
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(true);
                });
            } catch(err) {
                /* istanbul ignore next */
                reject(err.message);
            }
        });
    }

    replace(table, values) {
        return new Promise((resolve, reject) => {
            const db = this._connection();
            const keys = Object.keys(values);
            const markers = Array(keys.length).fill('?');
            const cols = keys.join(',');
            const bind = Object.values(values);

            db.serialize(() => {
                let stmt = db.prepare("INSERT OR REPLACE INTO `" + table + "`(" + cols + ") VALUES(" + markers + ")");
                stmt.run(bind, (err) => {
                    /* istanbul ignore if */
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(stmt);
                });
                stmt.finalize();
                db.close();
            });
        });

    }

    getRows(sql, bind) {
        return new Promise((resolve, reject) => {
            const db = this._connection();
            let stmt = db.prepare(sql);
            stmt.all(bind, (err, rows) => {
                /* istanbul ignore if */
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
            stmt.finalize();
            db.close();
        });
    }

    getRow(sql, bind) {
        return new Promise((resolve, reject) => {
            const db = this._connection();
            let stmt = db.prepare(sql);
            stmt.get(bind, (err, row) => {
                /* istanbul ignore if */
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
            stmt.finalize();
            db.close();
        });
    }

    delete(table, where, bind) {
        return new Promise((resolve, reject) => {
            const db = this._connection();
            let stmt = db.prepare('DELETE FROM ' + table + ' WHERE ' + where);
            stmt.run(bind, (err) => {
                /* istanbul ignore if */
                if (err) {
                    reject(err);
                    return;
                }
                resolve(stmt);
            });
            stmt.finalize();
            db.close();
        });
    }

    _connection() {
        /* istanbul ignore next */
        const c = new sqlite3.Database(this.path + '/sino_data', (err) => {
            if (err) {
                throw new Error(err);
            }
        });
        // Fix locking issues :P
        c.exec('PRAGMA journal_mode = WAL;');
        return c;
    }
}
export default Storage;