const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Check if HTML report exists
const reportPath = path.join(__dirname, 'test-report.html');
const liveReportPath = path.join(__dirname, 'live-test-report.html');

if (fs.existsSync(liveReportPath)) {
  console.log('🌐 Opening live test report...');
  openFile(liveReportPath);
} else if (fs.existsSync(reportPath)) {
  console.log('🌐 Opening static test report...');
  openFile(reportPath);
} else {
  console.log('❌ No test report found. Run "npm run test:report" first.');
}

function openFile(filePath) {
  const platform = process.platform;
  let command;
  
  switch (platform) {
    case 'win32':
      command = `start "" "${filePath}"`;
      break;
    case 'darwin':
      command = `open "${filePath}"`;
      break;
    case 'linux':
      command = `xdg-open "${filePath}"`;
      break;
    default:
      console.log(`Please open the file manually: ${filePath}`);
      return;
  }
  
  exec(command, (error) => {
    if (error) {
      console.log(`❌ Error opening file: ${error.message}`);
      console.log(`📄 Please open manually: ${filePath}`);
    } else {
      console.log('✅ Report opened in your default browser!');
    }
  });
}

