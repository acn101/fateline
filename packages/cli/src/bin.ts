import { argv, exit, stdout } from 'node:process';
import { validateModuleAt } from './validateCommand.js';

/**
 * Entry point for `fateline-validate <module-dir> [--lives N] [--max-years N]`.
 * Exits non-zero on any validation or smoke-test failure so it works as a CI
 * merge gate for the curated registry (README §11.2).
 */
async function main(): Promise<void> {
  const args = argv.slice(2);
  const dir = args.find((a) => !a.startsWith('--'));
  if (!dir) {
    stdout.write('usage: fateline-validate <module-dir> [--lives N] [--max-years N]\n');
    exit(2);
  }

  const report = await validateModuleAt(dir, {
    lives: numFlag(args, '--lives'),
    maxYears: numFlag(args, '--max-years'),
  });

  stdout.write(report.lines.join('\n') + '\n');
  exit(report.ok ? 0 : 1);
}

function numFlag(args: string[], name: string): number | undefined {
  const i = args.indexOf(name);
  if (i === -1 || i + 1 >= args.length) return undefined;
  const value = Number(args[i + 1]);
  return Number.isFinite(value) ? value : undefined;
}

void main();
