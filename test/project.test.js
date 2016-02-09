/*eslint no-unused-vars: 0 */
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Project from '../lib/project';
import { createSpyObject, stubTdd, loadFixtureJson } from './helpers';
import Log from '../lib/log';
import fs from 'fs';
import Resource from '../lib/resource/resource';
import Command from '../lib/command/command';
import Notification from '../lib/notification/notification';
import Artifact from '../lib/artifact';
import Promise from 'bluebird';
import Storage from '../lib/storage';

chai.should();
chai.use(sinonChai);

const projectConf = loadFixtureJson(process.cwd() + '/test/fixtures/project-config.json');

describe('Project', () => {

    const sandbox = sinon.sandbox.create({
        useFakeTimers: false,
        useFakeServer: false
    });

    beforeEach(() => {

    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should factory the command module', () => {
        const spy = sandbox.spy();
        sandbox.stub(Project.prototype, '_resolvePlugin', () => {return spy;});

        const project = new Project(projectConf, {}, {});

        spy.should.be.calledWith(projectConf.command.config, project);
    });

    it('should factory the resource module', () => {
        const spy = sandbox.spy();
        sandbox.stub(Project.prototype, '_resolvePlugin', () => {return spy;});

        const project = new Project(projectConf, {}, {});

        spy.getCall(1).should.be.calledWith(projectConf.resource.config, project);
    });

    it('should factory the notification module', () => {
        const spy = sandbox.spy();
        sandbox.stub(Project.prototype, '_resolvePlugin', () => {return spy;});

        const project = new Project(projectConf, {}, {});

        spy.getCall(2).should.be.calledWith(projectConf.notification.config, project);
    });

    it('should provide access to id, name and logs', () => {
        sandbox.stub(Artifact.prototype, 'getAll', () => { return new Map(); });
        sandbox.stub(Project.prototype, '_resolvePlugin', () => { return () => {} });
        const project = new Project(projectConf, {}, {});
        project.getId().should.equal('test');
        project.getName().should.equal('Test Project');
        chai.expect(project.getLogs()).to.be.an.instanceof(Map);
    });

    it('should trigger - get resource - run command - save result - and notify', async () => {
        sandbox.stub(Project.prototype, 'parse');
        sandbox.stub(Project.prototype, 'storeState');
        sandbox.stub(Project.prototype, 'loadState');
        const project = new Project(projectConf, {}, {});

        project.logger = { error: (err) => {}, debug: (err) => {} };

        sandbox.stub(Resource.prototype, 'get', () => { return new Promise((resolve) => { resolve('192.168.0.1'); }); });
        sandbox.stub(Command.prototype, 'execute', () => { return new Promise((resolve) => { resolve({status: 0}); }); });
        sandbox.stub(Artifact.prototype, 'save', () => { return new Promise((resolve) => { resolve(true); }); });
        sandbox.stub(Notification.prototype, 'send', () => { return new Promise((resolve) => { resolve(true); }); });

        project.resource = new Resource();
        project.command = new Command();
        project.notification = new Notification();
        project.artifact = new Artifact();

        await project.trigger();

        Resource.prototype.get.should.be.called;
        Command.prototype.execute.should.be.called;
        Notification.prototype.send.should.be.called;
        Artifact.prototype.save.should.be.called;
    });

    it('should handle resource failure', async () => {
        sandbox.stub(Project.prototype, 'parse');
        sandbox.stub(Project.prototype, 'storeState');
        sandbox.stub(Project.prototype, 'loadState');
        const project = new Project(projectConf, {}, {});

        sandbox.stub(Resource.prototype, 'get');
        Resource.prototype.get.throws();

        sandbox.stub(Artifact.prototype, 'save', () => { return new Promise((resolve) => { resolve(true); }); });
        sandbox.stub(Notification.prototype, 'send', () => { return new Promise((resolve) => { resolve(true); }); });

        project.resource = new Resource();
        project.notification = new Notification();
        project.artifact = new Artifact();

        let fail = false;
        try {
            await project.trigger();
        } catch (e) {
            fail = true;
        }

        chai.assert(fail === true, 'should have handled error');
    });

    it('should handle command failure', async () => {
        sandbox.stub(Project.prototype, 'parse');
        sandbox.stub(Project.prototype, 'storeState');
        sandbox.stub(Project.prototype, 'loadState');
        const project = new Project(projectConf, {}, {});

        sandbox.stub(Resource.prototype, 'get', () => { return new Promise((resolve) => { resolve('192.168.0.1'); }); });
        sandbox.stub(Command.prototype, 'execute', () => { return new Promise((resolve, reject) => { reject(new Error()); }); });
        sandbox.stub(Artifact.prototype, 'save', () => { return new Promise((resolve) => { resolve(true); }); });
        sandbox.stub(Notification.prototype, 'send', () => { return new Promise((resolve) => { resolve(true); }); });

        project.resource = new Resource();
        project.command= new Command();
        project.notification = new Notification();
        project.artifact = new Artifact();

        let fail = false;
        try {
            await project.trigger();
        } catch (e) {
            fail = true;
        }

        chai.assert(fail === true, 'should have handled error');
    });

    it('should handle artifact failure', async () => {
        sandbox.stub(Project.prototype, 'parse');
        sandbox.stub(Project.prototype, 'storeState');
        sandbox.stub(Project.prototype, 'loadState');
        const project = new Project(projectConf, {}, {});

        sandbox.stub(Resource.prototype, 'get', () => { return new Promise((resolve) => { resolve('192.168.0.1'); }); });
        sandbox.stub(Command.prototype, 'execute', () => { return new Promise((resolve) => { resolve({status: 0}); }); });
        sandbox.stub(Artifact.prototype, 'save', () => { return new Promise((resolve, reject) => { reject(new Error()); }); });
        sandbox.stub(Notification.prototype, 'send', () => { return new Promise((resolve) => { resolve(true); }); });

        project.resource = new Resource();
        project.command= new Command();
        project.notification = new Notification();
        project.artifact = new Artifact();

        let fail = false;
        try {
            await project.trigger();
        } catch (e) {
            fail = true;
        }

        chai.assert(fail === true, 'should have handled error');
    });

    // Integration test really, will leave here for now...
    it('can load plugins both in local lib and external lib', () => {
        const path = __dirname + '/../node_modules/sinobot-test';
        try {
            fs.mkdirSync(path);
        } catch(e) { /**/ }
        fs.writeFileSync(path + '/index.js', 'var test = function() {}; exports.default = test;');

        // Local module
        let loaded = Project.prototype._resolvePlugin('ssh', fs.realpathSync(__dirname + '/../lib/command') + '/');
        chai.expect(loaded).to.be.a('function');

        // External
        loaded = Project.prototype._resolvePlugin('sinobot-test', fs.realpathSync(__dirname + '/../lib/command') + '/');
        chai.expect(loaded).to.be.a('function');
    });

    it('should be able to load and store its state', () => {
        const row = {
            projectId: "foo",
            running: 0,
            lastState: 0
        };
        sandbox.stub(Project.prototype, 'parse');
        sandbox.stub(Storage.prototype, 'getRow', () => { return new Promise((r) => { r(row); }); });
        sandbox.stub(Storage.prototype, 'replace', () => { return new Promise((r) => { r(true); }); });
        const project = new Project(projectConf, {}, new Storage());

        project.loadState();
        project.storeState();

        chai.expect(project.isRunning()).to.be.false;
        chai.expect(project.getLastState()).to.equal(null);

        Storage.prototype.getRow.should.be.called;
        Storage.prototype.replace.should.be.called;
    });
});