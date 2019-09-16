class Test {
    constructor() {
        this.name = "";
        this.sections = [];
        this.pathToFile = "";
    }

    parseData(data) {
        this.name = data.name
        this.sections = data.sections
        this.pathToFile = data.pathToFile
    }
}

module.exports = Test;