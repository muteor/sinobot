/*eslint no-unused-vars: 0 */
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { createSpyObject, stubTdd, loadFixtureJson } from '../helpers';
import SSH from '../../lib/command/ssh';
import 'babel-polyfill';

chai.should();
chai.use(sinonChai);

const KEY_PATH = process.env.HOME + '/.ssh/id_rsa';
const PASSPHRASE = '';
const USER = '';
const HOST = '';

describe('SSH Integration', () => {

    it('should be able to connect to SSH and run commands', async () => {
        const conf = {
            commands: [
                'echo 1',
                'echo 2',
                'echo 3',
                '>&2 echo "error"'
            ],
            ssh: {
                privateKey: KEY_PATH,
                passphrase: PASSPHRASE,
                username: USER
            }
        };
        const project = {
            logger: { error: (err) => { console.log('Log error', err); } }
        };
        const ssh = new SSH(conf, project);
        let r = await ssh.execute(HOST);

        chai.expect(r.stdout).to.equal("1\n2\n3\n");
        chai.expect(r.stderr).to.equal("error\n");
    });

    it('should throw on failure', async () => {
        const conf = {
            commands: [
                'command-that-does-not-exist'
            ],
            ssh: {
                privateKey: KEY_PATH,
                passphrase: PASSPHRASE,
                username: USER
            }
        };
        const project = {
            logger: { error: (err) => { console.log('Log error', err); } }
        };
        const ssh = new SSH(conf, project);
        try {
            let r = await ssh.execute(HOST);
        } catch (err) {
            chai.expect(err.code).to.equal(127);
        }
    });
});