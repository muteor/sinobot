import sinon from 'sinon';
import stripJsonComments from 'strip-json-comments';
import fs from 'fs';

/**
 * Spy on a number of methods of an object
 */
export function createSpyObject(...methods) {
    const obj = {};
    for (let method of methods) {
        obj[method] = sinon.spy();
    }
    return obj;
}

const stubbed = [];

/**
 * Sinon doesn't allow stubbing of missing methods, this fixes that
 * so you can properly TDD...
 */
export function stubTdd(object, method, ret) {
    if (!object[method]) {
        object[method] = ret;
    }
    if (object[method].isSinonProxy) {
        object[method].restore();
    }
    const stub = sinon.stub(object, method, ret);
    stubbed.push(stub);
    return stub;
}

export function stubTddRestore() {
   for (let s of stubbed) {
       s.restore();
   }
}

export function loadFixtureJson(path) {
    let config = fs.readFileSync(path, {encoding: 'utf8'});
    config = JSON.parse(stripJsonComments(config));
    return config;
}

export function makeObjectFromDot(path, obj) {
    var parts = path.split('.');
    for (var i = 0, ob = obj || {}, current = ob; i < parts.length; i++) {
        current[parts[i]] = {};
        current = current[parts[i]];
    }
    return ob;
}

