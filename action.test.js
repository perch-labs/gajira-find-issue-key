const Action = require('./action')
const nock = require('nock')

// Mock GitHub event
const mockGithubEvent = {
  ref: 'refs/heads/feature/ABC-123-new-feature',
  commits: [
    { message: 'Fix issue DEF-456 and GHI-789' },
    { message: 'Update documentation' }
  ]
}

// Mock config
const mockConfig = {
  baseUrl: 'https://test.atlassian.net',
  token: 'test-token',
  email: 'test@example.com'
}

describe('Action', () => {
  let action

  beforeAll(() => {
    nock.disableNetConnect()
  })

  beforeEach(() => {
    action = new Action({
      githubEvent: mockGithubEvent,
      argv: {},
      config: mockConfig
    })
  })

  afterEach(() => {
    nock.cleanAll()
  })

  afterAll(() => {
    nock.enableNetConnect()
  })

  describe('findIssueKeyIn', () => {
    it('should find single valid issue key', async () => {
      // Mock Jira API response for valid issue
      nock('https://test.atlassian.net')
        .get('/rest/api/2/issue/ABC-123')
        .query({ fields: '', expand: '' })
        .reply(200, { key: 'ABC-123', id: '12345' })

      const result = await action.findIssueKeyIn('Fix ABC-123 bug')

      expect(result).toEqual({
        issue: 'ABC-123',
        issues: ['ABC-123']
      })
    })

    it('should find multiple valid issue keys', async () => {
      // Mock Jira API responses for valid issues
      nock('https://test.atlassian.net')
        .get('/rest/api/2/issue/ABC-123')
        .query({ fields: '', expand: '' })
        .reply(200, { key: 'ABC-123', id: '12345' })
        .get('/rest/api/2/issue/DEF-456')
        .query({ fields: '', expand: '' })
        .reply(200, { key: 'DEF-456', id: '67890' })
        .get('/rest/api/2/issue/GHI-789')
        .query({ fields: '', expand: '' })
        .reply(200, { key: 'GHI-789', id: '11111' })

      const result = await action.findIssueKeyIn('Fix ABC-123 and DEF-456 also GHI-789')

      expect(result).toEqual({
        issue: 'ABC-123,DEF-456,GHI-789',
        issues: ['ABC-123', 'DEF-456', 'GHI-789']
      })
    })

    it('should filter out invalid issue keys and return only valid ones', async () => {
      // Mock Jira API responses - ABC-123 is valid, INVALID-999 is not
      nock('https://test.atlassian.net')
        .get('/rest/api/2/issue/ABC-123')
        .query({ fields: '', expand: '' })
        .reply(200, { key: 'ABC-123', id: '12345' })
        .get('/rest/api/2/issue/INVALID-999')
        .query({ fields: '', expand: '' })
        .reply(404, { errorMessages: ['Issue does not exist'] })

      const result = await action.findIssueKeyIn('Fix ABC-123 and INVALID-999')

      expect(result).toEqual({
        issue: 'ABC-123',
        issues: ['ABC-123']
      })
    })

    it('should return undefined when no valid issue keys are found', async () => {
      // Mock Jira API response for invalid issue
      nock('https://test.atlassian.net')
        .get('/rest/api/2/issue/INVALID-999')
        .query({ fields: '', expand: '' })
        .reply(404, { errorMessages: ['Issue does not exist'] })

      const result = await action.findIssueKeyIn('Fix INVALID-999')

      expect(result).toBeUndefined()
    })

    it('should return undefined when no issue keys match the pattern', async () => {
      const result = await action.findIssueKeyIn('No issue keys in this string')

      expect(result).toBeUndefined()
    })

    it('should handle mixed case issue keys', async () => {
      // Mock Jira API response
      nock('https://test.atlassian.net')
        .get('/rest/api/2/issue/abc-123')
        .query({ fields: '', expand: '' })
        .reply(200, { key: 'ABC-123', id: '12345' })

      const result = await action.findIssueKeyIn('Fix abc-123 bug')

      expect(result).toEqual({
        issue: 'ABC-123',
        issues: ['ABC-123']
      })
    })
  })

  describe('execute with string input', () => {
    it('should find issue from string input', async () => {
      action.argv = { string: 'Fix ABC-123 bug' }
      
      nock('https://test.atlassian.net')
        .get('/rest/api/2/issue/ABC-123')
        .query({ fields: '', expand: '' })
        .reply(200, { key: 'ABC-123', id: '12345' })

      const result = await action.execute()

      expect(result).toEqual({
        issue: 'ABC-123',
        issues: ['ABC-123']
      })
    })
  })

  describe('execute with from input', () => {
    it('should find issue from branch', async () => {
      action.argv = { from: 'branch' }
      
      nock('https://test.atlassian.net')
        .get('/rest/api/2/issue/ABC-123')
        .query({ fields: '', expand: '' })
        .reply(200, { key: 'ABC-123', id: '12345' })

      const result = await action.execute()

      expect(result).toEqual({
        issue: 'ABC-123',
        issues: ['ABC-123']
      })
    })

    it('should find multiple issues from commits', async () => {
      action.argv = { from: 'commits' }
      
      nock('https://test.atlassian.net')
        .get('/rest/api/2/issue/DEF-456')
        .query({ fields: '', expand: '' })
        .reply(200, { key: 'DEF-456', id: '67890' })
        .get('/rest/api/2/issue/GHI-789')
        .query({ fields: '', expand: '' })
        .reply(200, { key: 'GHI-789', id: '11111' })

      const result = await action.execute()

      expect(result).toEqual({
        issue: 'DEF-456,GHI-789',
        issues: ['DEF-456', 'GHI-789']
      })
    })
  })
})