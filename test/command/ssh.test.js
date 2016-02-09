/*eslint no-unused-vars: 0 */
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { createSpyObject, stubTdd, loadFixtureJson } from '../helpers';
import SSH from '../../lib/command/ssh';
import pssh from 'promised-ssh';
import 'babel-polyfill';

chai.should();
chai.use(sinonChai);

describe('SSH Command', () => {

    const sandbox = sinon.sandbox.create({
        useFakeTimers: false,
        useFakeServer: false
    });

    beforeEach(() => {

    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should run the command on the given resource', async () => {

        // Stub the ssh connection
        pssh.setOfflineMode(true);
        pssh.setMockOptions({
            //failConnect: true,
            commands: {
                'echo 1': {
                    stdout: "1\n"
                }
            }
        });
        sandbox.stub(pssh, 'connect', () => { return pssh.connectMock({host: 'localhost'}); });
        SSH.__Rewire__('pssh', pssh);

        const conf = {
            commands: [
                'echo 1'
            ],
            ssh: {
                privateKey: __dirname +  '/../fixtures/fakesshkey',
                passphrase: 'qwertyissecure',
                username: 'root'
            }
        };
        const project = {
            logger: { error: (err) => {}, debug: (err) => {} }
        };
        const ssh = new SSH(conf, project);
        let r = await ssh.execute('127.0.0.1');

        chai.expect(r.stdout).to.equal("1\n");
        chai.expect(r.stderr).to.equal("");
    });

    it('should report ssh failures', async () => {
        // Stub the ssh connection
        pssh.setOfflineMode(true);
        pssh.setMockOptions({
            failConnect: true
        });
        sandbox.stub(pssh, 'connect', () => { return pssh.connectMock({host: 'localhost'}); });
        SSH.__Rewire__('pssh', pssh);

        const conf = {
            commands: [
                'echo 1'
            ],
            ssh: {
                privateKey: __dirname +  '/../fixtures/fakesshkey',
                passphrase: 'qwertyissecure',
                username: 'root'
            }
        };
        const project = {
            logger: { error: (err) => {}, debug: (err) => {} }
        };
        const ssh = new SSH(conf, project);
        try {
            let r = await ssh.execute('127.0.0.1');
        } catch(e) {
            chai.expect(e.message).to.equal("Unable to connect to undefined@undefined");
        }
    });
});