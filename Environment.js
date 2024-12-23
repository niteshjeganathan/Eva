class Environment {

    constructor(record = {}, parent = null) {
        this.record = record;
        this.parent = parent;
    }
    
    define(name, value) {
        this.record[name] = value;
        return value;
    }

    lookup(name) {
        return this._resolve(name).record[name];
    }

    assign(name, value) {
        this._resolve(name).record[name] = value;
        return value;
    }

    _resolve(name) {
        if(this.record.hasOwnProperty(name)) {
            return this;
        }
        if(this.parent == null) {
            throw new ReferenceError(`Variable ${name} is not defined!`);
        }

        return this.parent._resolve(name);
    }
}

module.exports = Environment;