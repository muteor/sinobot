/*eslint no-unused-vars: 0 */
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import Config from '../lib/config';

chai.should();
chai.use(sinonChai);

describe('Config', () => {

    it('should throw on invalid JSON', () => {
        try {
            new Config(process.cwd() + '/test/fixtures/bad-config.json');
        } catch(err) {
            err.should.be.a('error');
            err.name.should.equal('ConfigurationError');
        }
    });

    it('should require port', () => {
        try {
            new Config(process.cwd() + '/test/fixtures/config-missing-port.json');
        } catch(err) {
            err.message.should.contain('contain port');
        }
    });

    it('should require logPath', () => {
        try {
            new Config(process.cwd() + '/test/fixtures/config-missing-logpath.json');
        } catch(err) {
            err.message.should.contain('contain logPath');
        }
    });

    it('should require projects', () => {
        try {
            new Config(process.cwd() + '/test/fixtures/config-missing-projects.json');
        } catch(err) {
            err.message.should.contain('contain projects');
        }
    });

    it('should require slackToken', () => {
        try {
            new Config(process.cwd() + '/test/fixtures/config-missing-token.json');
        } catch(err) {
            err.message.should.contain('contain slackToken');
        }
    });

    it('should require storagePath', () => {
        try {
            new Config(process.cwd() + '/test/fixtures/config-missing-storage.json');
        } catch(err) {
            err.message.should.contain('contain storagePath');
        }
    });

    it('should provide config access when config is good', () => {
        const good = new Config(process.cwd() + '/test/fixtures/config-good.json');
        good.getPort().should.equal(9777);
        good.getSlackApiToken().should.equal('89sd7f98s7df98s7df');
        good.getLogPath().should.equal('/var/log/sinobot');
        good.getProjects().should.have.length(1);
        good.getStoragePath().should.equal('./data/storage.json');
    });

    it('should include log level', () => {
        const good = new Config(process.cwd() + '/test/fixtures/config-good.json', 5);
        good.getLogLevel().should.equal(5);
    });
});