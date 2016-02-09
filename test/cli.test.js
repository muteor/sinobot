/*eslint no-unused-vars: 0 */
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import cli from '../lib/cli';
import Commander from 'commander';
import Config from '../lib/config';
import Bot from '../lib/bot';

chai.should();
chai.use(sinonChai);

describe('CLI', () => {

    const sandbox = sinon.sandbox.create({
        useFakeTimers: false,
        useFakeServer: false
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('should require config arg and display help when not found', () => {
        sandbox.stub(Commander, 'parse');
        const spy  = sandbox.spy(Commander, 'outputHelp');
        const args = [
            'node',
            'index.js'
        ];
        process.argv = args;

        sandbox.stub(process.stdout, 'write');
        cli();
        sandbox.restore();

        spy.should.have.been.called;
    });

    it('should accept path using --config arg', () => {
        const spy = sandbox.spy(Commander, 'parse');
        const args = [
            'node',
            'index.js',
            '--config',
            'test.json'
        ];
        process.argv = args;

        // Stub deps
        sandbox.stub(Config.prototype, 'read');
        sandbox.stub(Config.prototype, 'parse');
        sandbox.stub(Config.prototype, 'getLogPath');
        sandbox.stub(Bot.prototype, 'start');

        sandbox.stub(process.stdout, 'write');
        cli();
        sandbox.restore();

        spy.should.have.been.calledWith(args);
    });

});