/*eslint no-unused-vars: 0 */
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { createSpyObject, stubTdd, loadFixtureJson } from './helpers';
import Artifact from '../lib/artifact';
import 'babel-polyfill';
import Bot from 'botkit';
import Log from '../lib/log';
import Project from '../lib/project';
import Storage from '../lib/storage';

chai.should();
chai.use(sinonChai);

describe('Artifact', () => {

    const sandbox = sinon.sandbox.create({
        useFakeTimers: false,
        useFakeServer: false
    });

    beforeEach(() => {
        sandbox.stub(Project.prototype, 'getId', () => { 'tst' });
        sandbox.stub(Project.prototype, 'parse');
        sandbox.stub(Log.prototype, 'store');
        sandbox.stub(Log, 'fetchAll', () => { return new Promise((r) => {r(new Map())}); });
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should create a new log from the command result', async () => {
        const artifact = new Artifact({max: 10}, new Storage(), new Project());
        await artifact.save({stdout: "foo", stderr: "bar"});

        Log.prototype.store.should.be.called;
    });

    it('should reject the promise on error', async () => {
        Log.prototype.store.throws();
        try {
            const artifact = new Artifact({max: 10}, new Storage(), new Project());
            await artifact.save({stdout: "foo", stderr: "bar"});
        } catch(err) { /**/ }

        Log.prototype.store.should.be.called;
    });

    it('should be able to get the projects logs', async () => {
        const logs = new Map();
        logs.set(1, 'foo');
        Log.fetchAll.restore();
        sandbox.stub(Log, 'fetchAll', () => { return new Promise((r) => {r(logs)}); });
        const artifact = new Artifact({max: 10}, new Storage(), new Project());
        const logz = await artifact.getAll();

        chai.expect(logz).to.equal(logs);
    });

    it('should rotate logs if they are over max config', async () => {
        const stub = sandbox.stub(Log.prototype, 'getId');
        stub.onCall(0).returns(1);
        stub.onCall(1).returns(2);
        stub.onCall(2).returns(1);
        const logs = new Map();
        logs.set(1, new Log());
        logs.set(2, new Log());
        Log.fetchAll.restore();
        sandbox.stub(Log, 'fetchAll', () => { return new Promise((r) => {r(logs)}); });
        sandbox.stub(Log, 'delete', () => { return new Promise((r) => {r(true)}); });

        const artifact = new Artifact({max: 2}, new Storage(), new Project());
        await artifact.save({stdout: "foo", stderr: "bar"});

        Log.delete.should.be.calledWith(sinon.match.object, 1);

    });
});