import { execSync } from 'child_process';
import type { Plugin } from 'vite';

interface GitVersionPluginOptions {
	/**
	 * The name of the global variable to expose the version
	 * @default '__APP_VERSION__'
	 */
	variableName?: string;
	/**
	 * Whether to generate version in development mode
	 * @default true
	 */
	generateOnDev?: boolean;
}

function execGitCommand(command: string): string | null {
	try {
		return execSync(command, { encoding: 'utf-8' }).trim();
	} catch (error) {
		return null;
	}
}

function getGitVersion(): string {
	// Try to get the latest semver tag
	const tag =
		execGitCommand('git describe --tags --abbrev=0 --match "v[0-9]*" 2>/dev/null') ||
		execGitCommand('git describe --tags --abbrev=0 2>/dev/null');

	// Get short commit hash
	const shortHash = execGitCommand('git rev-parse --short HEAD');

	// Check if cwd is dirty
	const isDirty = execGitCommand('git status --porcelain');

	if (!tag && !shortHash) {
		return 'unknown';
	}

	// Fallback to short hash if tag doesnt exist
	if (!tag) {
		return shortHash!;
	}

	// If we're on a clean HEAD at the tag, return just the tag
	const tagCommit = execGitCommand(`git rev-list -n 1 ${tag}`);
	const headCommit = execGitCommand('git rev-parse HEAD');

	if (tagCommit === headCommit && !isDirty) {
		return tag;
	}

	// If dirty or not at tag, return tag+hash
	return `${tag}+${shortHash}`;
}

export default function gitVersionPlugin(options: GitVersionPluginOptions = {}): Plugin {
	const { variableName = '__APP_VERSION__', generateOnDev = true } = options;

	let version: string;
	let isDev = false;

	return {
		name: 'vite-plugin-git-version',
		configResolved(config) {
			isDev = config.command === 'serve';
			version = getGitVersion();

			console.log(
				`[vite-plugin-git-version] Detected version: ${version} (${isDev ? 'dev' : 'build'})`
			);
		},

		config(_, env) {
			if (env.command === 'serve' && !generateOnDev) {
				return;
			}

			const appVersion = getGitVersion();

			return {
				define: {
					[variableName]: JSON.stringify(appVersion)
				}
			};
		}
	};
}
