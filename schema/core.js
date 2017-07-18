const events = require('events');

const IDefaultConfiguration = {
    tabSize: 4
}

/*
 * Expr block code (represent a { expr }).
 */
class Expr extends events {

    constructor({ tabSize = IDefaultConfiguration.tabSize, addblock = true } = {}) {
        super();
        this.tabSpace = tabSize === 0 ? '' : ' '.repeat(tabSize);
        this.closed = false;
        this.addblock = addblock;
        this.rootExpr = undefined;
        this.headerDone = false;
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
        this.tabSpace = root.tabSpace.length === 0 ? ' '.repeat(IDefaultConfiguration.tabSize) : root.tabSpace+' '.repeat(IDefaultConfiguration.tabSize);
    }

    setPackage(packageName) {
        if(this.isModule === false) {
            throw new Error('Cannot set package on non-module file!');
        }
        packageName = packageName.split('.').join('::');
        this.elements.push(`package ${packageName};\n`)
    }

    breakline() {
        this.elements.push('\n');
    }

    add(element) {
        if(this.closed === true) {
            throw new Error('Expr closed... Impossible to add new element!');
        }

        if(element == undefined) return;
        if(element === this) return;

        if(element instanceof Array) {
            for(let i = 0,len = element.length;i<len;i++) {
                this.add(element[i]);
            }
            return;
        }

        const rootDefined = "undefined" === typeof(element.rootExpr);
        if(element instanceof Dependency) {
            if(rootDefined) {
                if(this.headerDone === true) {
                    this.elements.unshift(element.toString());
                }
                else {
                    this.elements.push(element.toString());
                }
                return;
            }
            else {
                throw new Error('Cannot add new depencies on non-root Expr');
            }
        }

        if(element instanceof ReturnStatment) {
            if(this instanceof Routine) {
                this.elements.push(element.toString());
                this.closed = true;
                this.returnStatment = true;
                this.returnMultiple = element.returnMultiple;
                this.returnType = element.returnedType;
                return;
            }
        }

        if(element instanceof Expr && rootDefined === true) {
            element.setRoot(this);
        }

        if(element instanceof Primitive) {
            this.scope.variables.set(element.name,element);
        }

        if(element instanceof Routine) {
            this.scope.routines.set(element.name,element);
        }

        this.elements.push(element.toString());
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
 * File class (that represent a entire perl file!)
 */ 
const FileDefaultDepencies = new Set([
    'strict',
    'warnings',
    'stdlib.array',
    'stdlib.hashmap',
    'stdlib.integer',
    'stdlib.string',
    'stdlib.boolean'
]);

class File extends Expr {

    constructor({name,isModule = false}) {
        super({
            tabSize: 0,
            addblock: false
        });
        if(typeof (name) !== 'string') {
            throw new TypeError('Invalid name type!');
        }
        this.name = name;
        this.isModule = isModule;
        FileDefaultDepencies.forEach( DepName => {
            this.add(new Dependency(DepName));
        });
        this.headerDone = true;
    }

    /*
     * Write file to string location
     */
    write(location) {
        const filecode = super.toString();
        if(this.isModule) {
            filecode += '1;';
        }
        console.log(filecode);
    }

}

/*
 * Dependency class!
 */
class Dependency {

    constructor(pkgName,requiredVars) {
        if(typeof(pkgName) !== 'string') {
            throw new TypeError('Invalid package type');
        }
        pkgName = pkgName.split('.').join('::');
        const ret = "undefined" === typeof(requiredVars);
        if(ret === false) {
            if(requiredVars instanceof Array === false) {
                requiredVars = Array.from(requiredVars);
            }
        }
        this.value = ret === true ? `use ${pkgName};\n` : `use ${pkgName} qw(${requiredVars.join(' ')});\n`;
    }

    toString() {
        return this.value;
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
 * Routine elements
 * (Shiting,ReturnStatment and Routine)
 */

class Routine extends Expr {

    constructor({name,args = [],shifting = false}) {
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
        this.add(new RoutineShifting(args,shifting));
    }

    toString() {
        return `sub ${this.name}{\n`+super.toString()+'};\n';
    }

}

class RoutineShifting {

    constructor(variables,shifting) {
        this.value = '';
        if(variables.length > 0) {
            if(shifting) {
                let finalStr = '';
                variables.forEach( (element) => {
                    const elName = element instanceof Primitive ? `\$${element.name}` : '$'+element;
                    finalStr+='my '+elName+' = shift;\n';
                });
                this.value = finalStr;
            }
            else {
                const finalStr = variables.map( (element) => element instanceof Primitive ? `\$${element.name}` : '$'+element ).join(',');
                this.value = `my (${finalStr}) = @_;\n`;
            }
        }
    }

    toString() { 
        return this.value;
    }

}

class ReturnStatment {

    constructor(expr) {
        if(expr instanceof Array) {
            this.returnMultiple = true;
            this.returnedType = [];
            const elems = [];
            expr.forEach( (subExpr,index) => {
                if(subExpr instanceof Primitive) {
                    this.returnedType[index] = expr.libtype;
                    elems.push(`\$${subExpr.name}`);
                }
                else {
                    this.returnedType[index] = 'any';
                    elems.push(`${subExpr}`);
                }
            });
            this.value = `return (${elems.join(',')});\n`;
        }
        else {
            this.returnMultiple = false;
            if(expr instanceof Primitive) {
                this.returnedType = expr.libtype;
                this.value = `return \$${expr.name};\n`;
            }
            else {
                this.returnedType = 'any'; 
                this.value = `return ${expr};\n`;
            }
        }
    }

    toString() {
        return this.value;
    }

}

/*
 * Condition block
 */
const IConditionBlock = new Set(['if','else','elif']);

class Condition extends Expr {

    constructor(cond,expr) {
        super({});
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
        if(SEAElement instanceof Str) {
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
class Str extends Primitive {

    constructor(varName,valueOf) {
        if(varName == undefined || typeof(valueOf) !== 'string') {
            throw new Error('Invalid String');
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
class Int extends Primitive {

    constructor(varName,valueOf) {
        if(varName == undefined || typeof(valueOf) !== 'number') {
            throw new Error('Invalid Integer');
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
class Bool extends Primitive {

    constructor(varName,valueOf) {
        if(varName == undefined || typeof(valueOf) !== 'boolean') {
            throw new Error('Invalid Boolean');
        }
        super({
            type: 'boolean',
            name: varName,
            value: valueOf ? 1 : 0,
        });
    }

}

/*
 * Array type!
 */
class Arr extends Primitive {

    constructor(varName,valueOf) {
        super({
            type: 'array',
            name: varName,
            value: valueOf ? 1 : 0,
        });
    }

}

// Export every schema class!
module.exports = {
    File,
    Dependency,
    Expr,
    Routine,
    ReturnStatment,
    Condition,
    While,
    Str,
    Int,
    Bool,
    Arr,
    Primitive,
    Print
}