const fs = require('node:fs');
const path = require('node:path');

// Expo and Metro can use Node's native canonicalization for permitted project
// files when Windows rejects the JavaScript implementation's ancestor lookup.
if (process.platform === 'win32') {
  const project = path.resolve(__dirname, '..');
  const volume = path.parse(project).root;
  const realpath = fs.realpath;
  const realpathSync = fs.realpathSync;

  function canUseNative(error, input) {
    if (error?.code !== 'EPERM' || error.path !== volume || typeof input !== 'string') return false;
    const relative = path.relative(project, path.resolve(input));
    return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
  }

  fs.realpathSync = Object.assign(function projectRealpathSync(input, options) {
    try {
      return realpathSync(input, options);
    } catch (error) {
      if (!canUseNative(error, input)) throw error;
      return realpathSync.native(input, options);
    }
  }, { native: realpathSync.native });

  fs.realpath = Object.assign(function projectRealpath(input, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    return realpath(input, options, (error, resolved) => {
      if (canUseNative(error, input)) return realpath.native(input, options, callback);
      return callback(error, resolved);
    });
  }, { native: realpath.native });
}

if (require.main === module) {
  const project = path.resolve(__dirname, '..');
  const temp = path.join(project, '.expo', 'tmp');
  fs.mkdirSync(temp, { recursive: true });
  process.env.__UNSAFE_EXPO_HOME_DIRECTORY ??= path.join(project, '.expo', 'cli-home');
  process.env.TEMP = temp;
  process.env.TMP = temp;
  process.env.EXPO_NO_TELEMETRY ??= '1';
  process.env.NODE_OPTIONS = [
    process.env.NODE_OPTIONS,
    '--preserve-symlinks --preserve-symlinks-main',
    '--require="' + __filename.split(path.sep).join('/') + '"',
  ].filter(Boolean).join(' ');

  const cli = path.join(project, 'node_modules', 'expo', 'bin', 'cli');
  process.chdir(project);
  process.argv[1] = cli;
  require(cli);
}
