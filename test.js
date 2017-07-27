const {
    File,
    Print,
    Routine,
    Condition,
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
    const myFNA = new Routine({
        name: 'Afn'
    }); 
    myFNA.add(new ReturnStatment(new Str(void 0,'  hello world!  ')));
    perlCode.add(myFNA);

    perlCode.breakline();
    const myStr = new Str('test',myFNA);
    perlCode.add(myStr);
    perlCode.add(myStr.trim());
    perlCode.add(myStr.repeat(2));
    perlCode.add(new Print(myStr,true));

    await perlCode.write( join( __dirname, '..' , 'source' ) );
    process.exit(0);

});