const express = require('express');
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const validateToken = require('./middlewares/validateToken');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');


//Initialize app
const PORT = process.env.CODE_EXEC_SERVICE_PORT || 3003;
const app = express();


//Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(validateToken);

const tempDir = path.join(__dirname, 'temp');
fs.ensureDirSync(tempDir);

app.use('/api/code/execute', async (req, res)=>{
    const { language, code, input } = req.body;

    if(!language || !code) {
        return res.status(400).json({success: false, message: "Language and code are required"})
    }

    const executionId = uuidv4();
    const executionDir = path.join(tempDir, executionId);

    try {
        fs.ensureDirSync(executionDir);
        let result;
        switch(language.toLowerCase()){
            case 'c++': 
                result = await executeCpp(executionDir, code, input);
                break;
            default:
                throw new Error(`Unsupported language: ${language}`);
        }
        res.json(result);
    } catch (error) {
        console.error(`Execution error: ${error.message}`);
        res.status(500).json({ success:false, message: error.message });
    } finally {
        try {
            setTimeout(() => fs.remove(executionDir), 1000);
        } catch (err) {
            console.error(`Failed to remove temp directory: ${err.message}`);
        }
    }
})

async function executeCpp(dir, code, input) {
    const codeFile = path.join(dir, 'main.cpp');
    await fs.writeFile(codeFile, code);
    
    if (input) {
      const inputFile = path.join(dir, 'input.txt');
      await fs.writeFile(inputFile, input);
    }
    
    const normalizedDir = dir.replace(/\\/g, '/');
    
    return new Promise((resolve, reject) => {
      const compileCmd = `docker run --rm -v "${normalizedDir}:/code" gcc:latest bash -c "cd /code && g++ -std=c++17 main.cpp -o program"`;
      
      exec(compileCmd, (compileErr, compileStdout, compileStderr) => {
        if (compileErr) {
          return resolve({
            success: false,
            stage: 'compilation',
            output: '',
            error: compileStderr || 'Compilation failed'
          });
        }
        
        const inputRedirect = input ? '< input.txt' : '';
        const runCmd = `docker run --rm --network none --memory=100m --cpus=0.5 -v "${normalizedDir}:/code" gcc:latest bash -c "cd /code && timeout 5s ./program ${inputRedirect}"`;
        
        exec(runCmd, { timeout: 8000 }, (runErr, runStdout, runStderr) => {
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
      });
    });
  }

app.listen(PORT, ()=>{
    console.log(`Code Execution Service is running on http://localhost:${PORT}`);
})