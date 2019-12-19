function createPEM(pem) {
  if (!pem) {
    return;
  }
  const UUID = uuid();
  const tmpDir = os.tmpdir();
  const pemDir = path.join(tmpDir, UUID);
  const pemKey = path.join(pemDir, 'key.pem');
  const pemShell = path.join(pemDir, 'key.sh');
  const pemShellFile = ['ssh', '-o StrictHostKeyChecking=no', '-o UserKnownHostsFile=/dev/null', '-i', pemKey, '$@', ].join(' ');
  fsExtra.outputFileSync(pemShell, pemShellFile, {
    encoding: 'utf8',
    mode: 0o500
  });
  fsExtra.outputFileSync(pemKey, pem, {
    encoding: 'utf8',
    mode: 0o600
  });
  return {
    dir: pemDir,
    sh: pemShell,
    key: pemKey,
  };
}
