import { Platform, ReleaseCandidate, RequestsConfig, defaultCommit, defaultTitle } from "./models/config"
import { isArray, isBoolean, isString } from "lodash"

import AggregateError from "aggregate-error"
import SemanticReleaseError from "@semantic-release/error"

import { getConfigError } from "./error"

/**
 * stringNotEmpty validates that an input string is not empty.
 * 
 * @param value the string to validate.
 * 
 * @returns true if the input is not empty.
 */
const stringNotEmpty = (value: string) => value !== ""

/**
 * validCandidatesArray validates an input slice of release candidates (meaning both from and to fields are present)
 * 
 * @param candidates the slice of candidates to validate
 * 
 * @returns true if all candidates are valid.
 */
const validCandidatesArray = (candidates: Partial<ReleaseCandidate>[]): boolean => candidates.
    filter(target =>
        typeof target.from === "string" && stringNotEmpty(target.from)
        && typeof target.to === "string" && stringNotEmpty(target.to)
    ).length === candidates.length

/**
 * validPlatform validates an input string platform.
 * 
 * @param stringPlatform the platform to validate.
 * 
 * @returns true if the input platform is valid.
 */
const validPlatform = (stringPlatform: string): boolean => Boolean(Object.values(Platform).
    filter(platform => platform !== Platform.NULL).
    find(platform => platform.toString() === stringPlatform))

/**
 * validStringArray validates the input string slice
 * 
 * @param array the input slice to validate (ensure all present strings aren't empty)
 * 
 * @returns true if the array is valid
 */
const validStringArray = (array: string[]): boolean => array.filter(str => typeof str === "string" && stringNotEmpty(str)).length === array.length

/**
 * ensureDefaults takes as input a partial requests configuration, alongside environment variables 
 * and ensure all its fields are valued with the default value or with the input value.
 * 
 * @param config the partial input configuration.
 * @param env the environment variables.
 * 
 * @returns the full configuration with default values if necessary.
 */
export const ensureDefault = (config: Partial<RequestsConfig>, env?: Record<string, string>): RequestsConfig => {
    const getURLs = (): [Platform, string, string] => { // eslint-disable-line complexity
        if (config.baseUrl) {
            return [Platform.NULL, config.baseUrl, config.apiPathPrefix ?? ""]
        }

        // bitbucket
        if (env?.BITBUCKET_URL) {
            return [Platform.BITBUCKET, env?.BITBUCKET_URL, config.apiPathPrefix ?? "/rest/api/1.0"]
        }

        // bitbucket cloud
        if (env?.BITBUCKET_CLOUD_URL) {
            return [Platform.BITBUCKET_CLOUD, env?.BITBUCKET_CLOUD_URL, config.apiPathPrefix ?? "/2.0"]
        }

        // gitea
        if (env?.GITEA_URL) {
            return [Platform.GITEA, env?.GITEA_URL, config.apiPathPrefix ?? "/api/v1"]
        }

        // github
        const githubUrl = env?.GH_URL ?? env?.GITHUB_URL ?? env?.GITHUB_API_URL
        if (githubUrl) {
            return [Platform.GITHUB, githubUrl, config.apiPathPrefix ?? ""]
        }

        // gitlab
        const gitlabUrl = env?.GL_URL ?? env?.GITLAB_URL ?? env?.CI_SERVER_URL
        if (gitlabUrl) {
            return [Platform.GITLAB, gitlabUrl, config.apiPathPrefix ?? "/api/v4"]
        }

        return [Platform.NULL, "", ""]
    }

    const [platform, baseUrl, apiPathPrefix] = getURLs()
    return {
        apiPathPrefix,
        assets: config.assets ?? [],
        baseUrl,
        candidates: config.candidates ?? [],
        commit: config.commit ?? defaultCommit,
        debug: config.debug ?? false, // shouldn't happen since it comes from semantic-release config
        dryRun: config.dryRun ?? false, // shouldn't happen since it comes from semantic-release config
        platform: config.platform ?? platform,
        repositoryUrl: config.repositoryUrl ?? "",
        title: config.title ?? defaultTitle,
        // checking all environment variables since it doesn't matter which is valued whatever the platform could be
        token: env?.BB_TOKEN ?? env?.BITBUCKET_TOKEN ?? env?.GITEA_TOKEN ?? env?.GH_TOKEN ?? env?.GITHUB_TOKEN ?? env?.GL_TOKEN ?? env?.GITLAB_TOKEN ?? "",
    }
}

/**
 * verifyConfig validates an input full RequestsConfig.
 * 
 * @param config the configuration to validate.
 */
export const verifyConfig = (config: RequestsConfig) => {
    const validators: { [k in keyof RequestsConfig]: ((value: any) => boolean)[] } = {
        apiPathPrefix: [isString],
        assets: [isArray, validStringArray],
        baseUrl: [isString, stringNotEmpty],
        candidates: [isArray, validCandidatesArray],
        commit: [isString, stringNotEmpty],
        debug: [isBoolean], // shouldn't happen since it comes from semantic-release config
        dryRun: [isBoolean], // shouldn't happen since it comes from semantic-release config
        platform: [isString, validPlatform],
        repositoryUrl: [isString, stringNotEmpty], // shouldn't happen since it comes from semantic-release config
        title: [isString, stringNotEmpty],
        token: [isString, stringNotEmpty],
    }

    const errors = Object.entries(config).reduce((agg: SemanticReleaseError[], [option, value]) => {
        // @ts-expect-error option is a keyof RequestsConfig
        for (const validation of validators[option]) {
            if (!validation(value)) { // eslint-disable-line @typescript-eslint/no-unsafe-call
                // @ts-expect-error option is a keyof RequestsConfig
                return [...agg, getConfigError(option, value)]
            }
        }
        return agg
    }, [])
    if (errors.length > 0) {
        throw new AggregateError(errors)
    }
}