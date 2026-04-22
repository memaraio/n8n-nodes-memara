#!/usr/bin/env node
/**
 * After `npm run build`, runs `npm pack` and asserts the tarball contains only
 * expected Memara artifacts (guards against stray compiled nodes, e.g. other vendors).
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function isAllowedPath(entry) {
	if (/lucid/i.test(entry)) return false;
	if (entry === 'package/package.json') return true;
	if (entry === 'package/index.js') return true;
	if (entry === 'package/dist/package.json') return true;
	if (entry === 'package/dist/tsconfig.tsbuildinfo') return true;
	if (/^package\/README/i.test(entry)) return true;
	if (/^package\/LICENSE/i.test(entry)) return true;
	if (/^package\/dist\/credentials\/(MemaraApi\.credentials.*|memara\.svg)$/.test(entry)) {
		return true;
	}
	if (/^package\/dist\/nodes\/shared\//.test(entry)) return true;
	if (/^package\/dist\/nodes\/Memara[^/]+\//.test(entry)) return true;
	return false;
}

function main() {
	const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
	const packName = execSync('npm pack --silent', { cwd: root, encoding: 'utf8' })
		.trim()
		.split(/\r?\n/)
		.filter(Boolean)
		.pop();
	if (!packName) {
		console.error('verify-pack: npm pack produced no tarball name');
		process.exit(1);
	}
	const tgzPath = join(root, packName);
	const listing = execSync(`tar -tzf "${tgzPath}"`, { encoding: 'utf8' })
		.trim()
		.split(/\r?\n/)
		.filter(Boolean);

	const unexpected = listing.filter((e) => !isAllowedPath(e));
	if (unexpected.length) {
		console.error(`verify-pack: unexpected paths in ${packName} (${pkg.name}@${pkg.version}):`);
		for (const u of unexpected) console.error(' ', u);
		process.exit(1);
	}

	console.log(`verify-pack: OK (${packName}, ${listing.length} paths)`);
}

main();
