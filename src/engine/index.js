import path from 'path'
import os from 'os'

export const version = 'v0.0.6'

function throwUnsupportedErrorMessage() {
  throw new Error(
    `Unsupported operating system (${
      process.platform
    }) and system architecture (${
      process.arch
    }) combination. Please open an issue on cucumber-js.`
  )
}

function getGoBinaryOperatingSystem() {
  switch (process.platform) {
    case 'darwin':
      return 'darwin'
    case 'freebsd':
      return 'freebsd'
    case 'linux':
      return 'linux'
    case 'win32':
      return 'windows'
    case 'openbsd':
      return 'openbsd'
    default:
      throwUnsupportedErrorMessage()
  }
}

function getGoBinaryArchitecture() {
  // Special ckeck on windows machines
  if (
    process.env.PROCESSOR_ARCHITECTURE === 'AMD64' ||
    process.env.PROCESSOR_ARCHITEW6432 === 'AMD64'
  ) {
    return 'amd64'
  }
  switch (process.arch) {
    case 'arm':
      return 'arm'
    case 'ia32':
    case 'x32':
      return '386'
    case 'x64':
      return 'amd64'
    case 'mips':
      return 'mips'
    case 'mipsel':
      return 'mipsle'
    case 's390x':
      return 's390x'
    default:
      throwUnsupportedErrorMessage()
  }
}

export function getBinaryLocalPath() {
  return path.join(os.homedir(), 'cucumber', 'engine', version)
}

export function getBinaryRemoteUrl() {
  const urlPrefix =
    'https://github.com/cucumber/cucumber-engine/releases/download'
  const os = getGoBinaryOperatingSystem()
  const arch = getGoBinaryArchitecture()
  let binaryName = `cucumber-engine-${os}-${arch}`
  if (os === 'windows') {
    binaryName += '.exe'
  }
  return `${urlPrefix}/${version}/${binaryName}`
}
