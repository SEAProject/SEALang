const {
    File,
    Routine,
    ReturnStatment,
    Expr,
    Condition,
    While,
    SIG,
    Str,
    Int,
    Bool,
    Arr,
    HashMap,
    Primitive,
    Print
} = require('./schema/core.js');

const perlCode = new File({
    name: 'test',
    isModule: false
});

// Routine test!
perlCode.breakline();
const SubTest   = new Routine({
    name: 'test',
    args: ['aArg']
});
const helloVar  = new Str('hello',' hello world! ');
const secondVar = new Str('secondVar','hello world!');

SubTest.add(helloVar);
SubTest.add(secondVar);
SubTest.add(Primitive.methodOf(helloVar,'trim'));

const ifEqual = new Condition('if',Primitive.methodOf(helloVar,'isEqual',[secondVar]));
ifEqual.setRoot(SubTest);
ifEqual.add(new Print(helloVar,true)); 
SubTest.add(ifEqual);
SubTest.add(new ReturnStatment(helloVar));
perlCode.add(SubTest);

perlCode.breakline();
const SubDie = new Routine({
    args: 'err'
});
const SigDie = new SIG('DIE',SubDie);
perlCode.add(SigDie);

perlCode.breakline();
const tArr = new Arr('tArr',[1,10,15]);
perlCode.add(tArr);

perlCode.write();