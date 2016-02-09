import LoggerFactory from './logger';
import Project from './project';
import Storage from './storage';
import express from 'express';
import Botkit from 'botkit';
import Promise from 'bluebird';
import 'babel-polyfill';

class Bot {

    /**
     * @param config Config
     */
    constructor(config) {
        this.config = config;
    }

    async start() {
        // Init
        this.logger = LoggerFactory.factory(this.config.getLogPath(), this.config.getLogLevel());
        this.logger.info('Starting Bot');

        // Init project storage
        this.storage = new Storage(this.config.getStoragePath());
        await this.storage.init();

        // Start the bot
        this.startSlackBot();

        // Load the projects
        this.projects = this.factoryProjects();

        // Listen for triggers
        this.startTriggerServer();
    }

    factoryProjects() {
        let projects = new Map();
        for (let projectConf of this.config.getProjects()) {
            projects.set(projectConf.id, Project.factory(projectConf, this.logger, this.storage, this.botController));
        }
        return projects;
    }

    startTriggerServer() {
        const server = express();
        server.listen(this.config.getPort());
        for (let project of this.projects.values()) {
            this.logger.info('Trigger server at: ' + '/trigger/' + project.getId());
            /* istanbul ignore next */
            server.get('/trigger/' + project.getId(), (req, res) => {
                res.send('OK');
                project.trigger();
            });
        }
    }

    startSlackBot() {
        const debug = (this.config.getLogLevel() > 4);
        this.botController = Botkit.slackbot({
            debug: debug,
            logger: this.logger,
            json_file_store: this.config.getStoragePath()
        });

        const slackbot = this.botController.spawn({
            token: this.config.getSlackApiToken()
        });

        slackbot.startRTM(this.initRTM.bind(this));

        // Register commands
        const cmdListen = ['direct_message', 'direct_mention'];
        this.botController.hears('help', cmdListen, this.startPrivateConvo.bind(this, this.botHelp.bind(this)));
        this.botController.hears('list projects', cmdListen, this.startPrivateConvo.bind(this, this.botListProjects.bind(this)));
        this.botController.hears('^show ([a-z0-9]+) status$', cmdListen, this.startPrivateConvo.bind(this, this.botProjectStatus.bind(this)));
        this.botController.hears('^show ([a-z0-9]+) logs$', cmdListen, this.startPrivateConvo.bind(this, this.botProjectLogs.bind(this)));
        this.botController.hears('^show ([a-z0-9]+) log ([0-9]+)$', cmdListen, this.startPrivateConvo.bind(this, this.botProjectLog.bind(this)));
        this.botController.hears('^trigger ([a-z0-9]+)$', cmdListen, this.startPrivateConvo.bind(this, this.botProjectTrigger.bind(this)));
    }

    initRTM(err, bot, payload) {
        if (err) {
            throw new Error('Failed to start RTM');
        }
        // TODO hacky but it works :P
        this.botController._slackInfo = payload;
        this.botController._broadcast = bot;
    }

    startPrivateConvo(speaker, bot, message) {
        bot.startPrivateConversation(message, (err, convo) => {
            /* istanbul ignore if */
            if (err) {
                this.logger.error('Failed to start private conversation: ' + err);
                return;
            }
            speaker(convo, bot, message);
        });
    }

    botHelp(convo) {
        convo.sayFirst({
            text: "",
            attachments: [{
                title: "Available Commands",
                fields: [
                    {
                        title: "list projects",
                        value: "Show list of projects",
                        short: false
                    },
                    {
                        title: "show {projectId} status",
                        value: "Get the project status",
                        short: false
                    },
                    {
                        title: "show {projectId} logs",
                        value: "Show list of logs for the project",
                        short: false
                    },
                    {
                        title: "show {projectId} log {logId}",
                        value: "Show full log from project",
                        short: false
                    },
                    {
                        title: "trigger {projectId}",
                        value: "Trigger the project",
                        short: false
                    }
                ]
            }]
        });
    }

    botListProjects(convo) {
        const projectList = [];
        for (let project of this.projects.values()) {
            projectList.push({text : project.getName() + ' - ' + project.getId()});
        }
        convo.sayFirst({
            text: "Active Projects",
            attachments: projectList
        });
    }

    botProjectStatus(convo, bot, message) {
        const requestedProject = this._findProject(message.match[1]);
        /* istanbul ignore if */
        if (requestedProject === false) {
            convo.sayFirst(this._errorMessage("Sorry, I don't know that project."));
            return;
        }
        convo.sayFirst({
            text: "",
            attachments: [{
                pretext: requestedProject.getName() + ' Status',
                title: "Project is " +
                    (requestedProject.isRunning() ? 'running' : 'waiting') +
                    ", its last run was " +
                    (requestedProject.getLastState() == 1 ? 'success' : 'fail'),
                color: requestedProject.isRunning() ? 'warning' : 'good'
            }]
        });
    }

    async botProjectLogs(convo, bot, message) {
        const requestedProject = this._findProject(message.match[1]);
        /* istanbul ignore if */
        if (requestedProject === false) {
            convo.sayFirst(this._errorMessage("Sorry, I don't know that project."));
            return;
        }
        const logs = await requestedProject.getLogs();
        const fields = [];

        /* istanbul ignore if */
        if (!logs || logs.size == 0) {
            convo.sayFirst(this._errorMessage("Doesn't look like that project has any logs."));
            return;
        }

        for (let log of logs.values()) {
            fields.push({
                title: log.getId() + ' - ' +log.getDate(),
                short: false
            });
        }

        convo.sayFirst({
            text: "",
            attachments: [{
                title: requestedProject.getName() + ' Logs',
                fields: fields
            }]
        });
    }

    async botProjectLog(convo, bot, message) {
        const requestedProject = this._findProject(message.match[1]);
        if (requestedProject === false) {
            /* istanbul ignore next */
            convo.sayFirst(this._errorMessage("Sorry, I don't know that project."));
            return;
        }
        const logs = await requestedProject.getLogs();
        const logId = parseInt(message.match[2], 10);
        if (!logs.has(logId)) {
            /* istanbul ignore next */
            convo.sayFirst(this._errorMessage("Sorry, I don't know that log."));
            return;
        }
        const requestedLog = logs.get(logId);

        // Try and fetch or upload the log
        let logUrl = false;
        if (!requestedLog.isUploaded()) {
            try {
                let upload = Promise.promisify(bot.api.files.upload);
                let res = await upload({
                    content: requestedLog.toString(),
                    filetype: "txt",
                    filename: requestedProject.getId() + "-" + requestedLog.getId() + ".txt"
                });
                if (res.ok) {
                    logUrl = res.file.permalink_public;
                    requestedLog.setUploaded(true);
                    requestedLog.setUploadUrl(logUrl);
                    await requestedLog.store();
                }
            } catch(err) {
                /* istanbul ignore next */
                convo.sayFirst(this._errorMessage('Failed to make log available in slack - ' + err.message));
                return;
            }
        } else {
            logUrl = requestedLog.getUploadedUrl();
        }

        if (!logUrl) {
            /* istanbul ignore next */
            convo.sayFirst(this._errorMessage('Failed to make log available in slack'));
            return;
        }

        convo.sayFirst({
            text: "",
            attachments: [{
                fallback: "Log available at - " + logUrl,
                pretext: "Log ready to view",
                title: requestedProject.getId() + "-" + requestedLog.getId() + ".txt",
                title_link: logUrl,
                text: "Enjoy yo log!",
                color: "#7CD197"
            }]
        });
    }

    botProjectTrigger(convo, bot, message) {
        const requestedProject = this._findProject(message.match[1]);
        /* istanbul ignore if */
        if (requestedProject === false) {
            convo.sayFirst(this._errorMessage("Sorry, I don't know that project."));
            return;
        }
        convo.ask("Are you sure you want to trigger this project?", [
            {
                pattern: bot.utterances.yes,
                callback: this.botProjectTriggerYes.bind(this, requestedProject)
            },
            {
                pattern: bot.utterances.no,
                default: true,
                callback: this.botProjectTriggerNo.bind(this)
            }
        ]);
    }

    botProjectTriggerYes(requestedProject, response, convo) {
        convo.say({
            text: "",
            attachments: [{
                title: "OK starting the job",
                color: "good"
            }]
        });
        requestedProject.trigger();
        convo.next();
    }

    botProjectTriggerNo(response, convo) {
        convo.say({
            text: "",
            attachments: [{
                title: "Aborting!",
                color: "warning"
            }]
        });
        convo.next();
    }

    _findProject(id) {
        /* istanbul ignore if */
        if (!this.projects.has(id)) {
            return false;
        }
        return this.projects.get(id);
    }

    _errorMessage(text) {
        /* istanbul ignore next*/
        return {
            text: "",
            attachments: [{
                fallback: text,
                text: text,
                color: "danger"
            }]
        };
    }
}

export default Bot