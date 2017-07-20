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

perlCode.breakline();
const testRoutine = new Routine({
    name: 'getHello'
});
testRoutine.add(
    new ReturnStatment(new Str(void 0,'hello world!'))
);
perlCode.add(testRoutine);

perlCode.breakline();
const tArr = new Arr('tArr','integer',[1,0]);
perlCode.add(tArr);
const customWhile = new While(tArr);
const testStr = new Str('test',testRoutine);
customWhile.add(testStr);
customWhile.add(new Print(testStr,true));
customWhile.add(new Print('$element',true));
perlCode.add(customWhile); 

perlCode.write();