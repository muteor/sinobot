class Resource {

    constructor(config, project) {
        this.config = config;
        this.project = project;
    }

    /* istanbul ignore next */
    get() {
        throw new Error('Please implement me');
    }

    release() {
        // Implement locking if you want...
    }
}

export default Resource;