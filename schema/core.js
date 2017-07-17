
/*
 * File class (that represent a entire perl file!)
 */ 
class File {

    constructor({name,isModule = false,tabSize=2}) {
        if(typeof (name) !== 'string') {
            throw new TypeError('Invalid name type!');
        }
        this.name = name;
        this.isModule = isModule;
        this.tabSize = 2;
        this.filecode = '';

        /*
         * Add default package(s) dependencie(s) for SEALang
         */
        this.use('strict');
        this.use('warnings');
        this.use('stdlib.array',['isArray']);
        this.use('stdlib.hashmap',['isHashMap']);
        this.use('stdlib.integer',['isInteger']);
        this.use('stdlib.string',['isString']);
        this.use('stdlib.boolean',['isBoolean']);

        // Add Expression block to the file!
        this.main = new CodeBlock({tabSize : 0});
    }

    add(element) {
        this.main.add(element);
    }

    /*
     * use a new package (required header!)
     */
    use(pkgName,requiredVars) {
        if(typeof(pkgName) !== 'string') {
            throw new TypeError('Invalid package type');
        }
        pkgName = pkgName.split('.').join('::');
        if(requiredVars == undefined) {
            this.filecode += `use ${pkgName};\n`;
        }
        else {
            this.filecode += `use ${pkgName} qw(${requiredVars.join(' ')});\n`;
        }
    }

    /*
     * Write file to string location
     */
    write(location) {
        this.filecode+=this.main.toString();
        if(this.isModule) {
            this.filecode += '1;';
        }
        console.log(this.filecode);
    }

}

/*
 * CodeBlock Class (represent a block of code).
 */
class CodeBlock {

    constructor({tabSize=2} = {}) {
        this.elements = [];
        if(tabSize === 0) {
            this.tabSpace = '';
        }
        else {
            this.tabSpace = ' '.repeat(tabSize);
        }
        this.tabSize = tabSize;
    }

    breakline() {
        this.elements.push('\n');
    }

    add(element) {
        if(element == undefined) return;

        if(element instanceof Primitive) {
            if(typeof(element) === 'string') {
                this.elements.push(element);
            }
        }
        else {
            this.elements.push(element.toString(this.tabSpace));
        }
    }

    toString(tabSpace) {
        if(this.elements.length === 0) return '';
        if(tabSpace == undefined) {
            tabSpace = this.tabSpace;
        }
        this.finalStr = '';
        for(let i = 0,len = this.elements.length;i<len;i++) {
            this.finalStr+=tabSpace+this.elements[i];
        }
        return this.finalStr;
    }

}

class Print {

    constructor(message,newLine) {
        if(message == undefined) {
            message = '';
        }
        else if(message instanceof Primitive) {
            message = `\$${message.name}->valueOf()`;
        }
        const sep = newLine === true ? '\\n' : '';
        this.value = `print("${message}${sep}");\n`;
    }

    toString() {
        return this.value;
    }

}

/*
 * Expr block code (represent a { expr }). Own scope, own CodeBlock.
 */
class Expr {

    constructor({tabSize = 2} = {}) {
        this.chunk = new CodeBlock({tabSize});
    } 
    
    add(element) {
        this.chunk.add(element);
    }

    toString() {
        return `{\n${this.chunk.toString()}};\n`;
    }

}

/*
 * Routine block
 */
class Routine extends Expr {

    constructor(name,args = []) {
        super({});
        this.name = name == void 0 ? '' : name;
        if(args.length > 0) {
            args = args.map((v) => {
                return '$'+v;
            });
            this.args = `  my (${args.join(',')}) = @_;\n`;
        }
        else {
            this.args = '';
        }
    }

    return(values) {
        if(values instanceof Array) {

        }
        else {

        }
    }

    toString() {
        return `sub ${this.name}{\n`+this.args+this.chunk.toString()+'};\n';
    }

}

/*
 * Condition block
 */
const IConditionBlock = new Set(['if','else','elif']);

class Condition extends Expr {

    constructor(cond,expr = 'true') {
        super({});
        if(IConditionBlock.has(cond) === false) {
            throw new Error('Unknown condition type!');
        }
        this.cond = cond;
        this.expr = expr instanceof Primitive ? `\$${expr.name}->valueOf() == 1` :expr;
    }

    toString() {
        return `${this.cond} (${this.expr}) {\n`+this.chunk.toString()+'}\n';
    }

}

/*
 * While block ! 
 */
class While extends Expr {

    constructor(SEAElement) {
        super({});
    }

}

/*

    PRIMITIVES TYPES

*/
const IPrimeLibrairies = new Map([
    ['string','stdlib::string'],
    ['integer','stdlib::integer'],
    ['boolean','stdlib::boolean'],
    ['array','stdlib::array'],
    ['map','stdlib::hashmap'],
    ['regexp','stdlib::regexp']
]); 

const IPrimeMethods = new Map();

// String methods
IPrimeMethods.set('stdlib::string',new Set([
    'freeze',
    'isEqual',
    'slice',
    'substr',
    'charAt',
    'charCodeAt',
    'match',
    'concat',
    'contains',
    'containsRight',
    'split',
    'repeat',
    'replace',
    'toLowerCase',
    'toUpperCase',
    'trim',
    'trimLeft',
    'trimRight'
]));

// Integer methods
IPrimeMethods.set('stdlib::integer',new Set([
    'freeze',
    'sub',
    'add',
    'mul',
    'div'
]));

// Boolean methods
IPrimeMethods.set('stdlib::boolean',new Set([]));

// Array methods
IPrimeMethods.set('stdlib::array',new Set([
    'freeze',
    'clear',
    'size',
    'push',
    'concat',
    'get',
    'join',
    'indexOf',
    'lastIndexOf',
    'pop',
    'shift',
    'unshift',
    'reverse',
    'clone',
    'slice',
    'splice',
    'fill',
    'find',
    'findIndex',
    'reduce',
    'reduceRight',
    'some',
    'map',
    'every',
    'forEach'
]));

// Map methods
IPrimeMethods.set('stdlib::hashmap',new Set([
    'freeze',
    'clear',
    'size',
    'has',
    'get',
    'set',
    'delete',
    'forEach',
    'keys',
    'values'
]));

// Regex methods
IPrimeMethods.set('stdlib::regexp',new Set([
    'exec',
    'test'
]));

class Primitive {

    constructor({type,name,value = 'undef'}) {
        if(IPrimeLibrairies.has(type) === false) {
            throw new Error(`Primitive type ${type} doesn't exist!`);
        }
        this.libtype = IPrimeLibrairies.get(type);
        this.name = name;
        this.constructValue = value;
        this.value = value;
    }

    get type() {
        return this.libtype;
    }

    static constructorOf(SEAElement) {
        if(SEAElement instanceof Primitive === false) {
            throw new TypeError('Not a primitive type!');
        }
        if(SEAElement instanceof SEAString) {
            return `my \$${SEAElement.name} = ${SEAElement.type}->new("${SEAElement.constructValue}");\n`;
        }
        else {
            return `my \$${SEAElement.name} = ${SEAElement.type}->new(${SEAElement.constructValue});\n`;
        }
    }

    static methodOf(SEAElement,methodName,args = []) {
        if(SEAElement instanceof Primitive === false) {
            throw new TypeError('Not a primitive type!');
        }
        const elementType = SEAElement.type;
        if(IPrimeMethods.has(elementType) === false) {
            throw new Error(`Invalid ${elementType} primitive type for element ${SEAElement.name}`);
        }
        if(IPrimeMethods.get(elementType).has(methodName) === false) {
            throw new Error(`${methodName} doesn't exist for ${elementType} primitive!`);
        }
        if(args.length === 0) {
            return `\$${SEAElement.name}->${methodName};\n`;
        }
        else {
            let final = [];
            args.forEach( element => {
                if(typeof(element) === 'string') {
                    final.push(element);
                }
                else {
                    if(element instanceof Expr) {
                        final.push(element.toString());
                    }
                }
            });
            return `\$${SEAElement.name}->${methodName}(${final.join(',')});\n`;
        }
    }

}

/*
 * String type!
 */
class SEAString extends Primitive {

    constructor(varName,valueOf) {
        if(varName == undefined || typeof(valueOf) !== 'string') {
            throw new Error('Invalid SEAString');
        }
        super({
            type: 'string',
            name: varName,
            value: valueOf,
        });
    }

}

/*
 * Integer type!
 */
class SEAInteger extends Primitive {

    constructor(varName,valueOf) {
        if(varName == undefined || typeof(valueOf) !== 'number') {
            throw new Error('Invalid SEAInteger');
        }
        super({
            type: 'integer',
            name: varName,
            value: valueOf,
        });
    }

}

/*
 * Boolean type!
 */
class SEABoolean extends Primitive {

    constructor(varName,valueOf) {
        if(varName == undefined || typeof(valueOf) !== 'boolean') {
            throw new Error('Invalid SEABoolean');
        }
        super({
            type: 'boolean',
            name: varName,
            value: valueOf ? 1 : 0,
        });
    }

}

// Export every schema class!
module.exports = {
    File,
    CodeBlock,
    Expr,
    Routine,
    Condition,
    While,
    SEAString,
    SEAInteger,
    SEABoolean,
    Primitive,
    Print
}