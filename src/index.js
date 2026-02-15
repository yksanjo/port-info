#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const SERVICE_MAP = {
  20: 'FTP Data',
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  143: 'IMAP',
  443: 'HTTPS',
  465: 'SMTPS',
  587: 'SMTP Submission',
  993: 'IMAPS',
  995: 'POP3S',
  1433: 'MSSQL',
  1521: 'Oracle',
  3000: 'Dev Server',
  3001: 'Dev Server',
  3306: 'MySQL',
  3389: 'RDP',
  4200: 'Angular',
  5000: 'Flask/ASP.NET',
  5173: 'Vite',
  5432: 'PostgreSQL',
  5500: 'Live Server',
  6379: 'Redis',
  8000: 'Django',
  8080: 'HTTP Proxy',
  8443: 'HTTPS Alt',
  8888: 'Jupyter',
  9000: 'PHP-FPM',
  9200: 'Elasticsearch',
  27017: 'MongoDB'
};

const program = new Command();

program
  .name('port-info')
  .description('Get detailed information about ports including process info, connections, and network details')
  .version('1.0.0');

/**
 * Get detailed port information
 */
async function getPortDetails(port) {
  const details = {
    port: parseInt(port),
    service: SERVICE_MAP[port] || 'Unknown',
    inUse: false,
    processes: []
  };

  try {
    // Get lsof info
    const { stdout } = await execPromise(`lsof -i :${port} -P -n 2>/dev/null`);
    const lines = stdout.trim().split('\n').filter(l => l);
    
    if (lines.length > 0) {
      details.inUse = true;
      
      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length >= 9) {
          details.processes.push({
            command: parts[0],
            pid: parts[1],
            user: parts[2],
            fd: parts[3],
            type: parts[4],
            device: parts[5],
            size: parts[6],
            node: parts[7],
            name: parts[8]
          });
        }
      }
    }
  } catch (error) {
    // Port might not be in use
  }

  return details;
}

/**
 * Get process tree info
 */
async function getProcessTree(pid) {
  try {
    const { stdout } = await execPromise(`ps -o pid,ppid,comm= -p ${pid}`);
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Get network connections for process
 */
async function getProcessConnections(pid) {
  try {
    const { stdout } = await execPromise(`lsof -i -a -p ${pid} 2>/dev/null`);
    return stdout.trim().split('\n').slice(1).map(l => l.trim());
  } catch {
    return [];
  }
}

program
  .command('info')
  .description('Get detailed info about a port')
  .argument('<port>', 'Port number')
  .option('-j, --json', 'Output as JSON')
  .action(async (port, options) => {
    const details = await getPortDetails(port);
    
    if (options.json) {
      console.log(JSON.stringify(details, null, 2));
      return;
    }
    
    console.log(chalk.blue.bold(`\n📋 Port ${port} Information\n`));
    console.log(chalk.gray('═'.repeat(50)));
    
    console.log(chalk.gray('  Service: ') + chalk.cyan(details.service));
    console.log(chalk.gray('  Status: ') + (details.inUse ? chalk.green('IN USE') : chalk.yellow('AVAILABLE')));
    
    if (details.inUse && details.processes.length > 0) {
      console.log(chalk.gray('\n  Process(es):\n'));
      
      for (const proc of details.processes) {
        console.log(chalk.cyan(`    ${proc.command}`));
        console.log(chalk.gray(`      PID: ${proc.pid}`));
        console.log(chalk.gray(`      User: ${proc.user}`));
        console.log(chalk.gray(`      FD: ${proc.fd}`));
        console.log(chalk.gray(`      Type: ${proc.type}`));
        console.log(chalk.gray(`      Name: ${proc.name}`));
        console.log();
      }
    }
    
    console.log(chalk.gray('═'.repeat(50)));
    console.log();
  });

program
  .command('whatis')
  .description('Quick lookup what is using a port')
  .argument('<port>', 'Port number')
  .action(async (port) => {
    const details = await getPortDetails(port);
    
    if (!details.inUse) {
      console.log(chalk.green(`Port ${port} is available`));
      return;
    }
    
    console.log(chalk.blue.bold(`\n🔍 Port ${port} is used by:\n`));
    
    for (const proc of details.processes) {
      console.log(chalk.cyan(`  ${proc.command}`) + chalk.gray(` (PID: ${proc.pid})`));
      console.log(chalk.gray(`    User: ${proc.user}`));
      console.log(chalk.gray(`    ${proc.name}`));
      console.log();
    }
  });

program
  .command('process')
  .description('Get detailed process information')
  .argument('<port>', 'Port number')
  .action(async (port) => {
    const details = await getPortDetails(port);
    
    if (!details.inUse || details.processes.length === 0) {
      console.log(chalk.yellow(`\nNo process found on port ${port}\n`));
      return;
    }
    
    const proc = details.processes[0];
    
    console.log(chalk.blue.bold(`\n📊 Process Details for Port ${port}\n`));
    console.log(chalk.gray('═'.repeat(50)));
    
    console.log(chalk.gray('  Command: ') + chalk.cyan(proc.command));
    console.log(chalk.gray('  PID: ') + chalk.yellow(proc.pid));
    console.log(chalk.gray('  User: ') + proc.user);
    console.log(chalk.gray('  File Descriptor: ') + proc.fd);
    console.log(chalk.gray('  Type: ') + proc.type);
    console.log(chalk.gray('  Device: ') + proc.device);
    console.log(chalk.gray('  Node: ') + proc.node);
    console.log(chalk.gray('  Name: ') + proc.name);
    
    // Get process tree
    const tree = await getProcessTree(proc.pid);
    if (tree) {
      console.log(chalk.gray('\n  Process Tree:'));
      console.log(chalk.gray('  ' + tree));
    }
    
    // Get connections
    const connections = await getProcessConnections(proc.pid);
    if (connections.length > 0) {
      console.log(chalk.gray('\n  Network Connections:'));
      for (const conn of connections.slice(0, 5)) {
        console.log(chalk.gray('    ' + conn));
      }
    }
    
    console.log(chalk.gray('═'.repeat(50)));
    console.log();
  });

program
  .command('service')
  .description('Lookup common port services')
  .argument('<port>', 'Port number')
  .action(async (port) => {
    const portNum = parseInt(port);
    const service = SERVICE_MAP[portNum];
    
    console.log(chalk.blue.bold(`\n🔌 Port Service Lookup: ${port}\n`));
    console.log(chalk.gray('═'.repeat(50)));
    
    if (service) {
      console.log(chalk.cyan('  Known Service: ') + chalk.green(service));
    } else {
      console.log(chalk.yellow('  Unknown service'));
    }
    
    console.log(chalk.gray('\n  Port Range Info:'));
    if (portNum < 1024) {
      console.log(chalk.gray('  ') + chalk.yellow('Well-known port (0-1023)'));
      console.log(chalk.gray('    Requires root/sudo'));
    } else if (portNum < 49152) {
      console.log(chalk.gray('  ') + chalk.yellow('Registered port (1024-49151)'));
      console.log(chalk.gray('    Registered with IANA'));
    } else {
      console.log(chalk.gray('  ') + chalk.yellow('Dynamic port (49152-65535)'));
      console.log(chalk.gray('    Used for ephemeral ports'));
    }
    
    console.log(chalk.gray('═'.repeat(50)));
    console.log();
  });

program
  .command('all')
  .description('List all listening ports with details')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      const { stdout } = await execPromise('lsof -i -P -n | grep LISTEN');
      const lines = stdout.trim().split('\n').filter(l => l);
      
      const ports = [];
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const match = line.match(/:(\d+)\s/);
        if (match && parts.length >= 2) {
          ports.push({
            port: parseInt(match[1]),
            command: parts[0],
            pid: parts[1],
            user: parts[2],
            name: line.match(/\s(\S+)\s*\(LISTEN\)/)?.[1] || ''
          });
        }
      }
      
      if (options.json) {
        console.log(JSON.stringify(ports, null, 2));
        return;
      }
      
      console.log(chalk.blue.bold('\n📡 All Listening Ports\n'));
      console.log(chalk.gray('═'.repeat(70)));
      console.log(' Port     PID       User       Command        Service');
      console.log(chalk.gray('─'.repeat(70)));
      
      for (const p of ports) {
        const port = String(p.port).padEnd(8);
        const pid = String(p.pid).padEnd(9);
        const user = p.user.substring(0, 10).padEnd(10);
        const cmd = p.command.substring(0, 14).padEnd(14);
        const service = SERVICE_MAP[p.port] || '-';
        
        console.log(` ${chalk.cyan(port)} ${chalk.yellow(pid)} ${user} ${cmd} ${chalk.green(service)}`);
      }
      
      console.log(chalk.gray('─'.repeat(70)));
      console.log(chalk.green(`   Total: ${ports.length} port(s)\n`));
      
    } catch (error) {
      console.log(chalk.yellow('No listening ports found'));
    }
  });

program.parse();
