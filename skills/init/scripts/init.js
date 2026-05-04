import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateConstitution } from '../../../scripts/generate-constitution.js';
import { generateCodeIndex } from '../../../scripts/generate-code-index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const spectralRoot = path.resolve(__dirname, '..', '..', '..');
const targetDir = process.cwd();

const spectralFolder = path.join(targetDir, '.spectral');
const templatesFolder = path.join(spectralFolder, 'templates');
const memoryFolder = path.join(spectralFolder, 'memory');
const tasksFolder = path.join(spectralFolder, 'tasks');
const registryFolder = path.join(spectralFolder, 'registry');
const rulesFolder = path.join(spectralFolder, 'rules');
const specsFolder = path.join(targetDir, 'specs');

const sourceTemplatesDir = path.join(spectralRoot, 'skills', 'init', 'templates');

async function init() {
    console.log(`Initializing Spectral in: ${targetDir}`);
    console.log("Running init.js via Node...");
    console.log("Platform:", process.platform);
    console.log("Shell env:", process.env.SHELL || process.env.ComSpec);
    try {
        // 1. Create directory structure
        if (!fs.existsSync(spectralFolder)) fs.mkdirSync(spectralFolder);
        if (!fs.existsSync(templatesFolder)) fs.mkdirSync(templatesFolder);
        if (!fs.existsSync(memoryFolder)) fs.mkdirSync(memoryFolder);
        if (!fs.existsSync(tasksFolder)) fs.mkdirSync(tasksFolder);
        if (!fs.existsSync(registryFolder)) fs.mkdirSync(registryFolder);
        if (!fs.existsSync(rulesFolder)) fs.mkdirSync(rulesFolder);
        if (!fs.existsSync(specsFolder)) fs.mkdirSync(specsFolder);

        // 2. Identify templates to copy
        const templates = [
            'spec-template.md',
            'plan-template.md',
            'tasks-template.md',
            'constitution-template.md',
            'ticket-template.md'
        ];

        // 3. Copy templates
        templates.forEach(template => {
            const src = path.join(sourceTemplatesDir, template);
            const dest = path.join(templatesFolder, template);

            if (fs.existsSync(src)) {
                fs.copyFileSync(src, dest);
                console.log(`Created: .spectral/templates/${template}`);
            } else {
                console.warn(`Warning: Template not found at ${src}`);
            }
        });

        // 4. Generate constitution from project signals and optional user rules.
        const constitutionDest = path.join(memoryFolder, 'constitution.md');
        const envRules = process.env.SPECTRAL_INIT_RULES || '';
        const rulesText = envRules;
        generateConstitution({
            targetDir,
            outPath: constitutionDest,
            rulesText
        });
        console.log('Created: .spectral/memory/constitution.md');

        // 4.5 Copy Tech-Stack Specific Rules
        const techStackPath = path.join(memoryFolder, 'tech_stack.json');
        const packageJsonPath = path.join(targetDir, 'package.json');
        
        let framework = null;
        let version = null;

        // Try tech_stack.json first
        if (fs.existsSync(techStackPath)) {
            try {
                const ts = JSON.parse(fs.readFileSync(techStackPath, 'utf8'));
                if (ts.frontend && ts.frontend.framework === 'Angular') {
                    framework = 'Angular';
                    version = ts.frontend.version;
                } else if (ts.project_type === 'Angular') {
                    framework = 'Angular';
                }
            } catch (e) {}
        }

        // Fallback to package.json if not found in tech_stack
        if (!framework && fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
                if (deps['@angular/core']) {
                    framework = 'Angular';
                    version = deps['@angular/core'];
                }
            } catch (e) {}
        }

        if (framework === 'Angular') {
            try {
                const rulesSourceDir = path.join(spectralRoot, 'skills', 'init', 'rules', 'Angular');
                
                // Copy common if it doesn't exist
                const commonDest = path.join(rulesFolder, 'angular-common.md');
                if (!fs.existsSync(commonDest) && fs.existsSync(path.join(rulesSourceDir, 'common.md'))) {
                    fs.copyFileSync(path.join(rulesSourceDir, 'common.md'), commonDest);
                    console.log('Created: .spectral/rules/angular-common.md');
                }

                // Determine specific version
                const availableVersions = [21, 17, 14]; // Sorted descending
                let versionFile = 'v21.md'; // Default
                
                if (version) {
                    const majorMatch = version.match(/(\d+)/);
                    if (majorMatch) {
                        const major = parseInt(majorMatch[1], 10);
                        // Find the highest available version that is <= the project's major version
                        const bestMatch = availableVersions.find(v => v <= major);
                        if (bestMatch) {
                            versionFile = `v${bestMatch}.md`;
                        } else {
                            versionFile = 'v14.md'; // Fallback for very old versions
                        }
                    }
                }

                // Copy version specific rules
                const versionDest = path.join(rulesFolder, `angular-${versionFile}`);
                if (!fs.existsSync(versionDest) && fs.existsSync(path.join(rulesSourceDir, versionFile))) {
                    fs.copyFileSync(path.join(rulesSourceDir, versionFile), versionDest);
                    console.log(`Created: .spectral/rules/angular-${versionFile} (Source: ${version ? 'v'+version : 'default'})`);
                }
            } catch (err) {
                console.warn(`Warning: Could not process Angular rules: ${err.message}`);
            }
        }

        // 5. Generate a metadata-only code index for index-first retrieval.
        const codeIndexDest = path.join(spectralFolder, 'code_index.json');
        try {
            // Use 'full' mode on first initialization, 'incremental' for updates
            const indexExists = fs.existsSync(codeIndexDest);
            const mode = indexExists ? 'incremental' : 'full';
            
            const codeIndexResult = await generateCodeIndex({
                targetDir,
                outPath: codeIndexDest,
                mode
            });
            console.log(
                `Created: .spectral/code_index.json (${codeIndexResult.stats.scannedFiles} scanned, ${codeIndexResult.stats.reusedFiles} reused, ${codeIndexResult.stats.changedFiles} changed, ${codeIndexResult.stats.deletedFiles} deleted)`
            );
        } catch (indexError) {
            console.warn(`Warning: code index generation failed (${indexError.message}). Init will continue without index.`);
        }

        console.log('\nSuccess: Spectral workspace initialized successfully.');
    } catch (error) {
        console.error(`Error during initialization: ${error.message}`);
        process.exit(1);
    }
}

init();
