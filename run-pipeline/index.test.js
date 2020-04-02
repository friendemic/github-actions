const run = require('./index');
const core = require('@actions/core');

jest.mock('@actions/core');

const mockGetPipeline = jest.fn(() => ({
  promise: jest.fn(() => ({
    pipeline: {
      "name": "my-pipeline",
      "stages": [
        {
          "name": "Source",
          "actions": [
            {
              "name": "Source",
              "runOrder": 1,
              "configuration": {
                "Branch": "master",
                "Owner": "friendemic",
                "Repo": "my-repo"
              }
            }
          ]
        }
      ],
      "version": 1
    }
  }))
}))
const mockUpdatePipeline = jest.fn(() => ({
  promise: jest.fn()
}))

jest.mock('aws-sdk', () => {
  return {
    config: {
      update: jest.fn()
    },
    CodePipeline: jest.fn(() => ({
        getPipeline: mockGetPipeline,
        updatePipeline: mockUpdatePipeline
    }))
  };
});

const mockCreateComment = jest.fn()

jest.mock('@actions/github', () => {
  return {
    context: {
      repo: {
        owner: 'friendemic',
        repo: 'my-repo',
      },
      payload: {
        issue: {
          number: 1
        }
      }
    },
    GitHub: jest.fn(() => ({
      pulls: {
        get: jest.fn().mockReturnValue({
          data: {
            head: {
              ref: 'feature-branch'
            }
          }
        })
      },
      issues: {
        createComment: mockCreateComment
      }
    }))
  }
})

describe('Run codepipeline', () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'foobar'
    jest.clearAllMocks();

    core.getInput = jest.fn().mockReturnValueOnce('my-pipeline')
  })

  it('should update and run pipeline', async () => {
    await run();
    expect(mockUpdatePipeline).toHaveBeenCalledWith({
      pipeline: {
        "name": "my-pipeline",
        "stages": [
          {
            "name": "Source",
            "actions": [
              {
                "name": "Source",
                "runOrder": 1,
                "configuration": {
                  "Branch": "feature-branch",
                  "Owner": "friendemic",
                  "Repo": "my-repo"
                }
              }
            ]
          }
        ],
        "version": 1
      }
    })
    expect(mockCreateComment).toHaveBeenCalledWith({
      "body": "AWS CodePipeline 'my-pipeline' is now configured to build releases for this branch.  Initial deployment in progress...",
      "issue_number": 1,
      "owner": 'friendemic',
      "repo": 'my-repo',
    })
  })
})
