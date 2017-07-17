const events = require('events');

const IDefaultConfiguration = {
    tabSize: 4
}

/*
 * File class (that represent a entire perl file!)
 */ 
class File {

    constructor({name,isModule = false}) {
        if(typeof (name) !== 'string') {
            throw new TypeError('Invalid name type!');
        }
        this.name = name;
        this.isModule = isModule;
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
        this.main = new Expr({
            tabSize: 0,
            root: void 0,
            addblock: false
        });
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
 * Print method!
 */
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
 * Expr block code (represent a { expr }).
 */
class Expr extends events {

    constructor({ tabSize = IDefaultConfiguration.tabSize, addblock = true } = {}) {
        super();
        this.tabSpace = tabSize === 0 ? '' : ' '.repeat(tabSize);
        this.addblock = addblock;
        this.rootExpr = void 0;
        this.childrensExpr = [];
        this.elements = [];
        this.scope = {
            variables: new Map(),
            routines: new Map()
        }
    }

    setRoot(root) {
        if(root instanceof Expr === false) {
            throw new Error('Invalid root variable. Instanceof have to be equal to Expr.');
        }
        this.rootExpr = root;
        const redefinedTab = root.tabSpace === '' ? ' '.repeat(IDefaultConfiguration.tabSize) : root.tabSpace;
        this.tabSpace = redefinedTab.repeat(1);
    }

    breakline() {
        this.elements.push('\n');
    }

    add(element) {
        this.emit('add',element);
        if(element == undefined) return;
        if(element === this) return;

        if(this.rootExpr == void 0 && element instanceof Expr) {
            console.log('set new root...');
            console.log(this.rootExpr);
            console.log(element);
            element.setRoot(this);
        }

        if(element instanceof Primitive) {
            this.scope.variables.set(element.name,element);
        }

        if(element instanceof Routine) {
            this.scope.routines.set(element.name,element);
        }

        this.elements.push(element.toString(this.tabSpace));
    }
    
    hasVar(varName) {
        if(varName == undefined) return false; 
        return this.scope.variables.has(varName);
    }

    hasRoutine(routineName) {
        if(routineName == undefined) return false; 
        return this.scope.routines.has(routineName);
    }

    toString() {
        if(this.elements.length === 0) return '';
        let finalStr = '';
        for(let i = 0,len = this.elements.length;i<len;i++) {
            finalStr+=this.tabSpace+this.elements[i];
        }
        return this.addblock === true ? `{\n${finalStr}${this.rootExpr.tabSpace}};\n` : finalStr;
    }

}

/*
 * Routine elements
 * (Shiting,ReturnStatment and Routine)
 */

class Routine extends Expr {

    constructor(name,args = []) {
        super({
            addblock: false
        });
        this.name = name == void 0 ? '' : name;
        if(this.name.slice(-1) !== ' ') {
            this.name+=' ';
        }
        this.returnStatment = false;
        this.returnType = void 0; 
        this.returnMultiple = false;
        this.add(new RoutineShifting(args));
    }

    toString() {
        return `sub ${this.name}{\n`+super.toString()+'};\n';
    }

}

class RoutineShifting {

    constructor(variables) {
        if(variables.length === 0) {
            throw new Error('Impossible to create a routine Shifting witouth variables...');
        }
        this.value = '';
        if(variables.length > 0) {
            const finalStr = variables.map((element) => element instanceof Primitive ? `\$${element.name}` : '$'+element ).join(',');
            this.value = `my (${finalStr}) = @_;\n`;
        }
    }

    toString() {
        return this.value;
    }

}

class ReturnStatment {

    constructor() {

    }

}

/*
 * Condition block
 */
const IConditionBlock = new Set(['if','else','elif']);

class Condition extends Expr {

    constructor(cond,expr = 'true') {
        super();
        if(IConditionBlock.has(cond) === false) {
            throw new Error('Unknown condition type!');
        }
        this.cond = cond;
        this.expr = expr instanceof Primitive ? `\$${expr.name}->valueOf() == 1` : expr;
        this.expr = this.expr.replace(';','').replace('\n','');
    }

    toString() {
        return `${this.cond} (${this.expr}) `+super.toString();
    }

}

/*
 * While block ! 
 */
class While extends Expr {

    constructor(SEAElement) {
        super();
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
                    if(element instanceof Primitive) {
                        final.push(`\$${element.name}`);
                    }
                    else if(element instanceof Expr) {
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