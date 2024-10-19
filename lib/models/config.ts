/**
 * Platform represents all available platforms where pull requests creation with semantic-release-requests is implemented.
 */
export enum Platform {  
    BITBUCKET = "bitbucket",
    BITBUCKET_CLOUD = "bitbucket-cloud",
    GITEA = "gitea",
    GITHUB = "github",
    GITLAB = "gitlab",
    NULL = "",
}

/**
 * ReleaseCandidate represents a candidate configuration for a pull / merge request from a source branch (from) to a target branch (to).
 */
export interface ReleaseCandidate {
    from: string
    to: string
}

/**
 * RequestsConfig represesents all the configurable fields (with some exceptions like token, debug and dryRun) for semantic-release-requests.
 */
export interface RequestsConfig {
    debug: boolean // comes from semantic-release config
    dryRun: boolean // comes from semantic-release config
    repositoryUrl: string // comes from semantic-release config

    apiPathPrefix: string
    baseUrl: string
    platform: Platform
    token: string

    candidates: ReleaseCandidate[]
    title: string

    commit: string
    assets: string[]
}

/**
 * defaultTitle is the default title for a pull request.
 * It's interpolated by lodash before being used.
 */
export const defaultTitle = "Release candidate branch ${ from }" // eslint-disable-line no-template-curly-in-string

/**
 * defaultCommit is the default commit message for the changes made during semantic-release process.
 * It's interpolated by lodash before being used.
 */
export const defaultCommit = "chore(release): release changes for v${ nextRelease.version } [skip ci]" // eslint-disable-line no-template-curly-in-string