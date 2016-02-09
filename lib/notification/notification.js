import {InternalError} from '../errors';

class Notification {

    constructor(config, project) {
        this.config = config;
        this.project = project;
    }

    /* istanbul ignore next */
    send() {
        throw new Error('Please implement me');
    }

    // TODO maybe have config for bot admin and ping them...
    isInternalError(err) {
        if (err instanceof InternalError) {
            this.project.logger.error(err.toString());
            return true;
        }
        return false;
    }

    /**
     * Broadcast to any channel/group the bot is a member of
     *
     * @param msg
     */
    broadcast(msg) {
        const botId = this.project.bot._slackInfo.self.id;
        const toMsg = [];
        const channels = this.project.bot._slackInfo.channels;
        const groups = this.project.bot._slackInfo.groups;
        for (let channel of channels) {
            if (channel.is_member == true) {
                toMsg.push(channel.id);
            }
        }
        for (let group of groups) {
            let members = group.members.filter((m) => { return m == botId; });
            if (members.length == 1) {
                toMsg.push(group.id);
            }
        }
        for (let ch_gr of toMsg) {
            msg.channel = ch_gr;
            this.project.bot._broadcast.say(msg);
        }
    }
}

export default Notification