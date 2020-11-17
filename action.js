const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/rest");
const { parseTestReports } = require('./utils.js');

const action = async () => {
    const reportPaths = core.getInput('report_paths');
    core.info(`Going to parse results form ${reportPaths}`);
    const githubToken = core.getInput('github_token');
    const commit = core.getInput('commit');

    let { count, skipped, annotations } = await parseTestReports(reportPaths);
    const foundResults = count > 0 || skipped > 0;
    const title = foundResults
        ? `${count} tests run, ${skipped} skipped, ${annotations.length} failed.`
        : 'No test results found!';
    core.info(`Result: ${title}`);

    const pullRequest = github.context.payload.pull_request;
    const link = pullRequest && pullRequest.html_url || github.context.ref;
    const head_sha = commit || pullRequest && pullRequest.head.sha || github.context.sha;
    core.info(
        `Updating check on ${link} (sha: ${head_sha})`
    );

    const updateCheckRequest = {
        ...github.context.repo,
        check_run_id: github.context.runId,
        output: {
            title,
            summary: '',
            annotations: annotations.slice(0, 50)
        }
    };

    core.debug(JSON.stringify(updateCheckRequest, null, 2));

    const octokit = new Octokit({
        auth: githubToken,
    });
    await octokit.checks.update(updateCheckRequest);
};

module.exports = action;
