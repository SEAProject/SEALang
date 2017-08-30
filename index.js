// Require dependencies
const events = require('events');
const { writeFile } = require('fs');
const { promisify } = require('util');
const { join } = require('path');

// Create async writeFile
const asyncWrite = promisify(writeFile);

/*
 * Interface for Expr.constructor
 * @interface IExprConstructor
 */
const IExprConstructor = {
    addblock: true
};

/*
 * Expr block code (represent a normal expression).
 * @class Expr
 * @extends events
 * 
 * @property {Boolean} closed
 * @property {Boolean} addBlock
 * @property {Boolean} headerDone
 * @property {Array} childrensExpr 
 * @property {Array} elements 
 * @property {Object} scope [
 *     {Map} variables
 *     {Map} routines
 * ]
 * 
 * @events [
 * ]
 */
class Expr extends events {

    /*
     * @constructor
     * @param {IExprConstructor} options
     */
    constructor(options = {}) {
        super();
        Object.assign(this,IExprConstructor,options);
        this.closed = false;
        this.rootExpr = undefined;
        this.headerDone = false;
        this.childrensExpr = [];
        this.elements = [];
        this.scope = {
            variables: new Map(),
            routines: new Map()
        };
    }

    /*
     * set the Expr root
     * @function Expr.setRoot
     * @param {Expr} root
     * @return Self
     */
    setRoot(root) {
        if(root instanceof Expr === false) {
            throw new TypeError('Invalid root variable. Instanceof have to be equal to Expr.');
        }
        this.rootExpr = root;
        return this;
    }

    /*
     * add a new Perl package
     * @function Expr.setPackage
     * @param {String} packageName
     * @return Self
     */
    setPackage(packageName) {
        if(this.isModule === false) {
            throw new Error('Cannot set package on non-module file!');
        }
        packageName = packageName.split('.').join('::');
        this.elements.push(`package ${packageName};\n`);
        return this;
    }

    /*
     * Add a breakline into the perl code
     * @function Expr.breakline
     * @return Self
     */
    breakline() {
        this.elements.push('\n');
        return this;
    }

    /*
     * Add a new element into the Expr stack
     * @function Expr.add
     * @param {Any} element
     * @return Self
     */
    add(element) {
        if(this.closed === true) {
            throw new Error('Expr closed... Impossible to add new element!');
        }

        // When we try to add an undefined value!
        if('undefined' === typeof(element)) return;

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
        const rootDefined = 'undefined' === typeof(element.rootExpr);
        if(element instanceof Dependency) {
            if(this instanceof File === false) {
                throw new TypeError('Cannot add dependency on non-file expr class!');
            }
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
    
    /*
     * if Expr has a variable ! 
     * @function Expr.hasVar
     * @param {String} varName
     * @return Boolean
     */
    hasVar(varName) {
        if('string' !== typeof(varName)) return false;
        return this.scope.variables.has(varName);
    }

    /*
     * if Expr has a routine ! 
     * @function Expr.hasRoutine
     * @param {String} routineName
     * @return Boolean
     */
    hasRoutine(routineName) {
        if('string' !== typeof(routineName)) return false;
        return this.scope.routines.has(routineName);
    }

    /*
     * toString() Expr stack
     * @function Expr.toString
     * @return String
     */
    toString() {
        if(this.elements.length === 0) return '';
        let finalStr = '';
        let i = 0,len = this.elements.length;
        for(;i<len;i++) {
            const element = this.elements[i];
            finalStr = finalStr + typeof(element) === 'string' ? element : element.toString();
        }
        return this.addblock === true ? `{\n${finalStr}};\n` : finalStr;
    }

}

/*
 * Default SEALang Perl package dependencies
 */ 
const FileDefaultDepencies = new Set([
    'strict',
    'warnings',
    'stdlib.util',
    'stdlib.array',
    'stdlib.hashmap',
    'stdlib.integer',
    'stdlib.string',
    'stdlib.boolean'
]);

/*
 * Interface for File.constructor
 * @interface IFileConstructor
 */
const IFileConstructor = {
    isModule: false
};

/*
 * @class File
 * @extend Expr
 * 
 * @property {String} name
 * @property {Boolean} isModule
 */
class File extends Expr {

    /*
     * @constructor
     * @param {IFileConstructor} options
     */
    constructor(options = {}) {
        super({
            addblock: false
        });
        if(typeof (options.name) !== 'string') {
            throw new TypeError('Invalid name type!');
        }
        Object.assign(this,IFileConstructor,options);
        FileDefaultDepencies.forEach( DepName => {
            try {
                this.add(new Dependency(DepName));
            }
            catch(E) {
                console.error(`Failed to add default depency ${DepName}`);
                console.error(E);
            }
        });
        this.headerDone = true;
    }

    /*
     * Format perl code correctly (with the right indentation)
     * @function File.indentCode
     * @param {String} strCode
     * @return String
     */
    indentCode(strCode) {
        if('string' !== typeof(strCode)) {
            throw new TypeError('Invalid type for strCode argument. Should be typeof string');
        }
        let tabSpace = '  ';
        let incre = 0; 
        return strCode.split('\n').map( line => {
            const cIncre = incre;
            let matchClose = false;
            if(line.match(/{/g)) {
                incre++;
            }
            else if(line.match(/}/g)) {
                incre--;
                matchClose = true;
            }
            if(incre === 0) return line;
            return tabSpace.repeat(matchClose ? incre : cIncre)+line;
        }).join('\n');
    }

    /*
     * Write file to string location
     * @function File.write
     * @param {String} strLocation
     * @return void 0
     */
    async write(strLocation) {
        let filecode = super.toString();
        if(this.isModule) {
            filecode += '1;';
        }
        filecode = this.indentCode(filecode);
        console.log(filecode);
        const finalStrPath = join( strLocation, `${this.name}.pl` ); 
        console.log(`Write final final with name => ${finalStrPath}`);
        await asyncWrite(finalStrPath,filecode);
    }

}

/*
 * @class Dependency 
 * 
 * @property {String} value
 */
class Dependency {

    /*
     * @constructor 
     * @param {String} pkgName
     * @param {Array} requiredVars
     */
    constructor(pkgName,requiredVars) {
        if(typeof(pkgName) !== 'string') {
            throw new TypeError('Invalid package type');
        }
        pkgName = pkgName.split('.').join('::');
        const ret = 'undefined' === typeof(requiredVars);
        if(ret === false) {
            if(requiredVars instanceof Array === false) {
                requiredVars = Array.from(requiredVars);
            }
        }
        this.value = ret === true ? `use ${pkgName};\n` : `use ${pkgName} qw(${requiredVars.join(' ')});\n`;
    }

    /*
     * @function Dependency.toString
     * @return String
     */
    toString() {
        return this.value;
    }

}

/*
 * Constructor interface of Routine
 * @interface IRoutineConstructor
 */
const IRoutineConstructor = {
    args: [],
    shifting: false
};

/*
 * Routine elements (Shiting,ReturnStatment and Routine)
 * @class Routine
 * @extends Expr 
 * 
 * @property {String} name
 * @property {String} routineName
 * @property {Boolean} anonymous
 * @property {Boolean} returnStatment
 * @property {Boolean} returnMultiple
 * @property {Any} returnType
 */
class Routine extends Expr {

    /*
     * @constructor
     * @param {IRoutineConstructor} options
     */
    constructor(options = {}) {
        super({});
        options = Object.assign(IRoutineConstructor,options);
        this.anonymous = 'undefined' === typeof(options.name);
        this.name = this.anonymous === true ? '' : name;
        this.routineName = this.anonymous === true ? 'anonymous' : this.name;
        const charCode = this.name.slice(-1).charCodeAt(0);
        if(Number.isNaN(charCode) === false && charCode !== ' '.charCodeAt(0)) {
            this.name+=' ';
        }
        this.returnStatment = false;
        this.returnType = void 0; 
        this.returnMultiple = false;
        try {
            this.add(new RoutineShifting(options.arg,options.shifting));
        }
        catch(E) {
            console.error(`Failed to add routine shifting for routine => ${this.routineName}`);
            console.error(E);
        }
    }

    /*
     * toString() Routine Expr
     * @function Routine.toString
     * @return String
     */
    toString() {
        return `sub ${this.name}`+super.toString();
    }

}

/*
 * Routine Shifting
 * @class RoutineShifting
 * 
 * @property {String} value
 */
class RoutineShifting {

    /*
     * @constructor 
     * @param {Array} variables
     * @param {Boolean} shifting
     */
    constructor(variables,shifting = false) {
        this.value = '';
        if('undefined' === typeof(variables)) {
            throw new TypeError('Cannot shift undefined variables');
        }
        if(variables instanceof Array) {
            if(variables.length > 0) {
                if(shifting === true) {
                    let finalStr = '';
                    variables.forEach( (element) => {
                        const elName = element instanceof Primitive ? `$${element.name}` : '$'+element;
                        finalStr+='my '+elName+' = shift;\n';
                    });
                    this.value = finalStr;
                }
                else {
                    const finalStr = variables.map( (element) => element instanceof Primitive ? `$${element.name}` : '$'+element ).join(',');
                    this.value = `my (${finalStr}) = @_;\n`;
                }
            }
        }
        else {
            const elName = variables instanceof Primitive ? `$${variables.name}` : '$'+variables;
            this.value = 'my '+elName+' = shift;\n';
        }
    }

    /*
     * @function RoutineShifting.toString
     * @return String
     */
    toString() { 
        return this.value;
    }

}

/*
 * Return routine statment!
 * @class ReturnStatment
 * 
 * @property {String} value
 */
class ReturnStatment {

    /*
     * @constructor 
     * @param {Any} expr
     */
    constructor(expr) {
        if('undefined' === typeof(expr)) {
            throw new TypeError('Cannot create a ReturnStatment block with an undefined expr');
        }
        if(expr instanceof Array) {
            this.returnMultiple = true;
            this.returnedType = [];
            const elems = [];
            expr.forEach( (subExpr,index) => {
                if(subExpr instanceof Primitive) {
                    this.returnedType[index] = expr.libtype.std;
                    elems.push(`$${subExpr.name}`);
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
                this.value = expr.name === 'anonymous' ? `return ${Primitive.constructorOf(expr)}` : `return $${expr.name};\n`;
            }
            else {
                this.returnedType = 'any'; 
                this.value = `return ${expr};\n`;
            }
        }
    }

    /*
     * @function ReturnStatment.toString
     * @return String
     */
    toString() {
        return this.value;
    }

}

/*
 * Implementation of Print method
 * @class Print
 * 
 * @property {String} value;
 */
class Print {

    /*
     * @constructor 
     * @param {String} message
     * @param {Boolean} newLine
     */
    constructor(message,newLine = true) {
        if('undefined' === typeof(message)) {
            message = '';
        }
        else if(message instanceof Primitive) {
            message = `$${message.name}->valueOf()`;
        }
        if('string' !== typeof(message)) {
            message = '';
        }
        this.value = `print(${message}."${newLine === true ? '\\n' : ''}");\n`;
    }

    /*
     * toString() print method 
     * @function Print.toString
     * @return String
     */
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
        return 'stdlib::array->new(@ARGV)';
    }
};

/*
 * Condition Enumeration
 * @enum EConditionBlock
 * 
 * @member EConditionBlock.if 
 * @member EConditionBlock.else
 * @member EConditionBlock.elif
 */
const EConditionBlock = new Set(['if','else','elif']);

/*
 * @class Condition
 * @extends Expr 
 * 
 * @property {String} cond
 * @property {String} expr
 */
class Condition extends Expr {

    /*
     * @constructor
     * @param {String} cond
     * @param {String} expr
     */
    constructor(cond,expr) {
        super();
        if(EConditionBlock.has(cond) === false) {
            throw new Error(`Unknown condition type ${cond}!`);
        }
        if('undefined' === typeof(expr)) {
            throw new TypeError('Undefined expr');
        }
        this.cond = cond;
        this.expr = expr instanceof Primitive ? `$${expr.name}->valueOf() == 1` : expr;
        this.expr = this.expr.replace(';','').replace('\n','');
    }

    /*
     * @function Condition.toString
     * @return String
     */
    toString() {
        return `${this.cond} (${this.expr}) `+super.toString();
    }

}

/*
 * Classical While (only for SEA.Array and maybe array late)
 * @class While
 * @extends Expr 
 * 
 * @property {Expr} _inner
 * @property {SEA.Int} incre
 */
class While extends Expr {

    /*
     * @constructor 
     * @param {SEA.Array} SEAArray
     */
    constructor(SEAArray) {
        super();
        if(SEAArray instanceof Arr === false) {
            throw new TypeError('Unsupported element type for a while block. Must be a SEA.Array');
        }
        this._inner = new Expr();
        this.setRoot(this._inner);
        this.incre = new Int('i',0);
        this._inner.add(this.incre);
        this._inner.add(new Int('len',SEAArray.size()));
        const PrimeRef = IPrimeLibrairies.get(SEAArray.template).schema;
        this.add(new PrimeRef('element',SEAArray.get(this.incre)));
    }

    /*
     * @function While.toString
     * @return String
     */
    toString() {
        this.add(this.incre.add(1));
        this._inner.add(`while($i < $len) ${super.toString()}`);
        return this._inner.toString();
    }

}

/*
 * Foreach block Expr (for HashMap or Hash)
 * @class Foreach
 * @extends Expr
 */
class Foreach extends Expr {

    /*
     * @constructor
     * @param {SEA.HashMap} SEAHash
     */
    constructor(SEAHash) {
        super();
        if(SEAHash instanceof HashMap === false) {
            throw new TypeError('Unsupported type for Foreach block!');
        }
    }

    /*
     * @function Foreach.toString
     * @return String
     */
    toString() {

    }

}

/*
 * Evaluation (try/catch emulation)
 * @class Evaluation
 * @extends Expr 
 * 
 * @property {Condition} catchExpr
 */
class Evaluation extends Expr {

    /*
     * @constructor
     */
    constructor() {
        super();
        try {
            this.catchExpr = new Condition('if','$@');
            this.catchExpr.add(new Print('$@',true));
        }
        catch(E) {
            console.error('Failed to create catch Expr Condition for Evaluation');
            console.error(E);
        }
    }

    /*
     * @getter Evaluation.catch
     * @return Self.catchExpr
     */
    get catch() {
        return this.catchExpr;
    }

    /*
     * @function Evaluation.toString
     * @return String
     */
    toString() {
        return 'eval '+super.toString()+this.catchExpr.toString();
    }

}

/*
 * Enum SIG Event handler
 * @enum EAvailableSIG
 */
const EAvailableSIG = new Set([
    'CHLD',
    'DIE',
    'INT',
    'ALRM',
    'HUP'
]);

/*
 * @class SIG
 * 
 * @property {String} code
 * @property {Routine} routine
 */
class SIG {

    /*
     * constructor
     * @param {String} code
     * @param {Routine} routineHandler
     */
    constructor(code,routineHandler) {
        if(EAvailableSIG.has(code) === false) {
            throw new RangeError(`Invalid SIG ${code}!`);
        }
        if(routineHandler instanceof Routine === false) {
            throw new TypeError('routine should be instanceof Routine');
        }
        this.code = code;
        this.routine = routineHandler;
    }

    /*
     * @function SIG.toString
     * @return String
     */
    toString() {
        return `$SIG{${this.code}} = `+this.routine.toString();
    }

}

/*
------------------------
    PRIMITIVE TYPES
------------------------
*/
const IPrimeLibrairies = new Map();
const IPrimeScalarCast = new Set(['stdlib::integer','stdlib::string','stdlib::boolean']);

/*
 * Primitive abstraction handler
 * @class Primitive
 * 
 * @property {String} libType
 * @property {String} name
 * @property {Boolean} castScalar
 * @property {String} constructValue
 * @property {String} value
 * @property {String} template
 */
class Primitive {

    /*
     * @constructor
     */
    constructor({type,name,template,value = 'undef'}) {
        if('undefined' === typeof(name)) {
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
            this.template = 'undefined' === typeof(template) ? 'scalar' : template;
        }
        this.name = name;
        this.constructValue = value;
        this.value = value;
    }

    /*
     * @function Primitive.method
     * @param {String} name
     * @param {...<any>} args
     * @return PrimeMethod
     */
    method(name,...args) {
        return new PrimeMethod({
            name,
            args,
            element: this
        });
    }

    /*
     * Get libtype type
     * @getter Primitive.type
     * @return String
     */
    get type() {
        return this.libtype.std;
    }

    /*
     * @static Primitive.valueOf
     * @param {instanceof Primitive} SEAElement
     * @param {Boolean} assign
     * @param {Boolean} inline
     * @return String
     */
    static valueOf(SEAElement,assign = false,inline = false) {
        const rC = inline === true ? '' : ';\n';
        const assignV = assign === true ? `my $${SEAElement.name} = ` : '';
        if(SEAElement instanceof Arr === true || SEAElement instanceof HashMap === true) {
            return `${assignV}$${SEAElement.name}->clone()${rC}`;
        }
        else {
            return `${assignV}$${SEAElement.name}->valueOf()${rC}`;
        }
    }

    /*
     * @static Primitive.constructorOf
     * @param {Any} SEAElement
     * @param {Boolean} inline
     * @return String
     */
    static constructorOf(SEAElement,inline = false) {
        if(SEAElement instanceof Primitive === false) {
            throw new TypeError('SEAElement Instanceof primitive is false!');
        }
        const rC = inline === true ? '' : ';\n';
        let value       = SEAElement.constructValue;
        const typeOf    = typeof(value);
        if(value instanceof Primitive === true) {
            return Primitive.valueOf(value,true,inline);
        }
        else if(value instanceof Routine === true) {
            const castCall = SEAElement.castScalar === true ? '->valueOf()' : '';
            return value.routineName === 'anonymous' ? 
            `my $${SEAElement.name} = ${value.toString()}${castCall}` : 
            `my $${SEAElement.name} = ${value.routineName}()${castCall}${rC}`;
        }
        else if(value instanceof PrimeMethod === true) {
            return `my $${SEAElement.name} = ${value.toString()}`;
        }
        else {
            let assignHead = ''; 
            if(SEAElement.name !== 'anonymous') {
                assignHead = `my $${SEAElement.name} = `;
            }
            if(SEAElement instanceof Str === true) {
                return `${assignHead}${SEAElement.type}->new("${value}")${rC}`;
            }
            else if(SEAElement instanceof Scalar === true) {
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
            else if(SEAElement instanceof HashMap === true) {
                if(SEAElement.template !== 'scalar') {
                    const primeRef = IPrimeLibrairies.get(SEAElement.template).schema;
                    for(let [k,v] of Object.entries(value)) {
                        value[k] = Primitive.constructorOf(new primeRef(void 0,v),true);
                    }
                }
                return `${assignHead}${SEAElement.type}->new(${Hash.ObjectToHash(value)})${rC}`;
            }
            else if(SEAElement instanceof Arr === true && SEAElement.template !== 'scalar') {
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
 * @class PrimeMehthod
 */
class PrimeMethod {

    /*
     * @constructor
     */
    constructor({name,element,args = []}) {
        if('string' !== typeof(name)) {
            throw new TypeError('name argument should be typeof string');
        }
        this.name = name;
        this.element = element;
        this.args = args.map( val => {
            return val instanceof Primitive ? Primitive.valueOf(val,false,true) : val;
        });
    }

    /*
     * @function PrimeMethod.toString
     * @return String
     */ 
    toString() {
        return `$${this.element.name}->${this.name}(${this.args.join(',')});\n`;
    }

}

/*
 * SEA String
 * @class Str
 * @extends Primitive
 */
class Str extends Primitive {

    /*
     * @constructor
     * @param {String} varName
     * @param {String} valueOf
     */
    constructor(varName,valueOf) {
        super({
            type: 'string',
            name: varName,
            value: valueOf,
        });
    }

    valueOf() {
        return this.method('valueOf');
    }

    freeze() {
        return this.method('freeze');
    }

    length() {
        return this.method('length');
    }

    isEqual(element) {
        if('undefined' === typeof(element)) {
            throw new Error('Undefined element');
        }
        return this.method('isEqual',element);
    }

    substr(start,end) {
        return this.method('substr',start,end);
    }

    clone() {
        return this.method('clone');
    }

    slice(start,end) {
        return this.method('slice',start,end);
    }

    last() {
        return this.method('last');
    }

    charAt(index) {
        return this.method('charAt',index);
    }

    charCodeAt(index) {
        return this.method('charCodeAt',index);
    }

    repeat(count) {
        if('undefined' === typeof(count)) {
            count = 1;
        }
        return this.method('repeat',count);
    }

    constains(substring) {
        return this.method('contains',substring);
    }

    containsRight(substring) {
        return this.method('containsRight',substring);
    }

    split(carac) {
        return this.method('split',carac);
    }

    trim() {
        return this.method('trim');
    }

    trimLeft() {
        return this.method('trimLeft');
    }

    trimRight() {
        return this.method('trimRight');
    }

    toLowerCase() {
        return this.method('toLowerCase');
    }

    toUpperCase() {
        return this.method('toUpperCase');
    }

}

/*
 * SEA Integer
 * @class Int
 * @extends Primitive
 */
class Int extends Primitive {

    /*
     * @constructor
     * @param {String} varName
     * @param {String} valueOf
     */
    constructor(varName,valueOf) {
        super({
            type: 'integer',
            name: varName,
            value: valueOf,
        });
    }

    valueOf() {
        return this.method('valueOf');
    }

    freeze() {
        return this.method('freeze');
    }

    length() {
        return this.method('length');
    }

    add(value) {
        if('undefined' === typeof(value)) {
            throw new Error('Undefined value');
        }
        return this.method('add',value);
    }

    sub(value) {
        if('undefined' === typeof(value)) {
            throw new Error('Undefined value');
        }
        return this.method('sub',value);
    }

    mul(value) {
        if('undefined' === typeof(value)) {
            throw new Error('Undefined value');
        }
        return this.method('mul',value);
    }

    div(value) {
        if('undefined' === typeof(value)) {
            throw new Error('Undefined value');
        }
        return this.method('div',value);
    }

}

/*
 * SEA Boolean
 * @class Bool
 * @extends Primitive
 */
class Bool extends Primitive {

    /*
     * @constructor
     * @param {String} varName
     * @param {String} valueOf
     */
    constructor(varName,valueOf) {
        super({
            type: 'boolean',
            name: varName,
            value: valueOf ? 1 : 0,
        });
    }

    // @PrimeMethod Bool.valueOf
    valueOf() {
        return this.method('valueOf');
    }

}

/*
 * SEA Array
 * @class Arr
 * @extends Primitive
 */
class Arr extends Primitive {

    /*
     * @constructor
     * @param {String} name
     * @param {String} template
     * @param {Array} value
     */
    constructor(name,template,value = []) {
        super({
            type: 'array',
            name,
            template,
            value
        });
    }

    freeze() {
        return this.method('freeze');
    }

    forEach(routine) {
        if(routine instanceof Routine === false) {
            throw new TypeError('Invalid routine type!');
        }
        return this.method('forEach',routine);
    }

    map(routine) {
        if(routine instanceof Routine === false) {
            throw new TypeError('Invalid routine type!');
        }
        return this.method('map',routine);
    }

    every(routine) {
        if(routine instanceof Routine === false) {
            throw new TypeError('Invalid routine type!');
        }
        return this.method('every',routine);
    }

    get(index) {
        if('undefined' === typeof(index)) {
            throw new Error('Undefined index argument');
        }
        return this.method('get',index);
    }

    size() {
        return this.method('size');
    }

}

/*
 * SEA HashMap
 * @class HashMap
 * @extends Primitive
 */
class HashMap extends Primitive {

    /*
     * @constructor
     * @param {String} name
     * @param {String} template
     * @param {Array} value
     */
    constructor(name,template,value = {}) {
        super({
            type: 'map',
            name,
            template,
            value
        });
    }

    freeze() {
        return this.method('freeze');
    }

    clear() {
        return this.method('clear');
    }

    keys() {
        return this.method('keys');
    }

    values() {
        return this.method('values');
    }

    forEach(routine) {
        if(routine instanceof Routine === false) {
            throw new TypeError('Invalid routine type!');
        }
        return this.method('forEach',routine);
    }

    size() {
        return this.method('size');
    }

    get(value) {
        return this.method('get',value);
    }

    set(key,value) {
        return this.method('set',key,value);
    }

    delete(key) {
        if('undefined' === typeof(key)) {
            throw new TypeError('Undefined key!');
        }
        return this.method('delete',key);
    }

}

/*
 * SEA Fallback implementation of Perl Hash
 * @class Hash
 * @extends Primitive
 */
class Hash extends Primitive {

    /*
     * @constructor
     * @param {String} varName
     * @param {String} valueOf
     */
    constructor(varName,valueOf) {
        super({
            type: 'hash',
            name: varName,
            value: valueOf,
        });
    }

    /*
     * Transform a JS Object into a Perl Hash
     * 
     * @static Hash.ObjectToHash
     * @param {Object} object
     * @return String
     */
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
        };

        const parse = function(_O) {
            let ret = '{';
            for(let k in _O) {
                const v = _O[k];
                const typeOf = typeof(v);
                if(v instanceof Array) {
                    ret+=`${k} => ${parseArray(v)},`;
                }
                else if(typeOf === 'object') {
                    ret+=`${k} => ${parse(v)},`;
                }
                else if(typeOf === 'string') {
                    ret+=`${k} => ${v},`;
                }
                else if(typeOf === 'boolean') {
                    ret+=`${k} => ${v === true ? 1 : 0},`;
                }
                else {
                    ret+=`${k} => ${v.toString()},`;
                }
            }
            return ret.slice(0,-1)+'}';
        };

        return parse(object);
    }
    
}

/*
 * SEA Fallback implementation of Perl Scalar
 * @class Scalar
 * @extends Primitive
 */
class Scalar extends Primitive {

    /*
     * @constructor
     * @param {String} varName
     * @param {String} valueOf
     */
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
    Foreach,
    Print,
    Primitive,
    Hash,
    HashMap,
    Str,
    Int,
    Bool,
    Arr,
    Scalar,
    PrimeMethod,
    Evaluation
};