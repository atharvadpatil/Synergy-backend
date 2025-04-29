const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4 : uuidv4 } = require('uuid');

exports.handler = async (event) => {
    const { language, code, input } = JSON.parse(event.body);

    const jobId = uuidv4();
    const tempDir = `/tmp/${jobId}`;
    fs.mkdirSync(tempDir, { recursive: true });

    let sourceFile, compileCommand, runCommand;

    switch (language) {
        case 'cpp':
            sourceFile = 'main.cpp';
            compileCommand = `g++ ${sourceFile} -o main.out`;
            runCommand = `./main.out`;
            break;
        case 'c':
            sourceFile = 'main.c';
            compileCommand = `gcc ${sourceFile} -o main.out`;
            runCommand = `./main.out`;
            break;
        case 'java':
            sourceFile = 'Main.java';
            compileCommand = `javac ${sourceFile}`;
            runCommand = `java Main`;
            break;
        case 'python':
            sourceFile = 'main.py';
            runCommand = `python3 ${sourceFile}`;
            break;
        default:
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Unsupported language' }),
            };
    }

    const sourcePath = path.join(tempDir, sourceFile);
    fs.writeFileSync(sourcePath, code);

    try {
        const result = await executeCode(tempDir, input, compileCommand, runCommand);

        cleanUp(tempDir);

        return {
            statusCode: 200,
            body: JSON.stringify({ result }),
        };
    } catch (error) {
        cleanUp(tempDir);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.toString() }),
        };
    }
};

async function executeCode(tempDir, input, compileCommand, runCommand) {
    return new Promise((resolve, reject) => {
        const compileAndRun = () => {
            const process = exec(runCommand, { cwd: tempDir, timeout: 5000 }, (runErr, runStdout, runStderr) => {
                if (runErr && runErr.killed) {
                    return resolve({
                        success: false,
                        stage: 'execution',
                        output: '',
                        error: 'Execution timed out'
                    });
                }

                resolve({
                    success: !runErr,
                    stage: 'execution',
                    output: runStdout,
                    error: runStderr
                });
            });

            if (input) {
                process.stdin.write(input);
                process.stdin.end();
            }
        };

        if (compileCommand) {
            exec(compileCommand, { cwd: tempDir, timeout: 5000 }, (compileErr, compileStdout, compileStderr) => {
                if (compileErr) {
                    return resolve({
                        success: false,
                        stage: 'compilation',
                        output: '',
                        error: compileStderr || 'Compilation failed'
                    });
                }
                compileAndRun();
            });
        } else {
            compileAndRun();
        }
    });
}

function cleanUp(tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
}