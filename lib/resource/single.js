import Resource from './resource'

class Single extends Resource {
    get() {
        return new Promise((resolve) => {
            resolve(this.config.resource);
        });
    }
}

export default Single;