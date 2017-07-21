const { readFile, writeFile } = require('fs');
const { join }  = require('path');
const { promisify } = require('util');

const asyncRead     = promisify(readFile);
const asyncWrite    = promisify(writeFile);

const schemeDir     = join(__dirname,'..','schema');
const buildFiles    = [
    'core.js'
];

setImmediate(async function() {
    const buildContent = [];
    for(let i = 0, len = buildFiles.length;i<len;i++) {
        try {
            const str = await asyncRead(join(schemeDir,buildFiles[i]));
            buildContent.push(str);
        }
        catch(E) {
            console.error(E);
        };
    };
    await asyncWrite( join(__dirname,'..','build.js'), buildContent.join('\n') );
});