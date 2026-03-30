/**
 * Generates a random math challenge.
 * @returns {Object} { question: string, answer: string }
 */
function generateMath() {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, answer;

    if (op === '*') {
        a = Math.floor(Math.random() * 12) + 1;
        b = Math.floor(Math.random() * 12) + 1;
    } else {
        a = Math.floor(Math.random() * 50) + 1;
        b = Math.floor(Math.random() * 50) + 1;
    }

    if (op === '+') answer = a + b;
    if (op === '-') answer = a - b;
    if (op === '*') answer = a * b;

    return { 
        question: `${a} ${op} ${b} = ?`, 
        answer: answer.toString() 
    };
}

module.exports = { generateMath };
