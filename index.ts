import { SuccessContext, VerifyConditionsContext } from 'semantic-release'
import { createRequests, getBranches, processRequest } from "./lib/requests"
import { ensureDefault, verifyConfig } from "./lib/verify-config"

import SemanticReleaseError from "@semantic-release/error"

import { RequestsConfig } from "./lib/models/config"

/**
 * verifyConditions is the exported function for semantic-release for verifyConditions lifecycle.
 * 
 * It verifies the input plugin configuration and throws an error if it's not valid.
 * 
 * @param globalConfig the semantic-release-requests plugin configuration.
 * @param context the semantic-release context.
 * 
 * @throws an exception in case the input semantic-release-requests configuration is invalid 
 * or missing inputs like tokens or URLs, etc.
 * 
 * @returns the validated configuration.
 */
export const verifyConditions = (globalConfig: RequestsConfig, context: VerifyConditionsContext) => {
    const config = ensureDefault(globalConfig, context.env)

    // verifyConfig throws an exception in case the configuration is invalid
    // which will make semantic-release fail at verifyConditions step
    verifyConfig(config)
    return config
}

/**
 * prepare is the function for semantic-release prepare lifecycle 
 * and is executed before tag create and release publishing.
 * 
 * It creates a remote branch to push all configured release assets 
 * and create the associated pull request for the right platform depending on CI.
 * 
 * In case the branch creation fails a SemanticReleaseError is thrown. 
 * It's not the case if the pull request couldn't be created since it can be done manually after semantic-release process without impact.
 * 
 * @param globalConfig the semantic-release-requests plugin configuration.
 * @param context the semantic-release context.
 * 
 * @throws
 * 
 * @see https://github.com/semantic-release/git/blob/28a17512def11a1dfbb21836c6061e7179dc0dc2/index.js#L22
 * since semantic-release-requests is there to replace semantic-release/git and avoid pushing release assets directly to released branch.
 */
export const prepare = async (globalConfig: RequestsConfig, context: SuccessContext) => {
    const config = verifyConditions(globalConfig, context)

    // processRequest throws an exception in case the branch with all release assets couldn't be created
    // which will make semantic-release fail at prepare step
    processRequest(context, config)
}

/**
 * success is the function for semantic-release success lifecycle.
 * 
 * It creates all the pull requests validating the candidates configuration 
 * and the pull request associated with local changes made during semnatic-release process.
 * 
 * @param globalConfig the semantic-release-requests plugin configuration.
 * @param context the semantic-release context.
 */
export const success = async (globalConfig: RequestsConfig, context: SuccessContext) => {
    const config = verifyConditions(globalConfig, context)

    try {
        const branches = getBranches(context, config)
        await createRequests(context, config, branches)
    } catch (error) {
        if (error instanceof AggregateError || error instanceof SemanticReleaseError) {
            throw error // don't wrap error in case it's already an acceptable error by semantic-release
        }
        throw new SemanticReleaseError("Failed to create release candidates pull requests.", "ERCPULLREQUESTS", String(error))
    }
}