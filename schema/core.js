const events = require('events');

const IDefaultConfiguration = {
    tabSize: 2
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
        return this;
    }

    setPackage(packageName) {
        if(this.isModule === false) {
            throw new Error('Cannot set package on non-module file!');
        }
        packageName = packageName.split('.').join('::');
        this.elements.push(`package ${packageName};\n`);
        return this;
    }

    breakline() {
        this.elements.push('\n');
        return this;
    }

    add(element) {
        if(this.closed === true) {
            throw new Error('Expr closed... Impossible to add new element!');
        }

        // When we try to add an undefined value!
        if("undefined" === typeof(element)) return;

        // When we try to add this to this...
        if(element === this) return;

        /*
         * When we add multiple element in row!
         */
        if(element instanceof Array) {
            for(let i = 0,len = element.length;i<len;i++) {
                this.add(element[i]);
            }
            return;
        }

        /*
         * When the element is a perl lib.
         */
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

        /*
         * When the element is a return statment (for a routine).
         */
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

        /*
         * When the element is a another Expr with no root defined.
         */
        if(element instanceof While) {
            if(element._inner instanceof Expr && rootDefined === true) {
                element._inner.setRoot(this);
            }
        }
        else if(element instanceof Expr && rootDefined === true) {
            element.setRoot(this);
        }

        /*
         * Set SIG routine root!
         */
        if(element instanceof SIG) {
            element.routine.setRoot(this);
        }

        /*
         * Register variables and routines for seeker mechanism.
         */
        if(element instanceof Primitive) {
            this.scope.variables.set(element.name,element);
            this.elements.push( Primitive.constructorOf(element) );
            return;
        }
        if(element instanceof Routine) {
            this.scope.routines.set(element.name,element);
        }

        if(element instanceof Print || element instanceof RoutineShifting || element instanceof PrimeMethod) {
            element = element.toString();
        }

        // Final push!
        this.elements.push( element );
        return this;
    }
    
    hasVar(varName) {
        if(varName == undefined) return false; 
        return this.scope.variables.has(varName);
    }

    hasRoutine(routineName) {
        if(routineName == undefined) return false; 
        return this.scope.routines.has(routineName);
    }

    get rootTab() {
        if("undefined" === typeof(this.rootExpr)) {
            return this.tabSpace;
        }
        return this.rootExpr.tabSpace.length === 0 ? '' : this.rootExpr.tabSpace;
    }

    toString() {
        if(this.elements.length === 0) return '';
        let finalStr = '';
        for(let i = 0,len = this.elements.length;i<len;i++) {
            const element = this.elements[i];
            if(typeof(element) === 'string') {
                finalStr+=this.tabSpace+element;
            }
            else {
                finalStr+=element.toString();
            }
        }
        const tabBlock = "undefined" === typeof(this.rootExpr) ? '' : this.rootExpr.tabSpace;
        return this.addblock === true ? `{\n${finalStr}${tabBlock}};\n` : finalStr;
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
 * Process var
 */
const Process = {
    exit: (code = 0) => `exit(${code});\n`,
    argv: () => {
        return `stdlib::array->new(@ARGV)`;
    }
}

/*
 * Routine elements
 * (Shiting,ReturnStatment and Routine)
 */
const SpaceChar = ' '.charCodeAt(0);
class Routine extends Expr {

    constructor({name,args = [],shifting = false} = {}) {
        super({});
        this.anonymous = "undefined" === typeof(name);
        this.name = this.anonymous === true ? '' : name;
        this.routineName = this.anonymous === true ? 'anonymous' : name;
        const charCode = this.name.slice(-1).charCodeAt(0);
        if(Number.isNaN(charCode) === false && charCode !== SpaceChar) {
            this.name+=' ';
        }
        this.returnStatment = false;
        this.returnType = void 0; 
        this.returnMultiple = false;
        this.add(new RoutineShifting(args,shifting));
    }

    toString() {
        return `${this.rootTab}sub ${this.name}`+super.toString();
    }

}

/*
 * Routine Shifting
 */
class RoutineShifting {

    constructor(variables,shifting) {
        this.value = '';
        if(variables instanceof Array) {
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
        else {
            const elName = variables instanceof Primitive ? `\$${variables.name}` : '$'+variables;
            this.value = 'my '+elName+' = shift;\n';
        }
    }

    toString() { 
        return this.value;
    }

}

/*
 * Return routine statment!
 */
class ReturnStatment {

    constructor(expr) {
        if(expr instanceof Array) {
            this.returnMultiple = true;
            this.returnedType = [];
            const elems = [];
            expr.forEach( (subExpr,index) => {
                if(subExpr instanceof Primitive) {
                    this.returnedType[index] = expr.libtype.std;
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
                this.returnedType = expr.libtype.std;
                this.value = expr.name === 'anonymous' ? `return ${Primitive.constructorOf(expr)}` : `return \$${expr.name};\n`;
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
        return `${this.rootTab}${this.cond} (${this.expr}) `+super.toString();
    }

}

/*
 * While block ! 
 */
class While extends Expr {

    constructor(SEAElement) {
        super();
        this._inner = new Expr();
        this.setRoot(this._inner);
        if(SEAElement instanceof HashMap) {
            const PrimeRef = IPrimeLibrairies.get(SEAElement.template).schema
            this.add(new PrimeRef('element',SEAElement.get(this.incre)));
            this.type = 'map';
        }
        else if(SEAElement instanceof Hash) {
            this.type = 'hash';
        }
        else if(SEAElement instanceof Arr) {
            this.incre = new Int('i',0);
            this._inner.add(this.incre);
            this._inner.add(new Int('len',SEAElement.size()));
            const PrimeRef = IPrimeLibrairies.get(SEAElement.template).schema
            this.add(new PrimeRef('element',SEAElement.get(this.incre)));
            this.type = 'array';
        }
        else {
            throw new Error('Unsupported type for While block!');
        }
    }

    toString() {
        if(this.type === 'array') {
            this.add(this.incre.add(1));
            this._inner.add(`while($i < $len) ${super.toString()}`);
        }
        else if(this.type === 'map') {

        }
        else if(this.type === 'hash') {

        }
        return this._inner.toString();
    }

}

/*
 * Evaluation (try/catch)
 */
class Evaluation extends Expr {

    constructor() {
        super();
    }

}

/*
 * SIG Event handler
 */
const IAvailableSIG = new Set([
    'CHLD',
    'DIE',
    'INT',
    'ALRM',
    'HUP'
]);

class SIG {

    constructor(code,routine) {
        if(IAvailableSIG.has(code) === false) {
            throw new Error(`Invalid SIG ${code}!`);
        }
        if(routine instanceof Routine === false) {
            throw new Error('Please define a valid routine!');
        }
        this.code = code;
        this.routine = routine;
    }

    toString() {
        return `\$SIG{${this.code}} = `+this.routine.toString();
    }

}

/*

    PRIMITIVES TYPES

*/
const IPrimeLibrairies = new Map();
const IPrimeMethods = new Map();
const IPrimeScalarCast = new Set(['stdlib::integer','stdlib::string','stdlib::boolean']);

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
    'clone',
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

/*
 * Primitive type class!
 */
class Primitive {

    constructor({type,name,template,value = 'undef'}) {
        if("undefined" === typeof(name)) {
            name = 'anonymous';
        }
        if(IPrimeLibrairies.has(type) === false) {
            throw new Error(`Primitive type ${type} doesn't exist!`);
        }
        this.libtype = IPrimeLibrairies.get(type);
        if(value instanceof Routine) {
            if(value.returnStatment === false) {
                throw new Error(`Cannot assign undefined value from ${value.routineName} to variable ${type}.${name}`);
            }
            if(type !== 'array' && value.returnMultiple === true) {
                throw new Error(`Cannot assign multiple values from ${value.routineName} to variable ${type}.${name}`);
            }
            if(type === 'array') {
                // Implement array type check!
            }
            else {
                this.castScalar = false;
                if(IPrimeScalarCast.has(value.returnType) === true && this.libtype.std === 'scalar') {
                    this.castScalar = true;
                }
                else if(value.returnType !== this.libtype.std) {
                    throw new Error(`Invalid returned type from ${value.routineName}!`);
                }
            }
        }
        if(type === 'array' || type === 'map') {
            this.template = "undefined" === typeof(template) ? 'scalar' : template;
        }
        this.name = name;
        this.constructValue = value;
        this.value = value;
    }

    get type() {
        return this.libtype.std;
    }

    static valueOf(SEAElement,assign = false,inline = false) {
        const rC = inline === true ? '' : ';\n';
        const assignV = assign === true ? `my \$${SEAElement.name} = ` : '';
        if(SEAElement instanceof Arr || SEAElement instanceof HashMap) {
            return `${assignV}\$${SEAElement.name}->clone()${rC}`;
        }
        else {
            return `${assignV}\$${SEAElement.name}->valueOf()${rC}`;
        }
    }

    static constructorOf(SEAElement,inline = false) {
        if(SEAElement instanceof Primitive === false) {
            throw new TypeError('SEAElement Instanceof primitive is false!');
        }
        const rC = inline === true ? '' : ';\n';
        const value     = SEAElement.constructValue;
        const typeOf    = typeof(value);
        if(value instanceof Primitive) {
            return Primitive.valueOf(value,true,inline);
        }
        else if(value instanceof Routine) {
            const castCall = SEAElement.castScalar === true ? '->valueOf()' : '';
            return value.routineName === 'anonymous' ? 
            `my \$${SEAElement.name} = ${value.toString()}${castCall}` : 
            `my \$${SEAElement.name} = ${value.routineName}()${castCall}${rC}`;
        }
        else if(value instanceof PrimeMethod) {
            return `my \$${SEAElement.name} = ${value.toString()}`;
        }
        else {
            let assignHead = ''; 
            if(SEAElement.name !== 'anonymous') {
                assignHead = `my \$${SEAElement.name} = `;
            }
            if(SEAElement instanceof Str) {
                return `${assignHead}${SEAElement.type}->new("${value}")${rC}`;
            }
            else if(SEAElement instanceof Scalar) {
                if(typeOf === 'string' || typeOf === 'number') {
                    return typeOf === 'string' ? `${assignHead}"${value}"${rC}` : `${assignHead}${value}${rC}`;
                }
                throw new Error('Invalid type for scalar type!');
            }
            else if(SEAElement instanceof Hash) {
                if(typeOf === 'object') {
                    return `${assignHead}${Hash.ObjectToHash(value)}${rC}`;
                }
                throw new Error('Invalid hash type argument!');
            }
            else if(SEAElement instanceof Arr && SEAElement.template !== 'scalar') {
                const primeRef = IPrimeLibrairies.get(SEAElement.template).schema;
                value = value.map( val => {
                    return Primitive.constructorOf(new primeRef(void 0,val),true); 
                });
                return `${assignHead}${SEAElement.type}->new(${value})${rC}`;
            }
            return `${assignHead}${SEAElement.type}->new(${value})${rC}`;
        }
    }

}

/*
 * Primitive Method
 */
class PrimeMethod {

    constructor({name,element,args = []}) {
        this.name = name;
        this.element = element;
        this.args = args.map( val => {
            return val instanceof Primitive ? Primitive.valueOf(val,false,true) : val;
        });
    }

    toString() {
        return `\$${this.element.name}->${this.name}(${this.args.join(',')});\n`;
    }

}

/*
 * String type!
 */
class Str extends Primitive {

    constructor(varName,valueOf) {
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
        super({
            type: 'integer',
            name: varName,
            value: valueOf,
        });
    }

    add(value) {
        if("undefined" === typeof(value)) {
            throw new Error('Undefined value');
        }
        return new PrimeMethod({
            name: 'add',
            args: [value],
            element: this
        });
    }

}

/*
 * Boolean type!
 */
class Bool extends Primitive {

    constructor(varName,valueOf) {
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

    constructor(name,template,value = []) {
        super({
            type: 'array',
            name,
            template,
            value
        });
    }

    get(index) {
        return new PrimeMethod({
            name: 'get',
            args: [index],
            element: this
        });
    }

    size() {
        return new PrimeMethod({
            name: 'size',
            element: this
        });
    }

}

/*
 * Hashmap type!
 */
class HashMap extends Primitive {

    constructor(name,template,value = {}) {
        super({
            type: 'map',
            name,
            template,
            value
        });
    }

}

/*
 * Classical Perl Hash type
 */
class Hash extends Primitive {

    constructor(varName,valueOf) {
        super({
            type: 'hash',
            name: varName,
            value: valueOf,
        });
    }

    static ToFormat(hashStr,tabSize = IDefaultConfiguration.tabSize) {
        const tabSpace = ' '.repeat(tabSize);
        hashStr = hashStr.replace('{','{\n')
        .replace(/([a-zA-Z0-9]+\s*\=\>)/g,function(m) {
            return tabSpace+m;
        })
        .replace(/([};]+)/g,function(m) {
            return `\n${m}`;
        })
        .replace(',',',\n');
        return hashStr;
    }

    static ObjectToHash(object) {
        if(typeof(object) !== 'object') {
            throw new TypeError('Invalid object type!');
        }

        const parseArray = function(arr) {
            arr = arr.map( arrV => {
                const typeOf = typeof(arrV);
                if(arrV instanceof Array) {
                    return parseArray(arrV);
                }
                else if(typeOf === 'object') {
                    return parse(arrV);
                }
                else if(typeOf === 'string') {
                    return `"${arrV}"`;
                }
                else if(typeOf === 'boolean') {
                    return `${arrV === true ? 1 : 0}`;
                }
                else {
                    return arrV.toString();
                }
            });
            return `(${arr.join(',')})`;
        }

        const parse = function(_O) {
            let ret = '{';
            for(let k in _O) {
                const v = _O[k];
                const typeOf = typeof(v);
                if(v instanceof Array) {
                    ret+=`${k} => ${parseArray(v)},`
                }
                else if(typeOf === 'object') {
                    ret+=`${k} => ${parse(v)},`;
                }
                else if(typeOf === 'string') {
                    ret+=`${k} => "${v}",`;
                }
                else if(typeOf === 'boolean') {
                    ret+=`${k} => ${v === true ? 1 : 0},`;
                }
                else {
                    ret+=`${k} => ${v.toString()},`;
                }
            }
            return ret.slice(0,-1)+'}';
        }

        return Hash.ToFormat(parse(object));
    }
    
}

/*
 * Classical Scalar type!
 */
class Scalar extends Primitive {
    constructor(varName,valueOf) {
        super({
            type: 'scalar',
            name: varName,
            value: valueOf,
        });
    }
}

// Define prime scheme
IPrimeLibrairies.set('string',{
    std: 'stdlib::string',
    schema: Str
});

IPrimeLibrairies.set('integer',{
    std: 'stdlib::integer',
    schema: Int
});

IPrimeLibrairies.set('boolean',{
    std: 'stdlib::boolean',
    schema: Bool
});

IPrimeLibrairies.set('array',{
    std: 'stdlib::array',
    schema: Arr
});

IPrimeLibrairies.set('map',{
    std: 'stdlib::hashmap',
    schema: HashMap
});

IPrimeLibrairies.set('hash',{
    std: 'hash',
    schema: Hash
});


IPrimeLibrairies.set('scalar',{
    std: 'scalar',
    schema: Scalar
});



// Export every schema class!
module.exports = {
    File,
    Process,
    Dependency,
    Expr,
    Routine,
    ReturnStatment,
    Condition,
    SIG,
    While,
    Str,
    Int,
    Bool,
    Arr,
    HashMap,
    Hash,
    Scalar,
    Primitive,
    Print
}