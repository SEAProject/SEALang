const {
    File,
    Print,
    Routine,
    Condition,
    Evaluation,
    ReturnStatment,
    Int,
    Str
} = require('./schema/core.js');
const { join } = require('path');

setImmediate( async function() {

    const perlCode = new File({
        name: 'test',
        isModule: false
    });

    perlCode.breakline();
    const myEval = new Evaluation();
    myEval.add(new Str('test','hello world!'));
    perlCode.add(myEval);

    await perlCode.write( join( __dirname, '..' , 'source' ) );
    process.exit(0);

});