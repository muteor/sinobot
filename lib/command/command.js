class Command {

    constructor(config, project) {
        this.config = config;
        this.project = project;
    }

    /* istanbul ignore next */
    execute() {
        throw new Error('Please implement me');
    }
}

export default Command