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
import fs from 'fs';
import sqlite3 from 'sqlite3';

chai.should();
chai.use(sinonChai);

describe('Storage', () => {

    const sandbox = sinon.sandbox.create({
        useFakeTimers: false,
        useFakeServer: false
    });

    beforeEach(() => {
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should init itself and create the tables', async () => {
        sandbox.stub(fs, 'mkdir', (d, cb) => {
            cb(null, true);
        });

        const runSpy = sandbox.spy();
        const fake = {
            exec: (sql, cb) => { runSpy(sql); cb(null); },
            close: sandbox.stub()
        };
        sandbox.stub(Storage.prototype, '_connection', () => { return fake; });

        const store = new Storage('');
        await store.init();

        fs.mkdir.should.be.called;
        runSpy.should.be.called;
        fake.close.should.be.called;
    });

    it('should still init if data dir already exists', async () => {
        sandbox.stub(fs, 'mkdir', (d, cb) => {
            const e = new Error();
            e.code = 'EEXIST';
            throw e;
        });

        const runSpy = sandbox.spy();
        const fake = {
            exec: (sql, cb) => { runSpy(sql); cb(null); },
            close: sandbox.stub()
        };
        sandbox.stub(Storage.prototype, '_connection', () => { return fake; });

        const store = new Storage('');
        await store.init();
    });

    it('should reject if data dir cannot be created', async () => {
        sandbox.stub(fs, 'mkdir', (d, cb) => {
            const e = new Error();
            throw e;
        });

        try {
            const store = new Storage('');
            await store.init();
        } catch (err) { /**/ }
    });

    it('should be able to replace a row', async () => {
        const runSpy = sandbox.spy();
        const stmtFake = {
            run: (bind, cb) => { runSpy(bind); cb(null); },
            finalize: sandbox.spy()
        };
        const serialSpy = sandbox.spy();
        const prepareSpy = sandbox.spy();
        const fake = {
            serialize: (cb) => { serialSpy(cb); cb(); },
            prepare: (sql) => { prepareSpy(sql); return stmtFake; },
            close: sandbox.stub()
        };
        sandbox.stub(Storage.prototype, '_connection', () => { return fake; });
        const store = new Storage('');
        await store.replace('foo', {bar: 'xyz', 'llama': 'red'});

        serialSpy.should.be.called;
        prepareSpy.should.be.called;
        fake.close.should.be.called;
        stmtFake.finalize.should.be.called;
        runSpy.should.be.called;
    });

    it('should be able to fetch all', async () => {
        const rows = [{fake: 'row'}, {fake: 'row2'}];
        const stmtFake = {
            all: (bind, cb) => { cb(null, rows); },
            finalize: sandbox.spy()
        };

        const prepareSpy = sandbox.spy();
        const fake = {
            prepare: (sql) => { prepareSpy(sql); return stmtFake; },
            close: sandbox.stub()
        };
        sandbox.stub(Storage.prototype, '_connection', () => { return fake; });

        const store = new Storage('');
        const r = await store.getRows('SELECT * FROM blah WHERE x=?', [1]);

        chai.expect(r).to.equal(rows);
    });

    it('should be able to fetch single row', async () => {
        const row = {fake: 'row'};
        const stmtFake = {
            get: (bind, cb) => { cb(null, row); },
            finalize: sandbox.spy()
        };

        const prepareSpy = sandbox.spy();
        const fake = {
            prepare: (sql) => { prepareSpy(sql); return stmtFake; },
            close: sandbox.stub()
        };
        sandbox.stub(Storage.prototype, '_connection', () => { return fake; });

        const store = new Storage('');
        const r = await store.getRow('SELECT * FROM blah WHERE x=?', [1]);

        chai.expect(r).to.equal(row);
    });

    it('should be able to delete from a table', async () => {
        const stmtFake = {
            run: (bind, cb) => { cb(null, this); },
            finalize: sandbox.spy()
        };

        const prepareSpy = sandbox.spy();
        const fake = {
            prepare: (sql) => { prepareSpy(sql); return stmtFake; },
            close: sandbox.stub()
        };
        sandbox.stub(Storage.prototype, '_connection', () => { return fake; });

        const store = new Storage('');
        const r = await store.delete('foo', 'x=?',[1]);

    });

});