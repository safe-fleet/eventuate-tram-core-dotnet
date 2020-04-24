node('docker-builds-slave') {
  def slackChannel = '#media-management-alerts'

  library identifier: "${env.DEFAULT_SHARED_LIBS}",
    retriever: modernSCM([$class: 'GitSCMSource', remote: "${env.DEFAULT_SHARED_LIBS_REPO}"])

  pipelineProps.defaultBuildMultibranchProperties();

  def sdkDotnetBaseImage = 'mcr.microsoft.com/dotnet/core/sdk:3.0.100'
  def imageEnvVar = "-e HOME='/tmp' -e DOTNET_ROLL_FORWARD='Major' -e DOTNET_CLI_TELEMETRY_OPTOUT=1"

  try {
    stage('Checkout') {
      logger.stage()
      timeout(10) {
        checkout scm
      }

      slackUtils.notifyBuild('STARTED', slackChannel)
    }

    def nextVersion

    stage("Build Release") {
      docker.image(sdkDotnetBaseImage).inside(imageEnvVar) {
        sh "dotnet build -c Release"
      }
    }

    stage("Release Notes") {
      logger.stage()

      withVault(vaultSecrets: [
        [path: "jenkins/mediamanagement/services/github", secretValues: [[vaultKey: 'publish_token', envVar: 'GITHUB_TOKEN'], [vaultKey: 'user', envVar: 'GITHUB_USER']]],
        [path: "jenkins/mediamanagement/services/nexus_npm_settings", secretValues: [[vaultKey: 'file', envVar: 'npm_settings']]]
      ]) {
        def nodeTool = "Node 12.16.0"


        nodejs(nodeTool) {
          sh """cat > $WORKSPACE/.npmrc << EOL\n$npm_settings\nEOL"""
          sh "npm ci"
          sh "npm run semantic-release"
        }
      }

      if (fileExists('semantic-release.log')) {
        def lines = readFile('semantic-release.log').readLines()
        nextVersion = lines[0]
      }
    }

    if (nextVersion) {
      stage("Pack Nuget") {
        logger.stage()

        docker.image(sdkDotnetBaseImage).inside(imageEnvVar) {
          sh "dotnet pack -c Release -p:Version=${nextVersion}"
        }
      }

      stage("Publish Github Nuget") {
        logger.stage()

        def nugetName = "IO.Eventuate.Tram.${nextVersion}.nupkg"

        withVault(vaultSecrets: [
          [path: "jenkins/mediamanagement/services/github", secretValues: [[vaultKey: 'publish_token', envVar: 'GITHUB_TOKEN'], [vaultKey: 'user', envVar: 'GITHUB_USER']]],
          [path: "jenkins/mediamanagement/services/nexus_nuget_settings", secretValues: [[vaultKey: 'file_release', envVar: 'nuget_config']]]
        ]) {
          docker.image(sdkDotnetBaseImage).inside(imageEnvVar) {
            sh """cat > ./NuGet.Config << EOL\n$nuget_config\nEOL"""
            sh "dotnet nuget push ./IO.Eventuate.Tram/bin/Release/${nugetName} --source 'github'"
          }
        }

        slackUtils.notifyBuild("The ${nugetName} nuget was released", slackChannel)
      }
    }
  } catch (e) {
    currentBuild.result = 'FAILURE'
    throw e
  } finally {
    stage('Notify') {
      slackUtils.notifyBuild(currentBuild.result, slackChannel)
    }

    stage('Clean Up') {
      cleanWs()
    }
  }
}
