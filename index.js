const fs = require('fs')
const YAML = require('yaml')
const core = require('@actions/core')

const cliConfigPath = `${process.env.HOME}/.jira.d/config.yml`
const configPath = `${process.env.HOME}/jira/config.yml`
const Action = require('./action')

// eslint-disable-next-line import/no-dynamic-require
const githubEvent = require(process.env.GITHUB_EVENT_PATH)
const config = {
  baseUrl: process.env.JIRA_BASE_URL,
  email: process.env.JIRA_USER_EMAIL,
  token: process.env.JIRA_API_TOKEN
}

async function exec () {
  try {
    const result = await new Action({
      githubEvent,
      argv: parseArgs(),
      config,
    }).execute()

    if (result) {
      if (result.issues && result.issues.length > 1) {
        console.log(`Detected issueKeys: ${result.issues.join(', ')}`)
      } else {
        console.log(`Detected issueKey: ${result.issue}`)
      }
      console.log(`Saving ${result.issue} to ${cliConfigPath}`)
      console.log(`Saving ${result.issue} to ${configPath}`)

      // Expose created issue's key(s) as an output
      core.setOutput('issue', result.issue)
      if (result.issues) {
        core.setOutput('issues', result.issues.join(','))
      }

      const yamledResult = YAML.stringify(result)
      const extendedConfig = Object.assign({}, config, result)

      fs.writeFileSync(configPath, YAML.stringify(extendedConfig))

      return fs.appendFileSync(cliConfigPath, yamledResult)
    }

    console.log('No issue keys found.')
  } catch (error) {
    core.setFailed(error.toString())
  }
}

function parseArgs () {
  return {
    string: core.getInput('string') || config.string,
    from: core.getInput('from'),
  }
}

exec()
