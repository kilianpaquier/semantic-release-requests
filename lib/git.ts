import { execaSync } from "execa"

/**
 * ls returns the slice of all branches present in remote origin. 
 * It removes 'refs/heads/' from the branches name.
 * 
 * @returns the slice of branches.
 * 
 * @throws an error is the git ls-remote cannot be done.
 */
export const ls = (remote: string, cwd?: string, env?: Record<string, string>) => {
    const { stdout } = execaSync("git", ["ls-remote", "--heads", remote], { cwd, env })
    const branches = stdout.
        split("\n").
        map(branch => branch.split("\t")).
        flat().
        filter(branch => branch.startsWith("refs/heads/")).
        map(branch => branch.replace("refs/heads/", ""))
    return [...new Set(branches)]
}

/**
 * checkout executes a simple checkout of input branch.
 * 
 * @param branch the input branch to checkout.
 * 
 * @throws an error if the checkout cannot be done.
 */
export const checkout = (branch: string, cwd?: string, env?: Record<string, string>) => {
    execaSync("git", ["checkout", "-b", branch], { cwd, env })
}

/**
 * fetch executes a simple fetch of input remote.
 * 
 * @param remote the remote to fetch branches from.
 * 
 * @throws an error if the fetch cannot be done.
 */
export const fetch = (remote: string, cwd?: string, env?: Record<string, string>) => {
    execaSync("git", ["fetch", remote], { cwd, env })
}

/**
 * 
 * @param assets 
 * @param cwd 
 * @param env 
 * 
 * @see https://github.com/semantic-release/git/blob/28a17512def11a1dfbb21836c6061e7179dc0dc2/lib/git.js#L24
 */
export const add = (assets: string[], cwd?: string, env?: Record<string, string>) => {
    execaSync("git", ["add", "--force", "--ignore-errors", ...assets], { cwd, env })
}

export const commit = (message: string, cwd?: string, env?: Record<string, string>) => {
    execaSync("git", ["commit", "-m", message], { cwd, env })
}

/**
 * push executes a simple git push to the input remote with the current checked out branch.
 * 
 * @param remote the remote to push changes to.
 * @param dryRun if the push must only verify if all conditions are fine and not alter the remote state.
 * 
 * @throws an error if the push cannot be executed.
 */
export const push = (remote: string, branch: string, dryRun?: boolean, cwd?: string, env?: Record<string, string>) => {
    const args = ["push", remote, `HEAD:${branch}`]
    if (dryRun) {
        args.push("--dry-run")
    }
    execaSync("git", args, { cwd, env })
}
