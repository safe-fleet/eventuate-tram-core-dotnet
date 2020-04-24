module.exports = {
  preset: 'safe-fleet',
  branches: ['master', { name: 'develop', prerelease: true }, { name: 'release/next', prerelease: 'release-next' }],
  plugins: [
    ['@semantic-release/commit-analyzer', {
      releaseRules: [
        { type: 'build', scope: 'deploy', release: 'minor' }
      ],
      parserOpts: {
        noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES']
      }
    }],
    '@semantic-release/release-notes-generator',
    '@semantic-release/github',
    ['@semantic-release/exec', {
      publishCmd: './release.sh ${nextRelease.version}'
    }],
  ]
}
