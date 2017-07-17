const {
    File,
    Routine,
    Expr,
    Condition,
    While,
    SEAString,
    SEAInteger,
    SEABoolean,
    Primitive,
    Print
} = require('./schema/core.js');

const perlCode = new File({
    name: 'test',
    isModule: false
});

// Routine test!
perlCode.main.breakline();
const SubTest   = new Routine('test',['aArg']);
const helloVar  = new SEAString('hello',' hello world! ');
const secondVar = new SEAString('secondVar','hello world!');

SubTest.add(Primitive.constructorOf(helloVar));
SubTest.add(Primitive.constructorOf(secondVar));
SubTest.add(Primitive.methodOf(helloVar,'trim'));

const ifEqual = new Condition('if',Primitive.methodOf(helloVar,'isEqual',[secondVar]));
ifEqual.setRoot(perlCode.main);
ifEqual.on('add',element => {
    console.log(ifEqual.tabSpace.length);
});
ifEqual.add(new Print(helloVar,true)); 
SubTest.add(ifEqual);

perlCode.add(SubTest);

console.log('--------------------------------\n\n');
perlCode.write();