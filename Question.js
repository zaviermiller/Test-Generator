class Question {
    constructor(type) {
        this.type = type
        this.text = "";
        this.correct = "";
        this.f1 = "";
        this.f2 = "";
        this.f3 = "";
    }

    fillSAMTF(  text,correct) {
        this.text = text;
        this.correct = correct;
    }

    fillMC(text,correct,f1,f2,f3) {
        this.text = text;
        this.correct =correct;
        this.f1 = f1;
        this.f2 = f2;
        this.f3 = f3;
    }

}

module.exports = Question