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

const FN = new Routine({args: ['test']});
FN.setRoot(perlCode);
const RN = new ReturnStatment(new Int(void 0,5));
FN.add(RN); 
perlCode.add(new Int('intR',FN));

perlCode.breakline();
const cond = new Condition('if','$intR == 5'); 
cond.setRoot(perlCode);
cond.add(new Print('Hello world!'));
let test = new Routine({name: 'test',args:['xdVar']});
test.setRoot(cond); 
const vS = new Str('msg','bienvenue les amies!');
test.add(vS);
test.add(new ReturnStatment(vS));
cond.add(test);
perlCode.add(cond);

perlCode.breakline();
const tArr = new Arr('tArr',void 0,[1,10,15]);
// <T> (scalar,integer,string,boolean)
perlCode.add(tArr);
// const Wh = new While(tArr);
// Wh.setRoot(perlCode);
// perlCode.add(Wh); 

perlCode.write();