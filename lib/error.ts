import SemanticReleaseError from "@semantic-release/error"

import { RequestsConfig } from "./models/config"

/**
 * linkify returns the right link for semantic-release-requests documentation according to input section.
 * 
 * @param section the documented section to link.
 * 
 * @returns the string link to documented section.
 */
const linkify = (section: string): string => `https://github.com/kilianpaquier/semantic-release-requests/blob/master/README.md#${section}`

/**
 * ConfigError represents an error associated to a bad configuration.
 */
interface ConfigError {
    message: string
    details?: string
}

/**
 * configErrors is the global variable with all configuration key with their associated error.
 * It's used in GetConfigError function.
 */
const configErrors: { [k in keyof RequestsConfig]: (value?: any) => ConfigError } = {
    apiPathPrefix: (value: any) => ({
        details: `[API Path Prefix](${linkify("configuration")}) must be a string. Provided value is ${JSON.stringify(value)}.`,
        message: `Invalid 'apiPathPrefix' configuration.`,
    }),
    assets: (value: any) => ({
        details: `[Assets](${linkify("configuration")}) must be a valid list of strings. Provided value is ${JSON.stringify(value)}.`,
        message: `Invalid 'assets' configuration.`,
    }),
    baseUrl: (value: any) => ({
        details: `[Base URL](${linkify("configuration")}) must be a non empty string. Provided value is ${JSON.stringify(value)}.`,
        message: `Invalid 'baseUrl' configuration.`,
    }),
    candidates: (value: any) => ({
        details: `[Candidates](${linkify("configuration")}) must be a valid array of release candidates ({ from: "...", to: "..." }). Provided value is ${JSON.stringify(value)}.`,
        message: `Invalid 'candidates' configuration.`,
    }),
    commit: (value: any) => ({
        details: `[Commit](${linkify("configuration")}) must be a string. Provided value is ${JSON.stringify(value)}.`,
        message: `Invalid 'commit' configuration.`,
    }),
    // shouldn't happen since it comes from semantic-release config
    debug: () => ({
        message: "Invalid 'debug' configuration (coming from semantic-release options).",
    }),
    // shouldn't happen since it comes from semantic-release config
    dryRun: () => ({
        message: "Invalid 'dryRun' configuration (coming from semantic-release options).",
    }),
    platform: (value: any) => ({
        details: `[Platform](${linkify("configuration")}) must be one of 'bitbucket', 'bitbucket-cloud', 'gitea', 'github', 'gitlab'. Provided value is ${JSON.stringify(value)}.`,
        message: `Invalid 'platform' configuration.`,
    }),
    // shouldn't happen since it comes from semantic-release config
    repositoryUrl: () => ({
        message: "Invalid 'repositoryUrl' configuration (coming from semantic-release options).",
    }),
    title: (value: any) => ({
        details: `[Title](${linkify("configuration")}) must be a non empty string. Provided value is ${JSON.stringify(value)}.`,
        message: `Invalid 'title' configuration.`,
    }),
    token: () => ({
        details: `[Token](${linkify("configuration")}) must be a non empty string.`,
        message: "Invalid 'token' configuration.",
    })
}

/**
 * getConfigError returns the SemanticReleaseError associated to input configuration key.
 * 
 * @param key the configuration key to retrieve the associated error.
 * @param value the bad value associated to key.
 * 
 * @returns the SemanticReleaseError.
 */
export const getConfigError = (key: keyof RequestsConfig, value?: any) => {
    const code = `EINVALID${key.toUpperCase()}`
    const error = configErrors[key](value)
    return new SemanticReleaseError(error.message, code, error.details)
}
