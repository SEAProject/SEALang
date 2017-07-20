const {
    File,
    Routine,
    ReturnStatment,
    Scalar,
    Hash,
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
const Sub = new Routine({
    name: 'test'
});
Sub.add(new Hash('test',{
    a: 5,
    b: 10
}));
perlCode.add(Sub);

perlCode.write();