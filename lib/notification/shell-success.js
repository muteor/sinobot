import Notification from './notification';

class ShellSuccess extends Notification {

    send(commandResult) {
        if (this.isInternalError(commandResult)) {
            return;
        }
        if (commandResult.code && commandResult.code == 0) {
            let text = "use `@sino show " + this.project.getId() + " logs` to view the log";
            if (commandResult.hasOwnProperty('summary')) {
                text = commandResult.summary;
            }
            this.broadcast({
                text: this.config.msg,
                attachments: [
                    {
                        "fallback": this.config.msg,
                        "title": this.project.getName() + " - " + this.config.msg,
                        "text": text,
                        "color": "good",
                        "mrkdwn_in": ["text"]
                    }
                ]
            });
        }
    }
}

export default ShellSuccess;