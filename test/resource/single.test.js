/*eslint no-unused-vars: 0 */
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { createSpyObject, stubTdd, loadFixtureJson } from '../helpers';
import 'babel-polyfill';
import Single from '../../lib/resource/single';

chai.should();
chai.use(sinonChai);

describe('Single Resource', () => {

    const sandbox = sinon.sandbox.create({
        useFakeTimers: false,
        useFakeServer: false
    });

    beforeEach(() => {

    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should return the configured resource', async () => {
        const r = new Single({resource: 'test'}, {});
        chai.expect(await r.get()).to.equal('test');
    });
});