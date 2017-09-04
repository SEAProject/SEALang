const {
    File,
    Str,
    HashMap,
    Print,
    Foreach
} = require('./index.js');
const { join } = require('path');

async function main() {

    const perlCode = new File({
        name: 'test',
        isModule: false
    });

    perlCode.breakline();
    const hM = new HashMap('test','integer',{
        'a': 5,
        'b': 10
    });
    perlCode.add(hM);
    perlCode.breakline();
    const a = new Str('a','hello world!');
    perlCode.add(a);
    perlCode.add(new Print(a));

    await perlCode.write( join( __dirname, '..' , 'source' ) , true );
    process.exit(0);

}
main().catch( E => console.error(E) );