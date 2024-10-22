#!/usr/bin/env node

const fs = require('fs')
const {join, resolve} = require('path')
const mkdirp = require('mkdirp')
const execa = require('execa')
const ts = require('typescript')

const [
  list = './gen/dxos.txt',
  outDir = './gen'
] = process.argv.slice(2)

const replacements = [
  {search: /[a-zA-Z0-9\.]+dxos\.network\/dxos/g, replace: 'localhost'},
  {search: /[a-zA-Z0-9\.]+dxos\.network/g, replace: 'localhost'},
  {search: /kube.local/g, replace: 'localhost'},
  {search: /dxos/g, replace: 'wirelineio'},
  {search: /dx/g, replace: 'wire'},
  {search: /dxn/g, replace: 'wrn'},
  {search: /dxns/g, replace: 'wns'},
]

const jsComment = `
//
// Copyright 2020 wireline.io
//
`.trim() + '\n\n'

const licenseComments = {
  '.js': jsComment,
  '.jsx': jsComment,
  '.tsx': jsComment,
  '.ts': jsComment,
  '.js': jsComment,
}

const cleanPatterns = [
  '.git',
  '.github',
  '.travis.yml',
  '.idea',
  '.vscode',
  'yarn.lock',
  '.editorconfig',
  '.gitignore',
  'CHANGELOG.md',
  'README.md',
  'README',
  'docs',
  'node_modules'
]

; (async () => {

  const repos = fs.readFileSync(list, { encoding: 'utf-8' }).split('\n').filter(Boolean);

  await execa('rm', ['-r', join(outDir, 'checkout')]).catch(() => {})
  mkdirp.sync(join(outDir, 'checkout'))

  const threads = 8;

  const repoCount = repos.length;
  async function startThread() {
    while (repos.length !== 0) {
      const idx = repoCount - repos.length;
      const repo = repos.shift();
      const destination = join(outDir, 'checkout', repo.split('/')[1])
      console.log(`Clone ${repo} [${idx + 1} out of ${repoCount}]`)
      await cloneAndProcessRepo(repo, destination)
    }
  }

  const promises = []
  for(let i = 0; i < threads; i++) {
    promises.push(startThread());
  }

  await Promise.all(promises)

  console.log(`Delete ${join(outDir, 'checkout')}`)
  await execa('rm', ['-r', join(outDir, 'checkout')])
})()

async function cloneAndProcessRepo(repo, destination) {
  try {
    if (process.env.GITHUB_ACCESS_TOKEN) {
      await execa('git', ['clone',
      `https://${process.env.GITHUB_ACCESS_TOKEN}@github.com/${repo}.git`,
      destination, '--depth=1'])
    } else {
      await execa('gh', ['repo', 'clone', repo, destination, '--', '--depth=1'])
    }

    if (!fs.existsSync(join(destination, 'package.json'))) {
      await processPackage(destination, repo.replace('dxos/', ''))
      return;
    }

    const rootPkgJson = readJsonFile(join(destination, 'package.json'))

    if(rootPkgJson.workspaces)  {
      await preprocessMonorepo(destination);

      const packages = await getWorkspacePackages(destination);
      for(const package of packages) {
        await processPackage(join(destination, package.location), package.name)
      }
    } else {
      await processPackage(destination, rootPkgJson.name)
    }
  } catch(err) {
    console.error(err)
  }
}

async function preprocessMonorepo(path) {
  const workspacePackages = await getWorkspacePackages(path)
  for(const package of workspacePackages) {
    const pkgPath = join(path, package.location);
    if(fs.existsSync(join(pkgPath, 'tsconfig.json'))) {
      let tsConfig = readJsonFile(join(pkgPath, 'tsconfig.json'))

      if(tsConfig.extends) {
        const extendingTsConfig = readJsonFile(resolve(pkgPath, tsConfig.extends))
        tsConfig = {
          ...extendingTsConfig,
          ...tsConfig,
          compilerOptions: {
             ...extendingTsConfig.compilerOptions,
            ...tsConfig.compilerOptions,
          }
        }
        delete tsConfig.extends;
      }

      delete tsConfig.references;

      writeJsonFile(join(pkgPath, 'tsconfig.json'), tsConfig)
    }
  }

  const { dependencies, devDependencies } = readJsonFile(join(path, 'package.json'))
  for(const package of workspacePackages) {
    const pkgPath = join(path, package.location);
    const pkgJson = readJsonFile(join(pkgPath, 'package.json'))
    pkgJson.dependencies = {
      ...dependencies,
      ...pkgJson.dependencies,
    }
    pkgJson.devDependencies = {
      ...devDependencies,
      ...pkgJson.devDependencies,
    }
    writeJsonFile(join(pkgPath, 'package.json'), pkgJson)
  }
}

async function processPackage(sourcePath, name) {
  const packagePath = join(outDir, 'packages', cleanPkgName(name))

  console.log(`Copy ${name}`)
  mkdirp.sync(packagePath)
  await execa('cp', ['-r', `${sourcePath}/.`, packagePath])

  console.log(`Replace licence ${name}`)
  await execa('rm', ['-f', './LICENSE'], { cwd: packagePath })
  await execa('cp', [join(__dirname, '../LICENSE'), './'], { cwd: packagePath })

  console.log(`Clean ${name}`)
  await cleanPackage(packagePath)

  console.log(`Init git ${name}`)
  await execa('git', ['init'], { cwd: packagePath })
  await execa('git', ['add', '-A'], { cwd: packagePath })
  await execa('git', ['commit', '-m', 'Migration to Radical.'], { cwd: packagePath })
}

async function getWorkspacePackages(dir) {
  let {stdout} = await execa('yarn', ['workspaces', 'info'], { cwd: dir })
  if (stdout.startsWith('yarn workspaces')) {
    stdout = stdout.slice(stdout.indexOf('\n') + 1, stdout.lastIndexOf('}') + 1);
  }
  const json = JSON.parse(stdout);
  return Object.entries(json).map(([name, x]) => ({ name, location: x.location }))
}

function cleanPkgName(name) {
  if(name.startsWith('@')) {
    return name.split('/')[1];
  } else {
    return name
  }
}

async function cleanPackage(dir) {
  for(const pattern of cleanPatterns) {
    try {
      await execa('rm', ['-r', pattern], { cwd: dir });
    } catch(err) {
      
    }
  }

  // strip comments
  await execa(require.resolve('@dxos/fu/bin/fu.js'), ['strip', "--dir='**/+\(src\|stories\|tests\)'", '--replace', '--verbose'], { cwd: dir })

  for await (const file of readFilesRecursively(dir)) {
    const contents = await fs.promises.readFile(file, { encoding: 'utf-8' })
    let cleanedContents = contents;
    for (const replacement of replacements) {
      cleanedContents = cleanedContents.replace(replacement.search, replacement.replace);
    }

    for(const [ext, comment] of Object.entries(licenseComments)) {
      if(file.endsWith(ext)) {
        cleanedContents = comment + cleanedContents;
        break;
      }
    }

    if(cleanedContents !== contents) {
      await fs.promises.writeFile(file, cleanedContents);
    }
  }
}

async function* readFilesRecursively(dir) {
  for(const filesName of await fs.promises.readdir(dir)) {
    if(fs.statSync(join(dir, filesName)).isDirectory()) {
      yield* readFilesRecursively(join(dir, filesName));
    } else {
      yield join(dir, filesName);
    }
  }
}

function readJsonFile(path) {
  let contents = fs.readFileSync(path, { encoding: 'utf-8' });
  return ts.parseConfigFileTextToJson(path, contents).config
}

function writeJsonFile(path, contents) {
  fs.writeFileSync(path, JSON.stringify(contents, null, 4))
}
