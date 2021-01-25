#!/usr/bin/env node

const fs = require('fs')
const {join} = require('path')
const mkdirp = require('mkdirp')
const execa = require('execa')

; (async () => {
  const [
    list = './gen/dxos.txt',
    outDir = './gen'
  ] = process.argv.slice(2)

  console.log({ list, outDir })

  const repos = fs.readFileSync(list, { encoding: 'utf-8' }).split('\n').filter(Boolean);

  await execa('rm', ['-r', join(outDir, 'checkout')]).catch(() => {})
  mkdirp.sync(join(outDir, 'checkout'))

  for(const repo of repos) {
    try {
      const destination = join(outDir, 'checkout', repo.split('/')[1])
      console.log(`Clone ${repo}`)
      await execa('gh', ['repo', 'clone', repo, destination])

      const rootPkgJson = JSON.parse(fs.readFileSync(join(destination, 'package.json'), { encoding: 'utf-8' }))

      if(rootPkgJson.workspaces)  {
        const packages = await getWorkspacePackages(destination);
        for(const package of packages) {
          console.log(`Copy ${package.name}`)
          const packagePath = join(outDir, 'packages', cleanPkgName(package.name))
          mkdirp.sync(packagePath)
          await execa('cp', ['-r', join(destination, package.location), packagePath])

          console.log(`Clean ${package.name}`)
          await cleanPackage(packagePath)
        }
      } else {
        const packagePath = join(outDir, 'packages', cleanPkgName(rootPkgJson.name))
        console.log(`Copy ${rootPkgJson.name}`)
        mkdirp.sync(packagePath)
        await execa('cp', ['-r', destination, packagePath])

        console.log(`Clean ${rootPkgJson.name}`)
        await cleanPackage(packagePath)
      }
    } catch(err) {
      console.error(err)
    }

    console.log(`Delete ${join(outDir, 'checkout')}`)
    await execa('rm', ['-r', join(outDir, 'checkout')])
  }
})()

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
  const patterns = [
    '.git',
    '.github',
    '.idea',
    'yarn.lock',
  ]
  for(const pattern of patterns) {
    try {
      await execa('rm', ['-r', pattern], { cwd: dir });
    } catch(err) {
      
    }
  }

  await execa('node_modules/.bin/fu', ['strip', "--dir='**/+\(src\|stories\)", '--replace', '--verbose'])
}
