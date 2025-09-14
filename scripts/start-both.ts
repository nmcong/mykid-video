import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import path from 'node:path';

type ProcSpec = {
  name: string;
  cwd: string;
  env?: Record<string, string | undefined>;
  args?: string[];
};

function startProcess({ name, cwd, env, args = [] }: ProcSpec) {
  const workingDir = path.isAbsolute(cwd) ? cwd : path.resolve(process.cwd(), cwd);
  const useShell = process.platform === 'win32';
  const child = spawn('npm', ['run', 'start', ...args], {
    cwd: workingDir,
    env: { ...(process.env as NodeJS.ProcessEnv), ...(env as NodeJS.ProcessEnv) },
    shell: useShell,
  });

  const prefix = `[${name}]`;
  const rlOut = createInterface({ input: child.stdout });
  const rlErr = createInterface({ input: child.stderr });
  rlOut.on('line', (line: string) => console.log(`${prefix} ${line}`));
  rlErr.on('line', (line: string) => console.error(`${prefix} ${line}`));

  child.on('error', (err: Error) => {
    console.error(`${prefix} failed to start:`, err);
  });

  child.on('close', (code: number | null) => {
    console.log(`${prefix} exited with code ${code}`);
  });

  return child;
}


// Choose distinct ports for Expo Metro bundlers
const clientPort = process.env.CLIENT_PORT || '19000';
const controlPort = process.env.CONTROL_PORT || '19010';

// Forward platform flags from CLI to Expo (e.g., --android, --ios, --web)
const allowedPlatformFlags = new Set(['--android', '--ios', '--web']);
const platformFlags = process.argv.slice(2).filter((flag) => allowedPlatformFlags.has(flag));

// Expo respects EXPO_DEVTOOLS_LISTEN_ADDRESS/EXPO_SERVER_PORT via CLI flags.
// We'll pass ports using --port.
const processes = [
  startProcess({
    name: 'client',
    cwd: 'mykid-video-client',
    env: { EXPO_PUBLIC_WS_URL: process.env.EXPO_PUBLIC_WS_URL },
    args: ['--', ...platformFlags, '--port', String(clientPort)],
  }),
  startProcess({
    name: 'control',
    cwd: 'mykid-video-control',
    env: { EXPO_PUBLIC_WS_URL: process.env.EXPO_PUBLIC_WS_URL },
    args: ['--', ...platformFlags, '--port', String(controlPort)],
  }),
];

function shutdown() {
  for (const proc of processes) {
    try {
      if (proc && !proc.killed) {
        proc.kill();
      }
    } catch {}
  }
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});
process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});


