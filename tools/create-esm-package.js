const { readdir, writeFile } = require('fs/promises')
const path = require('path')

const buildDir = './build'
async function createEsmModulePackageJson() {
  const dirs = await readdir(buildDir)
  for (const dir of dirs) {
    if (dir === 'esm') {
      const packageJsonFile = path.join(buildDir, dir, '/package.json')
      await writeFile(packageJsonFile, '{"type": "module"}', 'utf8')
    }
  }
}

createEsmModulePackageJson().then(() => {}, (err) => { throw err })
