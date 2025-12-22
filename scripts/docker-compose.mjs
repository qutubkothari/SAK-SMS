import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const composeArgs = process.argv.slice(2);

let dockerCmd = 'docker';
const env = { ...process.env };

if (process.platform === 'win32') {
  const programFiles = env.ProgramFiles ?? 'C:\\Program Files';
  const dockerBin = path.join(programFiles, 'Docker', 'Docker', 'resources', 'bin');
  const dockerExe = path.join(dockerBin, 'docker.exe');

  if (existsSync(dockerExe)) {
    dockerCmd = dockerExe;
    env.PATH = `${dockerBin};${env.PATH ?? ''}`;
  }
}

const result = spawnSync(dockerCmd, ['compose', ...composeArgs], {
  stdio: 'inherit',
  env
});

process.exit(result.status ?? 1);
