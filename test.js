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

perlCode.write();