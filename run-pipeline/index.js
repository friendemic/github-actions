const core = require('@actions/core');
const { context, GitHub } = require('@actions/github');
const AWS = require('aws-sdk');

AWS.config.update({
  region:'us-east-1'
})

async function run() {
  const { GITHUB_TOKEN } = process.env;
  if (!GITHUB_TOKEN) {
      core.setFailed('GITHUB_TOKEN is required');
      return;
  }
  //if (!GITHUB_HEAD_REF) {
  //    core.setFailed('GITHUB_HEAD_REF is required');
  //    return;
  //}

  try {
    const codepipeline = new AWS.CodePipeline();
    const client = new GitHub(GITHUB_TOKEN);

    const { owner, repo } = context.repo;

    const pr = await client.pulls.get({
      owner,
      repo,
      pull_number: context.payload.issue.number
    })
    const { head: { ref } } = pr.data

    // Get inputs
    const pipelineName = core.getInput('pipeline', { required: true });
    const branch = ref

    core.debug(`Get pipeline data for '${pipelineName}'`);

    const { pipeline } = await codepipeline.getPipeline({
      name: pipelineName
    }).promise()

    pipeline.stages[0].actions[0].configuration.Branch = branch

    core.debug(`Updating pipeline '${pipelineName}' to release branch '${branch}'`);

    await codepipeline.updatePipeline({
      pipeline
    }).promise()

    
    await client.issues.createComment({
      owner,
      repo,
      issue_number: context.payload.issue.number,
      body: `AWS CodePipeline '${pipelineName}' is now configured to build releases for this branch.  Initial deployment in progress...`
    });

  } catch (error) {
    console.log(error)
    core.setFailed(error.message);
    core.debug(error.stack);
  }
}

module.exports = run;

/* istanbul ignore next */
if (require.main === module) {
    run();
}
