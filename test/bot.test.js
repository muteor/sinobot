/*eslint no-unused-vars: 0 */
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import cli from '../lib/cli';
import Commander from 'commander';
import Config from '../lib/config';
import Project from '../lib/project';
import LoggerFactory from '../lib/logger';
import Bot from '../lib/bot';
import winston from 'winston';
import { createSpyObject, stubTdd, makeObjectFromDot, stubTddRestore } from './helpers';
import Log from '../lib/log';
import Storage from '../lib/storage';
import Promise from 'bluebird';

Promise.config({
    warnings: false
});

chai.should();
chai.use(sinonChai);

describe('Bot', () => {

    const sandbox = sinon.sandbox.create({
        useFakeTimers: false,
        useFakeServer: false
    });

    beforeEach(() => {
        sandbox.stub(Config.prototype, 'read');
        sandbox.stub(Config.prototype, 'parse');
        sandbox.stub(Config.prototype, 'getLogPath', () => { return '/tmp/sinolog'});
        sandbox.stub(Config.prototype, 'getProjects', () => { return [{id: 'myproject'}]});
        sandbox.stub(Config.prototype, 'getPort', () => { return 9777; });
        sandbox.stub(Config.prototype, 'getSlackApiToken', () => { return 1234567890; });
        sandbox.stub(Config.prototype, 'getStoragePath', () => { return './data'; });
        sandbox.stub(Bot.prototype, 'startTriggerServer');
        sandbox.stub(Bot.prototype, 'startSlackBot');
        sandbox.stub(Project.prototype, 'parse');
        sandbox.stub(Storage.prototype, 'init');
    });

    afterEach(() => {
        sandbox.restore();
        stubTddRestore();
    });

    it('should factory the logger', async () => {
        const spy = sandbox.spy(LoggerFactory, 'factory');
        const myBot = new Bot(new Config(''));
        await myBot.start();
        spy.should.be.calledWith('/tmp/sinolog');
    });

    it('should factory projects from config', async () => {
        const spy = sandbox.spy(Project, 'factory');
        const myBot = new Bot(new Config(''));
        await myBot.start();
        spy.should.be.called;
    });

    it('should should start the trigger webhook server', async () => {
        Bot.prototype.startTriggerServer.restore(); // Allow trigger

        // Spy on express...
        const listen = sandbox.spy();
        const get = sandbox.spy();
        const expressSpy = {
            listen: listen,
            get: get
        };

        // Override express dep
        Bot.__Rewire__('express', () => { return expressSpy; });

        // Stub projects
        sandbox.stub(Project.prototype, 'getId', () => { return 'myproject'; });
        const factory = sandbox.stub(Project, 'factory', () => { return new Project(); });

        // Start the bot!
        const myBot = new Bot(new Config(''));
        await myBot.start();

        listen.should.be.calledWith(9777);
        get.should.be.calledWith('/trigger/myproject', sinon.match.func);
    });

    it('should create the slackbot controller', async () => {
        Bot.prototype.startSlackBot.restore(); // Allow slack start

        const workerSpy = sandbox.spy();
        const hearsSpy = sandbox.spy();
        const fakeWorker = {
            startRTM: workerSpy
        };
        const fakeBotKit = {};
        fakeBotKit.spawn = () => { return fakeWorker; };
        fakeBotKit.hears = hearsSpy;

        const fakeBot = {
            slackbot: function() { return fakeBotKit; }
        };
        Bot.__Rewire__('Botkit', fakeBot);

        // Start the bot!
        const myBot = new Bot(new Config(''));
        await myBot.start();

        workerSpy.should.be.called;
        hearsSpy.should.be.called;
    });

    it('should be able to start a private convo', () => {
        const myBot = new Bot(new Config(''));

        const speaker = sandbox.spy();
        const convo = {};
        const bot = {startPrivateConversation: (message, cb) => { cb(null, convo); }};

        myBot.startPrivateConvo(speaker, bot, null);

        speaker.should.be.calledWith(convo, bot, null);
    });

    it('should respond to help command', () => {
        const myBot = new Bot(new Config(''));

        const spy = createSpyObject('sayFirst');
        myBot.botHelp(spy);

        spy.sayFirst.should.have.calledWith(sinon.match.object);
    });

    it('should respond to list projects command', () => {
        const myBot = new Bot(new Config(''));

        Project.prototype.parse.restore();
        const project = sinon.createStubInstance(Project);
        myBot.projects = new Map();
        myBot.projects.set('myproject', project);

        const spy = createSpyObject('sayFirst');
        myBot.botListProjects(spy);

        spy.sayFirst.should.have.calledWith(sinon.match.object);
    });

    it('should respond to project status command', () => {
        const myBot = new Bot(new Config(''));

        Project.prototype.parse.restore();
        const project = sinon.createStubInstance(Project);
        project.getId.restore();
        sandbox.stub(project, 'getId', () => { return 'myproject'; });
        myBot.projects = new Map();
        myBot.projects.set('myproject', project);

        const spy = createSpyObject('sayFirst');
        myBot.botProjectStatus(spy, {}, { match : [null, 'myproject'] });

        spy.sayFirst.should.have.calledWith(sinon.match.object);
    });

    it('should respond to project logs command', async () => {
        const myBot = new Bot(new Config(''));

        stubTdd(Log.prototype, 'getDate', () => { return '2015-01-01'; });
        stubTdd(Log.prototype, 'getId', () => { return parseInt(1, 36); });

        Project.prototype.parse.restore();
        const project = sinon.createStubInstance(Project);
        project.getId.restore();
        project.getLogs.restore();
        sandbox.stub(project, 'getId', () => { return 'myproject'; });
        sandbox.stub(project, 'getLogs', () => { return new Map().set(1, new Log()); });
        myBot.projects = new Map();
        myBot.projects.set('myproject', project);

        const spy = createSpyObject('sayFirst');
        await myBot.botProjectLogs(spy, {}, { match : [null, 'myproject'] });

        spy.sayFirst.should.have.calledWith(sinon.match.object);
    });

    it('should respond to project get log command and upload log to slack if not already uploaded', async () => {
        const myBot = new Bot(new Config(''));

        // Stub the log
        stubTdd(Log.prototype, 'getDate', () => { return '2015-01-01'; });
        stubTdd(Log.prototype, 'getId', () => { return (1).toString(36); });
        stubTdd(Log.prototype, 'isUploaded', () => { return false; });
        stubTdd(Log.prototype, 'toString', () => { return "I am a log\nSo I am" });
        stubTdd(Log.prototype, 'store', () => { return new Promise((resolve) => { resolve(true); }); });

        // Stub the slackbot upload api
        let slackBot = makeObjectFromDot('api.files');
        slackBot = makeObjectFromDot('storage.teams', slackBot);
        stubTdd(slackBot.api.files, 'upload', (opt, cb) => { cb(null, {ok: true, file: { permalink_public: 'http://fooo' }}); });

        // Stub project
        Project.prototype.parse.restore();
        const project = sinon.createStubInstance(Project);
        project.getId.restore();
        project.getLogs.restore();
        sandbox.stub(project, 'getId', () => { return 'myproject'; });
        sandbox.stub(project, 'getLogs', () => { return new Map().set(1, new Log()); });
        myBot.projects = new Map();
        myBot.projects.set('myproject', project);

        const spy = createSpyObject('sayFirst');
        await myBot.botProjectLog(spy, slackBot, { match : [null, 'myproject', 1] });

        Log.prototype.getId.should.be.called;
        Log.prototype.isUploaded.should.be.called;
        Log.prototype.toString.should.be.called;

    });

    it('should respond to project get log command and return available log if already uploaded', async () => {
        const myBot = new Bot(new Config(''));

        // Stub the log
        stubTdd(Log.prototype, 'getDate', () => { return '2015-01-01'; });
        stubTdd(Log.prototype, 'getId', () => { return parseInt(1, 36); });
        stubTdd(Log.prototype, 'isUploaded', () => { return true; });
        stubTdd(Log.prototype, 'getUploadedUrl', () => { return "http://fooo" });

        // Stub project
        Project.prototype.parse.restore();
        const project = sinon.createStubInstance(Project);
        project.getId.restore();
        project.getLogs.restore();
        sandbox.stub(project, 'getId', () => { return 'myproject'; });
        sandbox.stub(project, 'getLogs', () => { return new Map().set(1, new Log()); });
        myBot.projects = new Map();
        myBot.projects.set('myproject', project);

        const spy = createSpyObject('sayFirst');
        await myBot.botProjectLog(spy, {}, { match : [null, 'myproject', 1] });

        Log.prototype.getId.should.be.called;
        Log.prototype.isUploaded.should.be.called;
        Log.prototype.getUploadedUrl.should.be.called;
    });

    it('should respond to the trigger command', () => {
        const myBot = new Bot(new Config(''));

        // Stub project
        Project.prototype.parse.restore();
        const project = sinon.createStubInstance(Project);
        project.getId.restore();
        project.getLogs.restore();
        sandbox.stub(project, 'getId', () => { return 'myproject'; });
        sandbox.stub(project, 'getLogs', () => { return new Map().set(1, new Log()); });
        myBot.projects = new Map();
        myBot.projects.set('myproject', project);

        const fakeBot = {utterances: {yes: '', no: ''}};

        // Asks
        let spy = createSpyObject('ask');
        myBot.botProjectTrigger(spy, fakeBot, { match : [null, 'myproject'] });
        spy.ask.should.have.calledWith(sinon.match.string, sinon.match.array);

        // Handles yes
        spy = createSpyObject('trigger');
        const spyConvo = createSpyObject('say', 'next');
        myBot.botProjectTriggerYes(spy, null, spyConvo);
        spy.trigger.should.be.called;
        spyConvo.say.should.be.called;
        spyConvo.next.should.be.called;

        // Handles no
        const spyConvo2 = createSpyObject('say', 'next');
        myBot.botProjectTriggerNo(null, spyConvo2);
        spyConvo2.say.should.be.called;
        spyConvo2.next.should.be.called;
    });
});