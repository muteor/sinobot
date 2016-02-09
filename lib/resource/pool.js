import Resource from './resource'

class Pool extends Resource {

    constructor(config, project) {
        super(config, project);
        this.locks = new Set();
        this.deadline = this.config.deadline; // wait 30 secs
    }

    get() {
        return new Promise((resolve, reject) => {
            this.randomResource(resolve, reject, 0);
        });
    }

    randomResource(resolve, reject, retries) {
        const self = this;
        const available = new Set(this.config.resources);
        for (let locked of this.locks) {
            available.delete(locked);
        }
        if (retries >= this.deadline) {
            reject('No resource available');
            return;
        }
        if (available.size == 0) {
            setTimeout(() => {
                retries++;
                self.randomResource(resolve, reject, retries);
            }, 1000);
            return;
        }
        retries = 0;
        const resources = Array.from(available);
        const selected = resources[Math.floor(Math.random() * resources.length)];
        this.locks.add(selected);
        resolve(selected);
    }

    release(what) {
        this.locks.delete(what);
    }
}

export default Pool;