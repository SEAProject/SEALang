const {
    File,
    Routine,
    ReturnStatment,
    Scalar,
    Expr,
    Condition,
    While,
    Str,
    Int,
    Bool,
    Arr,
    Print
} = require('./schema/core.js');

const perlCode = new File({
    name: 'test',
    isModule: false
});

perlCode.breakline();
const Sub = new Routine({name:'test'});
Sub.add(new ReturnStatment(new Str(void 0,'hello')));
perlCode.add(Sub);

perlCode.breakline();
perlCode.add(new Scalar('tR',Sub));

perlCode.write();