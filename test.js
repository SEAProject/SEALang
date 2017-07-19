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
const tArr = new Arr('tArr','string',[1,10,15]);
// <T> (scalar,integer,string,boolean)
perlCode.add(tArr);
// const Wh = new While(tArr);
// Wh.setRoot(perlCode);
// perlCode.add(Wh); 

perlCode.write();