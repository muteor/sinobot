import 'babel-polyfill';
import Command from './command';
import fs from 'fs';
import Promise from 'bluebird';
import pssh from 'promised-ssh';
import _ from 'underscore';

export class SSH extends Command {

    async execute(resource) {
        return new Promise(async (resolve, reject) => {
            this.project.logger.debug("Execute command against", resource);
            try {
                // Connect
                const opts = _.clone(this.config.ssh);
                opts.host = resource;
                if (opts.privateKey) {
                    const read = Promise.promisify(fs.readFile);
                    opts.privateKey = await read(opts.privateKey);
                    this.project.logger.debug("SSH read private key");
                }

                this.project.logger.debug("SSH Connecting");
                const connection = await pssh.connect(opts);
                this.project.logger.debug("SSH Connected");

                this.project.logger.debug("SSH Running Commands");
                const result = await connection.exec(this.config.commands);
                this.project.logger.debug("SSH Commands Done");
                resolve({
                    stdout: result[0],
                    stderr: result[1]
                });
                this.project.logger.debug("Ran command", this.config.commands);
            } catch(err) {
                if (!err.name) {
                    this.project.logger.error("Failed to SSH", err.message);
                }
                reject(err);
            }
        }).bind(this);
    }
}

export default SSH;