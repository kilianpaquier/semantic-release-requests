import { LastRelease, NextRelease } from "semantic-release"
import { Metadata, createPR } from "./pull-request"
import { add, checkout, commit, fetch, ls, push } from "./git"

import AggregateError from "aggregate-error"
import SemanticReleaseError from "@semantic-release/error"
import parse from "git-url-parse"

import { RequestsConfig } from "./models/config"
import { authModificator } from "./auth-modificator"
import { template } from "lodash"

/**
 * Context is a subinterface of semantic-release Context (specifically VerifyConditionContext)
 */
export interface Context {
    branch: { name: string }
    cwd?: string
    env?: Record<string, string>
    lastRelease: LastRelease
    logger: {
        error(...data: any[]): void
        log(...data: any[]): void
    }
    nextRelease: NextRelease
}

/**
 * processRequest creates a new branch with release assets 
 * and creates a pull request from this new branch to the released branch.
 * 
 * In case the branch creation fails a SemanticReleaseError is thrown. 
 * It's not the case if the pull request couldn't be created since it can be done manually after semantic-release process without impact.
 * 
 * @param context with logger, released branch, current directory and environment.
 * @param config the semantic-release-requests plugin configuration.
 * 
 * @throws an error in case the branch with release assets couldn't be created.
 */
export const processRequest = async (context: Context, config: RequestsConfig) => {
    if (config.assets.length === 0) {
        return // don't do anything if no assets to commit is present
    }
    const releaseBranch = context.branch.name

    const url = parse(config.repositoryUrl)
    const authRemote = authModificator(url, config.platform, config.token)

    const changesBranch = `release/${releaseBranch}/${context.nextRelease.version}`
    try {
        checkout(changesBranch, context.cwd, context.env) // checkout a new branch with release assets
        add(config.assets, context.cwd, context.env) // add assets globs to staged changes

        const templateData = {
            branch: releaseBranch,
            lastRelease: context.lastRelease,
            nextRelease: context.nextRelease,
        }
        commit(template(config.commit)(templateData), context.cwd, context.env) // commit assets globs

        if (config.dryRun) {
            context.logger.log(`Running with --dry-run, push to '${changesBranch}' will not update remote state.`)
        }
        push(authRemote, changesBranch, config.dryRun, context.cwd, context.env) // push assets globs to changes branch

        checkout(releaseBranch, context.cwd, context.env) // checkout back the release branch for next plugins (in case of)
    } catch(error) {
        throw new SemanticReleaseError(`Failed to add release assets to ${changesBranch} branch. Not proceeded with release.`, "EPUSHASSETS", String(error))
    }

    try {
        const templateData = {
            from: changesBranch,
            lastRelease: context.lastRelease,
            nextRelease: context.nextRelease,
            to: releaseBranch,
        }

        const title = template(config.title)(templateData)
        const body: Metadata = {
            body: context.nextRelease.notes ?? "",
            from: changesBranch,
            name: url.name,
            owner: url.owner,
            title,
            to: releaseBranch,
        }
        await createPR(config.baseUrl + config.apiPathPrefix, config.platform, config.token, body)
    } catch (error) {
        context.logger.error(`Failed to create pull request from '${changesBranch}' to '${releaseBranch}'.`, error)
        return // don't throw an error since changes branches was created successfully, only the pull request wasn't
    }
}

/**
 * getBranches returns the slice of branches where a pull request must be created between the current release branch and those.
 * 
 * @param context with logger, released branch, current directory and environment.
 * @param config the semantic-release-requests plugin configuration.
 * 
 * @throws an error in case the input remote can't be fetched or the branches can be retrieved with git.
 * 
 * @returns the slice of branches where the context.branch.name must have a pull request created to.
 */
export const getBranches = (context: Context, config: RequestsConfig) => {
    const releaseBranch = context.branch.name

    const appropriates = config.candidates.filter(branch => releaseBranch.match(branch.from))
    if (appropriates.length === 0) {
        context.logger.log(`Current branch '${releaseBranch}' doesn't match any configured candidates.`)
        return []
    }
    context.logger.log(`Current branch '${releaseBranch}' matches following configured candidates: '${JSON.stringify(appropriates)}'. Performing pull requests creation.`)

    // ensure at any time that all existing remote branches are known locally
    fetch(config.repositoryUrl, context.cwd, context.env)

    const branches = ls(config.repositoryUrl, context.cwd, context.env).
        // don't keep the released branch
        filter(branch => releaseBranch !== branch).
        // don't keep branches that doesn't match 'to' regexp
        filter(branch => appropriates.map(target => target.to).find(target => branch.match(target)))
    if (branches.length === 0) {
        context.logger.log("No configured candidates is present in remote origin, no pull request to create.")
        return []
    }
    context.logger.log(`Retrieved following branches present in remote origin: '${JSON.stringify(branches)}'`)
    return branches
}

/**
 * createRequests creates multiple pull requests, one for each branch provided in input branches slice. 
 * The target branch of each pull request is the released branch from semantic-release process.
 * 
 * @param context with logger, released branch, current directory and environment.
 * @param config the semantic-release-requests plugin configuration.
 * @param branches slice of branches to create pull request to released branch.
 * 
 * @throws AggregateError of SemanticReleaseError(s) for each pull request that couldn't be created.
 */
export const createRequests = async (context: Context, config: RequestsConfig, branches: string[]) => {
    const releaseBranch = context.branch.name
    const url = parse(config.repositoryUrl)

    const errors: SemanticReleaseError[] = []
    for (const branch of branches) { // keep await in loop since git actions aren't thread safe
        const templateData = {
            from: releaseBranch,
            lastRelease: context.lastRelease,
            nextRelease: context.nextRelease,
            to: branch,
        }

        if (config.dryRun) {
            context.logger.log(`Running with --dry-run, created pull request would have been from '${releaseBranch}' into '${branch}'.`)
            continue
        }

        try {
            const title = template(config.title)(templateData)
            const body: Metadata = {
                body: context.nextRelease.notes ?? "",
                from: releaseBranch,
                name: url.name,
                owner: url.owner,
                title,
                to: branch,
            }
            await createPR(config.baseUrl + config.apiPathPrefix, config.platform, config.token, body) // FIXME check existing PR
        } catch (prError) {
            errors.push(new SemanticReleaseError(`Failed to create pull request from '${releaseBranch}' to '${branch}'.`, "EPULLREQUEST", String(prError)))
        }
    }
    if (errors.length > 0) {
        throw new AggregateError(errors)
    }
}
