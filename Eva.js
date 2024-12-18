const assert = require('assert');
const Environment = require('./Environment');
const testUtil = require('./testing/test-util');
const Transformer = require('./transform/Transformer');

class Eva {
    constructor(global = GlobalEnvironment) {
        this.global = global;
        this._transformer = new Transformer();
    }

    evalGlobal(exp) {
        return this._evalBody(exp, this.global);
    }

    eval(exp, env = this.global) {
        if(this._isNumber(exp)) {
            return exp;
        } 

        if(this._isString(exp)) {
            return exp.slice(1, -1);
        }

        if(exp[0] === 'var') {
            const [_, name, value] = exp;
            return env.define(name, this.eval(value, env));
        }

        if(this._isVariableName(exp)) {
            return env.lookup(exp);
        }

        if(exp[0] === 'begin') {
            const blockEnv = new Environment({}, env);
            return this._evalBlock(exp, blockEnv);
        }

        if(exp[0] === 'set') {
            const [_, name, value] = exp;
            return env.assign(name, this.eval(value, env));
        }

        if(exp[0] === 'if') {
            const [_, condition, consequent, alternate] = exp;
            if(this.eval(condition, env)) {
                return this.eval(consequent, env);
            }
            return this.eval(alternate, env);
        }

        if(exp[0] === 'while') {
            const [_, condition, body] = exp;
            let result;
            while(this.eval(condition, env)) {
                result = this.eval(body, env);
            }
            return result;
        }

        if(exp[0] === 'def') {
            const varExp = this._transformer
                .transformDefToVarLambda(exp);

            return this.eval(varExp, env);
        }

        if(exp[0] === 'lambda') {
            const [_, params, body] = exp;
            return {
                params, 
                body, 
                env
            }; 
        }

        if(exp[0] === 'switch') {
            const ifExp = this._transformer
                .transformSwitchToIf(exp);

            return this.eval(ifExp, env);
        }

        if(exp[0] === '--') {
            const setExp = this._transformer
                .transformDecToSet(exp);

            return this.eval(setExp, env);
        }

        if(exp[0] === '++') {
            const setExp = this._transformer
                .transformIncToSet(exp);

            return this.eval(setExp, env);
        }

        if(exp[0] === 'for') {
            const whileExp = this._transformer
                .transformForToWhile(exp);
            
            return this.eval(whileExp, env);
        }

        if(Array.isArray(exp)) {
            const fn = this.eval(exp[0], env);

            const args = exp
                .slice(1)
                .map(arg => this.eval(arg, env));

            if(typeof fn === 'function') {
                return fn(...args);
            }

            const activationRecord = {};

            fn.params.forEach((param, index) => {
                activationRecord[param]  = args[index];
            })

            const activationEnv = new Environment(
                activationRecord, 
                fn.env
            );

            return this._evalBody(fn.body, activationEnv);
        }
        throw "UnimplementedError";
    }

    _evalBody(body, env) {
        if(body[0] === 'begin') {
            return this._evalBlock(body, env);
        }
        return this.eval(body, env);
    }

    _evalBlock(block, env) {
        let result;

        const[_, ...expressions] = block;
        
        expressions.forEach(exp => {
            result = this.eval(exp, env);
        });

        return result;
    }

    _isNumber(exp) {
        return typeof exp  === 'number';
    }

    _isString(exp)  {
        return typeof exp === 'string' && exp[0] === '"' && exp.slice(-1) === '"';
    }

    _isVariableName(exp) {
        return typeof exp === 'string' && /^[+\-*/<>=a-zA-Z][+\-*/<>=a-zA-Z0-9_]*$/.test(exp)
    }
}

const GlobalEnvironment = new Environment({
    null: null, 
    true: true, 
    false: false, 
    VERSION: 0.1, 
    '+'(op1, op2) {
        return op1 + op2;
    }, 
    '-'(op1, op2 = null) {
        if(op2 == null) {
            return -op1;
        }
        return op1 - op2;
    }, 
    '/'(op1, op2) {
        return op1 / op2;
    }, 
    '*'(op1, op2) {
        return op1 * op2;
    }, 
    '>'(op1, op2) {
        return op1 > op2;
    }, 
    '>='(op1, op2) {
        return op1 >= op2;
    }, 
    '<'(op1, op2) {
        return op1 < op2;
    }, 
    '<='(op1, op2) {
        return op1 <= op2;
    }, 
    '='(op1, op2) {
        return op1 === op2;
    }, 
    print(...args) {
        console.log(...args);
    }
});

// const eva = new Eva();

// // Self Assigning
// assert.strictEqual(eva.eval(2), 2);
// assert.strictEqual(eva.eval('"Hello"'), 'Hello');
// // Math Operations
// assert.strictEqual(eva.eval(['+', 1, 2]), 3);
// assert.strictEqual(eva.eval(['+', 5, ['+', 1, 2]]), 8);
// assert.strictEqual(eva.eval(['-', 1, 2]), -1);
// assert.strictEqual(eva.eval(['*', 2, 2]), 4);
// assert.strictEqual(eva.eval(['/', 6, 2]), 3);
// // Variables
// assert.strictEqual(eva.eval(['var', 'x', 10]), 10);
// assert.strictEqual(eva.eval('x'), 10);
// assert.strictEqual(eva.eval('VERSION'), 0.1)
// assert.strictEqual(eva.eval(['var', 'y', "true"]), true);
// assert.strictEqual(eva.eval(['var', 'z', ['*', 5, 5]]), 25);
// assert.strictEqual(eva.eval('z'), 25);
// // Blocks
// assert.strictEqual(eva.eval(
//     ['begin', 
//         ['var', 'x', 10], 
//         ['var', 'y', 20],
//         ['+', ['*', 'x', 'y'], 30]
//     ]
// ), 230);
// assert.strictEqual(eva.eval(
//     ['begin', 
//         ['var', 'x', 10], 
//         ['begin', 
//             ['var', 'x', 20],
//             'x'
//         ], 
//         'x'
//     ]
// ), 10);
// assert.strictEqual(eva.eval(
//     ['begin', 
//         ['var', 'x', 10], 
//         ['begin', 
//             ['var', 'y', 20],
//             'x'
//         ]
//     ]
// ), 10);
// assert.strictEqual(eva.eval(
//     ['begin', 
//         ['var', 'x', 10], 
//         ['begin', 
//             ['set', 'x', 20]
//         ],
//         'x'
//     ]
// ), 20);
// // If Else
// assert.strictEqual(eva.eval(
//     ['begin', 
//         ['var', 'x', 10], 
//         ['if', ['>', 'x', 5], 
//             'true', 
//             'else'
//         ]
//     ]
// ), true);
// // While 
// assert.strictEqual(eva.eval(
//     ['begin', 
//         ['var', 'x', 0], 
//         ['while', ['<=', 'x', 10], 
//             ['set', 'x', ['+', 'x', 1]]
//         ], 
//         'x'
//     ]
// ), 11);
// // Parser
// testUtil.test(eva, 
//     `
//     (begin
//         (var x 10)
//         (var y 20)
//         (+ (* x 10) y)
//     )
//     `, 
//     120
// );
// // Built-in Functions
// testUtil.test(eva, 
//     `
//     (print "Hello" "World")
//     `
// )
// // User-Defined Functions
// testUtil.test(eva, 
//     `
//     (begin
//         (def square (x)
//             (* x x)
//         )
//         (print (square 2))
//     )
//     `
// );
// testUtil.test(eva, 
//     `
//     (begin
//         (def add (x y)
//             (+ x y)
//         )
//         (print (add 2 4))
//     )
//     `
// );
// // Lambda Functions
// testUtil.test(eva, 
//     `
//     (begin 
//         (def onClick (callback)
//             (begin
//                 (var x 10)
//                 (var y 20)
//                 (callback (+ x y))
//             )
//         )
//         (onClick(lambda (data) (* data 10)))
//     )
//     `,
//     300
// )
// testUtil.test(eva, 
//     `
//     ((lambda (x) (* x x)) 2)
//     `, 
//     4
// )
// // Switch Statements
// testUtil.test(eva, 
//     `
//     (begin 
//         (var x 10)
//         (switch ((= x 10) 100)
//                 ((> x 10) 200)
//                 (else 300)
        
//         ) 
//     )
//     `, 
//     100
// );
// // Increment / Decrement 
// testUtil.test(eva, 
//     `
//     (begin 
//         (var x 10)
//         (++ x)
//         x
//     )
//     `, 
//     11
// );
// testUtil.test(eva, 
//     `
//     (begin 
//         (var x 10)
//         (-- x)
//         x
//     )
//     `, 
//     9
// )
// // For Statements
// testUtil.test(eva, 
//     `
//     (for (var x 10) (> x 0) (-- x) x)
//     `,
//     0
// )

// console.log("All Assertions Passed!");

module.exports = Eva;