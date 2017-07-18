const {
    File,
    Routine,
    ReturnStatment,
    Expr,
    Condition,
    While,
    Str,
    Int,
    Bool,
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
    args: ['aArg'],
    shifting: true
});
const helloVar  = new Str('hello',' hello world! ');
const secondVar = new Str('secondVar','hello world!');

SubTest.add(Primitive.constructorOf(helloVar));
SubTest.add(Primitive.constructorOf(secondVar));
SubTest.add(Primitive.methodOf(helloVar,'trim'));

const ifEqual = new Condition('if',Primitive.methodOf(helloVar,'isEqual',[secondVar]));
ifEqual.setRoot(SubTest);
ifEqual.add(new Print(helloVar,true)); 
SubTest.add(ifEqual);
SubTest.add(new ReturnStatment(helloVar));

perlCode.add(SubTest);

console.log('--------------------------------\n\n');
perlCode.write();