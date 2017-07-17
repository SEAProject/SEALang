const {
    File,
    Routine,
    CodeBlock,
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
    isModule: false,
    tabSize: 2
});

// Routine test!
perlCode.main.breakline();
const SubTest = new Routine('test',['aArg']);
const helloVar = new SEAString('hello',' hello world! ');
SubTest.add(Primitive.constructorOf(helloVar));
SubTest.add(Primitive.methodOf(helloVar,'trim'));
SubTest.add(Primitive.methodOf(helloVar,'isEqual',['$aArg']));
SubTest.add(new Print(helloVar,true)); 
perlCode.add(SubTest);

// Boolean test!
perlCode.main.breakline(); 
const BoolT = new SEABoolean('boolt',true);
perlCode.add(Primitive.constructorOf(BoolT));
const ifboolTrue = new Condition('if',BoolT);
ifboolTrue.add(new Print("boolt is true!",true));
perlCode.add(ifboolTrue);

// Integer test !
perlCode.main.breakline(); 
const BlockT = new Expr(); 
const IntegerT = new SEAInteger('integert',500);
BlockT.add(Primitive.constructorOf(IntegerT));
perlCode.add(BlockT);

perlCode.write();