/*eslint no-unused-vars: 0 */
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { createSpyObject, stubTdd, loadFixtureJson } from './helpers';
import Log from '../lib/log';
import 'babel-polyfill';
import Bot from 'botkit';
import Storage from '../lib/storage';

chai.should();
chai.use(sinonChai);

describe('Log', () => {

    const sandbox = sinon.sandbox.create({
        useFakeTimers: false,
        useFakeServer: false
    });

    beforeEach(() => {

    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should be initialized and allow setting of logs', () => {
        const log = new Log('tst', {});
        log.add('foo', 'bar');
        log.add('bar', 'foo');

        chai.expect(log.getDate()).to.be.a('string');
        chai.expect(log.isUploaded()).to.be.false;
        chai.expect(log.toString()).to.equal("foo\nbar\nbar\nfoo\n");
    });

    it('should be able to store the log', async () => {

        const storage = new Storage();
        const last = {lastID: 99};
        sandbox.stub(storage, 'replace', () => { return new Promise((r) => { r(last) }); });

        const log = new Log('test', storage);
        log.add('foo', 'bar');
        log.add('bar', 'foo');

        await log.store();

        storage.replace.should.have.been.called;
        chai.expect(log.id).to.equal(99);
    });

    it('should be able to fetch all project logs', async () => {
        const storage = new Storage();
        const rows = [{
            rowid: 2,
            projectId: 'tst',
            date: '2016-01-01 00:00:00:00',
            uploaded: 1,
            uploadedUrl: 'http://foo',
            log: '{"stdout": "foo", "stderr": "bar"}'
        }, {
            rowid: 3,
            projectId: 'tst',
            date: '2016-01-01 00:00:00:00',
            uploaded: 0,
            uploadedUrl: '',
            log: '{"stdout": "foo", "stderr": "bar"}'
        }];
        sandbox.stub(storage, 'getRows', () => { return new Promise((r) => { r(rows) }); });

        const logs = await Log.fetchAll(storage, 'tst');

        chai.expect(logs.size).to.equal(2);
        chai.expect(logs.get(2).getId()).to.equal(2);
        chai.expect(logs.get(2).getUploadedUrl()).to.equal('http://foo');
    });

    it('should be able to delete a log', async () => {
        const storage = new Storage();
        sandbox.stub(storage, 'delete', () => { return new Promise((r) => { r(true) }); });

        const done = await Log.delete(storage, 1);

        done.should.be.true;
    });
});